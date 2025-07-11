import { CalculationStrategy } from "./base/CalculationStrategy";
import type { ParameterConfig, CalculationContext } from "../types/parameter";
import type { CalculationResult } from "../types/financial";

export class PercentageStrategy extends CalculationStrategy {
  readonly type = "比率" as const;

  calculate(
    accountId: string,
    config: ParameterConfig,
    context: CalculationContext
  ): CalculationResult {
    if (config.type !== "比率") {
      throw new Error("Invalid parameter config type");
    }

    const referenceValue = this.getValue(config.referenceId, context);
    const value = referenceValue * (config.value / 100);

    return this.createResult(
      accountId,
      context.currentPeriodId,
      value,
      `[${config.referenceId}] × ${config.value}%`,
      [config.referenceId]
    );
  }
}