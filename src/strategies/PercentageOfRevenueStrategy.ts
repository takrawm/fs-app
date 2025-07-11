import type { PercentageOfRevenueParameter, CalculationContext } from "../types/parameter";
import type { CalculationResult } from "../types/financial";
import { NewCalculationStrategy } from "./base/NewCalculationStrategy";

export class PercentageOfRevenueStrategy extends NewCalculationStrategy {
  readonly type = "percentageOfRevenue" as const;

  calculate(
    accountId: string,
    parameter: PercentageOfRevenueParameter,
    context: CalculationContext
  ): CalculationResult {
    // 売上高アカウントを探す（通常は最初の売上項目を使用）
    const revenueAccountId = this.findRevenueAccount(context);
    if (!revenueAccountId) {
      throw new Error("売上高アカウントが見つかりません");
    }
    
    const revenueValue = this.getValue(revenueAccountId, context);
    const value = this.calculatePercentage(revenueValue, parameter.value);
    
    return this.createResult(
      accountId,
      context.currentPeriodId,
      value,
      `売上高 * ${parameter.value}%`,
      [revenueAccountId]
    );
  }

  private findRevenueAccount(context: CalculationContext): string | null {
    // 売上高アカウントを見つけるロジック
    // 実際の実装では、アカウント名やIDパターンで判定
    for (const [accountId] of context.accounts) {
      if (accountId.includes("revenue") || accountId.includes("sales")) {
        return accountId;
      }
    }
    return null;
  }
}