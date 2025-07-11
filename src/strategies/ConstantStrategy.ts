import type { ConstantParameter, CalculationContext } from "../types/parameter";
import type { CalculationResult } from "../types/financial";
import { NewCalculationStrategy } from "./base/NewCalculationStrategy";

export class ConstantStrategy extends NewCalculationStrategy {
  readonly type = "constant" as const;

  calculate(
    accountId: string,
    parameter: ConstantParameter,
    context: CalculationContext
  ): CalculationResult {
    return this.createResult(
      accountId,
      context.currentPeriodId,
      parameter.value,
      `定数: ${parameter.value}`,
      []
    );
  }
}