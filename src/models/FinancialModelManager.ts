import type {
  Account,
  SheetType,
  Parameter,
} from "../types/accountTypes";
import {
  isFormulaParameter,
  isPercentageParameter,
  isDaysParameter,
} from "../types/accountTypes";
import type { Period } from "../types/periodTypes";
import type {
  CalculationContext,
  CalculationResult,
  CalculationError,
} from "../types/calculationTypes";
import type { FinancialValue as FinancialValueType } from "../types/financialValueTypes";
import type { AccountRelation } from "../types/relationTypes";
import type { EvaluationContext } from "../types/astTypes";
import { AccountModel } from "./Account";
import { FinancialValue } from "./FinancialValue";
import { NewStrategyFactory } from "../factories/NewStrategyFactory";
import { NewFormulaStrategy } from "../strategies/NewFormulaStrategy";
import { ASTBuilder } from "../ast/ASTBuilder";
import { ASTEvaluator } from "../ast/ASTEvaluator";
import { CF_IMPACT_TYPES, SHEET_TYPES, PARAMETER_TYPES } from "../types/accountTypes";

export class FinancialModelManager {
  private accounts: Map<string, AccountModel>;
  private periods: Map<string, Period>;
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

  // シードデータから財務数値を読み込む
  loadFinancialValues(financialValues: FinancialValueType[]): void {
    financialValues.forEach((fv) => {
      const financialValue = new FinancialValue(
        fv.accountId,
        fv.periodId,
        fv.value,
        fv.isCalculated
      );
      this.values.set(financialValue.getKey(), financialValue);
    });
  }

  addAccount(
    account: Partial<Account> & { accountName: string; sheet: SheetType }
  ): AccountModel {
    const newAccount = new AccountModel(account);
    this.accounts.set(newAccount.id, newAccount);

    // CF科目でない場合のみCF科目生成をチェック
    if (newAccount.sheet !== SHEET_TYPES.CF) {
      const cfItem = newAccount.generateCFItem();
      if (cfItem && cfItem.accountName && cfItem.sheet) {
        // 同じ名前のCF科目が既に存在するかチェック
        const existingCF = Array.from(this.accounts.values()).find(
          (acc) =>
            acc.sheet === SHEET_TYPES.CF &&
            acc.accountName === cfItem.accountName
        );

        if (!existingCF) {
          const cfAccount = new AccountModel({
            ...cfItem,
            accountName: cfItem.accountName,
            sheet: cfItem.sheet,
          } as Account);
          this.accounts.set(cfAccount.id, cfAccount);

          this.addRelation({
            fromAccountId: newAccount.id,
            toAccountId: cfAccount.id,
            relationType: "cf-mapping" as const,
          });
        }
      }
    }

    if (account.parentId) {
      this.addRelation({
        fromAccountId: account.parentId,
        toAccountId: newAccount.id,
        relationType: "parent-child" as const,
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
    childRelations.forEach((relation) => {
      this.deleteAccount(relation.toAccountId);
    });

    const cfRelations = this.getRelations(id, "cf-mapping");
    cfRelations.forEach((relation) => {
      this.accounts.delete(relation.toAccountId);
    });

    const paramKeys = Array.from(this.parameters.keys());
    paramKeys.forEach((key) => {
      if (key.startsWith(`${id}_`)) {
        this.parameters.delete(key);
      }
    });

    const valueKeys = Array.from(this.values.keys());
    valueKeys.forEach((key) => {
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

  addPeriod(period: Period): void {
    this.periods.set(period.id, period);
  }

  getPeriod(id: string): Period | undefined {
    return this.periods.get(id);
  }

  getAllPeriods(): Period[] {
    return Array.from(this.periods.values()).sort(
      (a, b) => a.sequence - b.sequence
    );
  }

  setParameter(
    accountId: string,
    periodId: string,
    parameter: Parameter
  ): void {
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
      accountId: "", // 計算対象のアカウントIDは後で設定
      accountValues: new Map(),
      previousValues: new Map(),
    };

    // 現在の期間の値を設定
    this.accounts.forEach((account) => {
      const value = this.getValue(account.id, periodId);
      if (value) {
        context.accountValues.set(account.id, value.value);
      }
    });

    // 前期の値を設定
    if (previousPeriod) {
      this.accounts.forEach((account) => {
        const value = this.getValue(account.id, previousPeriod.id);
        if (value) {
          context.previousValues.set(account.id, value.value);
        }
      });
    }

    const sortedAccounts = this.topologicalSort();

    sortedAccounts.forEach((account) => {
      try {
        const result = this.calculateAccount(account, periodId, context);
        if (result) {
          results.set(account.id, result);
          context.accountValues.set(account.id, result.value);

          const financialValue = new FinancialValue(
            account.id,
            periodId,
            result.value,
            true // 計算された値なのでisCalculated = true
          );
          this.values.set(financialValue.getKey(), financialValue);
        }
      } catch (error) {
        const calculationError: CalculationError = {
          accountId: account.id,
          periodId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        };
        errors.push(calculationError);
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

    const strategy = NewStrategyFactory.getStrategy(parameter);

    // 新しいパラメータ構造での子科目合計の処理
    if (
      parameter.paramType === PARAMETER_TYPES.CHILDREN_SUM &&
      strategy instanceof NewFormulaStrategy
    ) {
      // NewFormulaStrategyでは子科目IDsは計算時に動的に取得
      // const childIds = this.getChildAccountIds(account.id);
    }

    // 新しいパラメータ構造での計算式の処理
    if (isFormulaParameter(parameter) && parameter.paramValue) {
      const astContext: EvaluationContext = {
        variables: new Map(),
        functions: new Map(),
      };

      // 依存関係から変数を設定
      if (parameter.paramReferences) {
        parameter.paramReferences.forEach((depId) => {
          const value = context.accountValues.get(depId) || 0;
          astContext.variables.set(depId, value);
        });
      }

      const evaluator = new ASTEvaluator(astContext);

      try {
        const ast = this.astBuilder.parse(parameter.paramValue);
        const value = evaluator.evaluate(ast);

        return {
          value,
          formula: parameter.paramValue,
          references: evaluator.extractDependencies(ast),
        };
      } catch (error) {
        console.error("AST evaluation error:", error);
      }
    }

    // 新しいパラメータ構造に対応したストラテジー呼び出し
    context.accountId = account.id;
    return strategy.calculate(account.id, parameter, context);
  }

  // CFインパクトに基づいたCF計算メソッド
  calculateCashFlow(periodId: string): Map<string, CalculationResult> {
    const cfResults = new Map<string, CalculationResult>();
    const period = this.periods.get(periodId);
    if (!period) {
      throw new Error(`Period not found: ${periodId}`);
    }

    const accounts = this.getAllAccounts();

    // 基準利益の計算
    const baseProfitAccounts = accounts.filter(
      (acc) =>
        acc.flowAccountCfImpact &&
        acc.flowAccountCfImpact.type === CF_IMPACT_TYPES.IS_BASE_PROFIT
    );

    let baseProfit = 0;
    baseProfitAccounts.forEach((account) => {
      const value = this.getValue(account.id, periodId);
      if (value) {
        baseProfit += value.value;
      }
    });

    // CF調整項目の計算
    const adjustmentAccounts = accounts.filter(
      (acc) =>
        acc.flowAccountCfImpact &&
        acc.flowAccountCfImpact.type === CF_IMPACT_TYPES.ADJUSTMENT
    );

    adjustmentAccounts.forEach((account) => {
      const previousPeriod = this.getPreviousPeriod(period);
      if (!previousPeriod) return;

      const currentValue = this.getValue(account.id, periodId);
      const previousValue = this.getValue(account.id, previousPeriod.id);

      if (currentValue && previousValue) {
        const change = currentValue.value - previousValue.value;
        const cfAdjustment = account.isDebitAccount() ? -change : change;

        cfResults.set(account.id, {
          value: cfAdjustment,
          formula: `${account.accountName}の変動`,
          references: [account.id],
        });
      }
    });

    return cfResults;
  }

  // 新しいパラメータ構造に対応したバリデーション
  validateModel(): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    this.accounts.forEach((account) => {
      // アカウントのバリデーション
      const accountErrors = account.validate();
      errors.push(...accountErrors.map((e) => `Account ${account.id}: ${e}`));

      // パラメータのバリデーション
      this.periods.forEach((period) => {
        const parameter = this.getParameter(account.id, period.id);
        if (!parameter) {
          warnings.push(
            `No parameter set for account ${account.id} in period ${period.id}`
          );
        }
      });
    });

    return { errors, warnings };
  }

  // 財務数値を取得するメソッド（外部からアクセス可能）
  getFinancialValue(
    accountId: string,
    periodId: string
  ): FinancialValue | undefined {
    const key = FinancialValue.createKey(accountId, periodId);
    return this.values.get(key);
  }

  private getValue(
    accountId: string,
    periodId: string
  ): FinancialValue | undefined {
    const key = FinancialValue.createKey(accountId, periodId);
    return this.values.get(key);
  }

  private addRelation(relation: AccountRelation): void {
    const relations = this.relations.get(relation.fromAccountId) || [];
    relations.push(relation);
    this.relations.set(relation.fromAccountId, relations);
  }

  private getRelations(
    accountId: string,
    type: AccountRelation["relationType"]
  ): AccountRelation[] {
    const relations = this.relations.get(accountId) || [];
    return relations.filter((r) => r.relationType === type);
  }

  private getChildAccountIds(parentId: string): string[] {
    const childRelations = this.getRelations(parentId, "parent-child");
    return childRelations.map((r) => r.toAccountId);
  }

  private getPreviousPeriod(period: Period): Period | undefined {
    const periods = this.getAllPeriods();
    const index = periods.findIndex((p) => p.id === period.id);
    return index > 0 ? periods[index - 1] : undefined;
  }

  private topologicalSort(): AccountModel[] {
    const visited = new Set<string>();
    const stack: AccountModel[] = [];
    const visiting = new Set<string>();

    const visit = (accountId: string) => {
      if (visited.has(accountId)) return;
      if (visiting.has(accountId)) {
        throw new Error(
          `Circular dependency detected involving account: ${accountId}`
        );
      }

      visiting.add(accountId);
      const account = this.accounts.get(accountId);
      if (!account) return;

      const dependencies = this.getAccountDependencies(accountId);
      dependencies.forEach((depId) => visit(depId));

      visiting.delete(accountId);
      visited.add(accountId);
      stack.push(account);
    };

    this.accounts.forEach((_, id) => visit(id));
    return stack;
  }

  private getAccountDependencies(accountId: string): string[] {
    const dependencies = new Set<string>();

    this.periods.forEach((period) => {
      const parameter = this.getParameter(accountId, period.id);
      if (!parameter) return;

      // 新しいパラメータ構造での依存関係抽出
      if (isPercentageParameter(parameter) || isDaysParameter(parameter)) {
        if (parameter.paramReferences) {
          dependencies.add(parameter.paramReferences.accountId);
        }
      } else if (isFormulaParameter(parameter)) {
        if (parameter.paramReferences) {
          parameter.paramReferences.forEach((depId) => dependencies.add(depId));
        }
      }
    });

    const childIds = this.getChildAccountIds(accountId);
    childIds.forEach((id) => dependencies.add(id));

    return Array.from(dependencies);
  }
}
