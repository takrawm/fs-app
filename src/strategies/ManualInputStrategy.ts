import type { Parameter } from "../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../types/calculationTypes";
import { NewCalculationStrategy } from "./base/NewCalculationStrategy";

export class ManualInputStrategy extends NewCalculationStrategy {
  readonly type = "MANUAL_INPUT" as const;

  calculate(
    accountId: string,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult {
    // 型ガード
    if (parameter.paramType !== "MANUAL_INPUT") {
      throw new Error(`Invalid parameter type: ${parameter.paramType}`);
    }

    // 手動入力値がコンテキストに存在するかチェック
    const manualValue = context.accountValues.get(accountId);

    // 手動入力値がない場合はデフォルト値を使用
    const value =
      manualValue !== undefined ? manualValue : parameter.paramValue || 0;

    return this.createResult(
      accountId,
      context.periodId,
      value,
      manualValue !== undefined
        ? "手動入力"
        : `デフォルト値: ${parameter.paramValue || 0}`,
      []
    );
  }
}
