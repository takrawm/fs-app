import type { Account, AccountRelation } from "../types/account";
import type { Parameter, CalculationContext } from "../types/parameter";
import type { Period, CalculationResult, CalculationError } from "../types/financial";
import { AccountModel } from "./Account";
import { FinancialValue } from "./FinancialValue";
import { PeriodModel } from "./Period";
import { StrategyFactory } from "../factories/StrategyFactory";
import { SubtotalStrategy } from "../strategies";
import { ASTBuilder } from "../ast/ASTBuilder";
import { ASTEvaluator } from "../ast/ASTEvaluator";
import type { EvaluationContext } from "../types/ast";

export class FinancialModelManager {
  private accounts: Map<string, AccountModel>;
  private periods: Map<string, PeriodModel>;
  private parameters: Map<string, Parameter>;
  private values: Map<string, FinancialValue>;
  private relations: Map<string, AccountRelation[]>;
  private astBuilder: ASTBuilder;

  constructor() {
    this.accounts = new Map();
    this.periods = new Map();
    this.parameters = new Map();
    this.values = new Map();
    this.relations = new Map();
    this.astBuilder = new ASTBuilder();
  }

  addAccount(account: Partial<Account> & { name: string; category: Account["category"] }): AccountModel {
    const newAccount = new AccountModel(account);
    this.accounts.set(newAccount.id, newAccount);

    const cfItem = newAccount.generateCFItem();
    if (cfItem && cfItem.name) {
      const cfAccount = new AccountModel({
        ...cfItem,
        name: cfItem.name,
        category: "費用",
      });
      this.accounts.set(cfAccount.id, cfAccount);
      
      this.addRelation({
        fromAccountId: newAccount.id,
        toAccountId: cfAccount.id,
        relationType: "cf-mapping",
      });
    }

    if (account.parentId) {
      this.addRelation({
        fromAccountId: account.parentId,
        toAccountId: newAccount.id,
        relationType: "parent-child",
      });
    }

    return newAccount;
  }

  updateAccount(id: string, updates: Partial<Account>): void {
    const account = this.accounts.get(id);
    if (!account) throw new Error(`Account not found: ${id}`);
    
    account.update(updates);
  }

  deleteAccount(id: string): void {
    const account = this.accounts.get(id);
    if (!account) return;

    const childRelations = this.getRelations(id, "parent-child");
    childRelations.forEach(relation => {
      this.deleteAccount(relation.toAccountId);
    });

    const cfRelations = this.getRelations(id, "cf-mapping");
    cfRelations.forEach(relation => {
      this.accounts.delete(relation.toAccountId);
    });

    const paramKeys = Array.from(this.parameters.keys());
    paramKeys.forEach(key => {
      const param = this.parameters.get(key);
      if (param && param.accountId === id) {
        this.parameters.delete(key);
      }
    });

    const valueKeys = Array.from(this.values.keys());
    valueKeys.forEach(key => {
      const value = this.values.get(key);
      if (value && value.accountId === id) {
        this.values.delete(key);
      }
    });

    this.accounts.delete(id);
    this.relations.delete(id);
  }

  getAccount(id: string): AccountModel | undefined {
    return this.accounts.get(id);
  }

  getAllAccounts(): AccountModel[] {
    return Array.from(this.accounts.values());
  }

  addPeriod(period: Partial<Period> & { name: string; startDate: Date; endDate: Date; order: number }): PeriodModel {
    const newPeriod = new PeriodModel(period);
    this.periods.set(newPeriod.id, newPeriod);
    return newPeriod;
  }

  getPeriod(id: string): PeriodModel | undefined {
    return this.periods.get(id);
  }

  getAllPeriods(): PeriodModel[] {
    return Array.from(this.periods.values()).sort((a, b) => a.order - b.order);
  }

  setParameter(accountId: string, periodId: string, parameter: Parameter): void {
    const key = `${accountId}_${periodId}`;
    this.parameters.set(key, parameter);
  }

  getParameter(accountId: string, periodId: string): Parameter | undefined {
    const key = `${accountId}_${periodId}`;
    return this.parameters.get(key);
  }

  calculatePeriod(periodId: string): Map<string, CalculationResult> {
    const results = new Map<string, CalculationResult>();
    const errors: CalculationError[] = [];
    const period = this.periods.get(periodId);
    
    if (!period) {
      throw new Error(`Period not found: ${periodId}`);
    }

    const previousPeriod = this.getPreviousPeriod(period);
    const context: CalculationContext = {
      currentPeriodId: periodId,
      previousPeriodId: previousPeriod?.id,
      accounts: new Map(),
      parameters: this.parameters,
    };

    this.accounts.forEach(account => {
      const value = this.getValue(account.id, periodId);
      if (value) {
        context.accounts.set(account.id, value.value);
      }
    });

    const sortedAccounts = this.topologicalSort();

    sortedAccounts.forEach(account => {
      try {
        const result = this.calculateAccount(account, periodId, context);
        if (result) {
          results.set(account.id, result);
          context.accounts.set(account.id, result.value);
          
          const financialValue = new FinancialValue(account.id, periodId, result.value);
          this.values.set(financialValue.getKey(), financialValue);
        }
      } catch (error) {
        errors.push({
          accountId: account.id,
          periodId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    });

    if (errors.length > 0) {
      console.error("Calculation errors:", errors);
    }

    return results;
  }

  private calculateAccount(
    account: AccountModel,
    periodId: string,
    context: CalculationContext
  ): CalculationResult | null {
    const parameter = this.getParameter(account.id, periodId);
    if (!parameter) return null;

    const strategy = StrategyFactory.getStrategy(parameter.config);

    if (parameter.config.type === "子科目合計" && strategy instanceof SubtotalStrategy) {
      const childIds = this.getChildAccountIds(account.id);
      strategy.setChildAccountIds(childIds);
    }

    if (parameter.config.type === "計算" && parameter.config.references.length > 0) {
      const astContext: EvaluationContext = {
        variables: new Map(),
        functions: new Map(),
      };

      parameter.config.references.forEach(ref => {
        const value = context.accounts.get(ref.id) || 0;
        astContext.variables.set(ref.id, value);
      });

      const evaluator = new ASTEvaluator(astContext);
      
      try {
        const formula = this.buildFormulaFromReferences(parameter.config.references);
        const ast = this.astBuilder.parse(formula);
        const value = evaluator.evaluate(ast);
        
        return {
          accountId: account.id,
          periodId,
          value,
          formula,
          dependencies: evaluator.extractDependencies(ast),
          calculatedAt: new Date(),
        };
      } catch (error) {
        console.error("AST evaluation error:", error);
      }
    }

    return strategy.calculate(account.id, parameter.config, context);
  }

  private buildFormulaFromReferences(references: Array<{id: string; operation: string}>): string {
    return references
      .map((ref, index) => {
        if (index === 0) return `[${ref.id}]`;
        return `${ref.operation} [${ref.id}]`;
      })
      .join(" ");
  }

  private getValue(accountId: string, periodId: string): FinancialValue | undefined {
    const key = FinancialValue.createKey(accountId, periodId);
    return this.values.get(key);
  }

  private addRelation(relation: AccountRelation): void {
    const relations = this.relations.get(relation.fromAccountId) || [];
    relations.push(relation);
    this.relations.set(relation.fromAccountId, relations);
  }

  private getRelations(accountId: string, type: AccountRelation["relationType"]): AccountRelation[] {
    const relations = this.relations.get(accountId) || [];
    return relations.filter(r => r.relationType === type);
  }

  private getChildAccountIds(parentId: string): string[] {
    const childRelations = this.getRelations(parentId, "parent-child");
    return childRelations.map(r => r.toAccountId);
  }

  private getPreviousPeriod(period: PeriodModel): PeriodModel | undefined {
    const periods = this.getAllPeriods();
    const index = periods.findIndex(p => p.id === period.id);
    return index > 0 ? periods[index - 1] : undefined;
  }

  private topologicalSort(): AccountModel[] {
    const visited = new Set<string>();
    const stack: AccountModel[] = [];
    const visiting = new Set<string>();

    const visit = (accountId: string) => {
      if (visited.has(accountId)) return;
      if (visiting.has(accountId)) {
        throw new Error(`Circular dependency detected involving account: ${accountId}`);
      }

      visiting.add(accountId);
      const account = this.accounts.get(accountId);
      if (!account) return;

      const dependencies = this.getAccountDependencies(accountId);
      dependencies.forEach(depId => visit(depId));

      visiting.delete(accountId);
      visited.add(accountId);
      stack.push(account);
    };

    this.accounts.forEach((_, id) => visit(id));
    return stack;
  }

  private getAccountDependencies(accountId: string): string[] {
    const dependencies = new Set<string>();
    
    this.periods.forEach(period => {
      const parameter = this.getParameter(accountId, period.id);
      if (!parameter) return;

      const config = parameter.config;
      if (config.type === "比率" || config.type === "他科目連動" || config.type === "参照") {
        dependencies.add(config.referenceId);
      } else if (config.type === "計算") {
        config.references.forEach(ref => dependencies.add(ref.id));
      }
    });

    const childIds = this.getChildAccountIds(accountId);
    childIds.forEach(id => dependencies.add(id));

    return Array.from(dependencies);
  }
}