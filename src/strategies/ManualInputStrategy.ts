// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
import type {
  ManualInputParameter,
  CalculationContext,
} from "../types/accountTypes";
import type { CalculationResult } from "../types/financial";
import { NewCalculationStrategy } from "./base/NewCalculationStrategy";

export class ManualInputStrategy extends NewCalculationStrategy {
  readonly type = "manualInput" as const;

  calculate(
    accountId: string,
    parameter: ManualInputParameter,
    context: CalculationContext
  ): CalculationResult {
    // 手動入力値がコンテキストに存在するかチェック
    const manualValue = context.accounts.get(accountId);

    // 手動入力値がない場合はデフォルト値を使用
    const value =
      manualValue !== undefined ? manualValue : parameter.defaultValue || 0;

    return this.createResult(
      accountId,
      context.currentPeriodId,
      value,
      manualValue !== undefined
        ? "手動入力"
        : `デフォルト値: ${parameter.defaultValue || 0}`,
      []
    );
  }
}
