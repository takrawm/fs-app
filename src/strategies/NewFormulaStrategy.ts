import type { Parameter } from "../types/accountTypes";
import {
  isCalculationParameter,
  isFormulaParameter,
} from "../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../types/calculationTypes";
import { NewCalculationStrategy } from "./base/NewCalculationStrategy";
import { ASTBuilder } from "../ast/ASTBuilder";
import { ASTEvaluator } from "../ast/ASTEvaluator";
// ASTの評価コンテキスト型定義
interface EvaluationContext {
  variables: Map<string, number>;
  functions: Map<string, Function>;
}

export class NewFormulaStrategy extends NewCalculationStrategy {
  readonly type = "FORMULA" as const;
  private astBuilder: ASTBuilder;

  constructor() {
    super();
    this.astBuilder = new ASTBuilder();
  }

  calculate(
    accountId: string,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult {
    try {
      // AST評価コンテキストを作成
      const astContext: EvaluationContext = {
        variables: new Map(),
        functions: new Map(),
      };

      if (parameter.paramType !== "FORMULA") {
        throw new Error("Invalid parameter type");
      }

      // 依存関係から変数を設定
      if (Array.isArray(parameter.paramReferences)) {
        parameter.paramReferences.forEach((depId) => {
          const value = this.getValue(depId, context);
          astContext.variables.set(depId, value);
        });
      }

      // 特殊な計算式の処理
      if (parameter.paramValue === "SUM(children)") {
        return this.calculateChildrenSum(accountId, context);
      }

      // 一般的な計算式の処理
      const evaluator = new ASTEvaluator(astContext);
      const ast = this.astBuilder.parse(parameter.paramValue);
      const value = evaluator.evaluate(ast);

      const references =
        isFormulaParameter(parameter) && parameter.paramReferences
          ? parameter.paramReferences
          : [];

      return this.createResult(
        accountId,
        context.periodId,
        value,
        parameter.paramValue,
        references
      );
    } catch (error) {
      console.error("Formula calculation error:", error);
      const errorReferences =
        isFormulaParameter(parameter) && parameter.paramReferences
          ? parameter.paramReferences
          : [];

      return this.createResult(
        accountId,
        context.periodId,
        0,
        `エラー: ${parameter.paramValue}`,
        errorReferences
      );
    }
  }

  private calculateChildrenSum(
    accountId: string,
    context: CalculationContext
  ): CalculationResult {
    // 子アカウントの合計を計算
    // 実際の実装では、アカウント階層情報が必要
    // ここでは簡単な例として、accountIdに基づいて子アカウントを探す
    let sum = 0;
    const childAccountIds: string[] = [];

    for (const [id, value] of context.accountValues) {
      if (id.startsWith(`${accountId}-child-`)) {
        sum += value;
        childAccountIds.push(id);
      }
    }

    return this.createResult(
      accountId,
      context.periodId,
      sum,
      "SUM(children)",
      childAccountIds
    );
  }
}
