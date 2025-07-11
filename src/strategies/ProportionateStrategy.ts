import { CalculationStrategy } from "./base/CalculationStrategy";
import type { ParameterConfig, CalculationContext } from "../types/parameter";
import type { CalculationResult } from "../types/financial";

export class ProportionateStrategy extends CalculationStrategy {
  readonly type = "他科目連動" as const;

  calculate(
    accountId: string,
    config: ParameterConfig,
    context: CalculationContext
  ): CalculationResult {
    if (config.type !== "他科目連動") {
      throw new Error("Invalid parameter config type");
    }

    const referenceValue = this.getValue(config.referenceId, context);
    const value = referenceValue;

    return this.createResult(
      accountId,
      context.currentPeriodId,
      value,
      `[${config.referenceId}]`,
      [config.referenceId]
    );
  }
}