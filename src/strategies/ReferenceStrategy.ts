import { CalculationStrategy } from "./base/CalculationStrategy";
import type { ParameterConfig, CalculationContext } from "../types/parameter";
import type { CalculationResult } from "../types/financial";

export class ReferenceStrategy extends CalculationStrategy {
  readonly type = "参照" as const;

  calculate(
    accountId: string,
    config: ParameterConfig,
    context: CalculationContext
  ): CalculationResult {
    if (config.type !== "参照") {
      throw new Error("Invalid parameter config type");
    }

    const value = this.getValue(config.referenceId, context);

    return this.createResult(
      accountId,
      context.currentPeriodId,
      value,
      `=[${config.referenceId}]`,
      [config.referenceId]
    );
  }
}