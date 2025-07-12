// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
import { CalculationStrategy } from "./base/CalculationStrategy";
import type {
  ParameterConfig,
  CalculationContext,
} from "../types/accountTypes";
import type { CalculationResult } from "../types/financial";

export class GrowthRateStrategy extends CalculationStrategy {
  readonly type = "成長率" as const;

  calculate(
    accountId: string,
    config: ParameterConfig,
    context: CalculationContext
  ): CalculationResult {
    if (config.type !== "成長率") {
      throw new Error("Invalid parameter config type");
    }

    const previousValue = this.getPreviousValue(accountId, context);
    const value = previousValue * (1 + config.value / 100);

    return this.createResult(
      accountId,
      context.currentPeriodId,
      value,
      `前期 × (1 + ${config.value}%)`,
      []
    );
  }
}
