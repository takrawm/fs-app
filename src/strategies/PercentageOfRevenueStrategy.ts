import type { Parameter } from "../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../types/calculationTypes";
import { NewCalculationStrategy } from "./base/NewCalculationStrategy";

export class PercentageOfRevenueStrategy extends NewCalculationStrategy {
  readonly type = "PERCENTAGE_OF_REVENUE" as const;

  calculate(
    accountId: string,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult {
    // 売上高アカウントを探す（通常は最初の売上項目を使用）
    const revenueAccountId = this.findRevenueAccount(context);
    if (!revenueAccountId) {
      throw new Error("売上高アカウントが見つかりません");
    }

    if (parameter.paramType !== "PERCENTAGE_OF_REVENUE") {
      throw new Error("Invalid parameter type");
    }
    
    const revenueValue = this.getValue(revenueAccountId, context);
    const value = this.calculatePercentage(revenueValue, parameter.paramValue * 100);

    return this.createResult(
      accountId,
      context.periodId,
      value,
      `売上高 * ${(parameter.paramValue * 100).toFixed(1)}%`,
      [revenueAccountId]
    );
  }

  private findRevenueAccount(context: CalculationContext): string | null {
    // 売上高アカウントを見つけるロジック
    // 実際の実装では、アカウント名やIDパターンで判定
    for (const [accountId] of context.accountValues) {
      if (accountId.includes("revenue") || accountId.includes("sales")) {
        return accountId;
      }
    }
    return null;
  }
}
