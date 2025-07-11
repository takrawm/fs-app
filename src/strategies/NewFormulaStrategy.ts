import type { FormulaParameter, CalculationContext } from "../types/parameter";
import type { CalculationResult } from "../types/financial";
import { NewCalculationStrategy } from "./base/NewCalculationStrategy";
import { ASTBuilder } from "../ast/ASTBuilder";
import { ASTEvaluator } from "../ast/ASTEvaluator";
import type { EvaluationContext } from "../types/ast";

export class NewFormulaStrategy extends NewCalculationStrategy {
  readonly type = "formula" as const;
  private astBuilder: ASTBuilder;

  constructor() {
    super();
    this.astBuilder = new ASTBuilder();
  }

  calculate(
    accountId: string,
    parameter: FormulaParameter,
    context: CalculationContext
  ): CalculationResult {
    try {
      // AST評価コンテキストを作成
      const astContext: EvaluationContext = {
        variables: new Map(),
        functions: new Map(),
      };

      // 依存関係から変数を設定
      parameter.dependencies.forEach(depId => {
        const value = this.getValue(depId, context);
        astContext.variables.set(depId, value);
      });

      // 特殊な計算式の処理
      if (parameter.formula === "SUM(children)") {
        return this.calculateChildrenSum(accountId, context);
      }

      // 一般的な計算式の処理
      const evaluator = new ASTEvaluator(astContext);
      const ast = this.astBuilder.parse(parameter.formula);
      const value = evaluator.evaluate(ast);

      return this.createResult(
        accountId,
        context.currentPeriodId,
        value,
        parameter.formula,
        parameter.dependencies
      );
    } catch (error) {
      console.error("Formula calculation error:", error);
      return this.createResult(
        accountId,
        context.currentPeriodId,
        0,
        `エラー: ${parameter.formula}`,
        parameter.dependencies
      );
    }
  }

  private calculateChildrenSum(accountId: string, context: CalculationContext): CalculationResult {
    // 子アカウントの合計を計算
    // 実際の実装では、アカウント階層情報が必要
    // ここでは簡単な例として、accountIdに基づいて子アカウントを探す
    let sum = 0;
    const childAccountIds: string[] = [];
    
    for (const [id, value] of context.accounts) {
      if (id.startsWith(`${accountId}-child-`)) {
        sum += value;
        childAccountIds.push(id);
      }
    }

    return this.createResult(
      accountId,
      context.currentPeriodId,
      sum,
      "SUM(children)",
      childAccountIds
    );
  }
}