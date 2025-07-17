import { NewCalculationStrategy } from "./base/NewCalculationStrategy";
import type { Parameter } from "../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../types/calculationTypes";

export class PercentageStrategy extends NewCalculationStrategy {
  readonly type = "PERCENTAGE" as const;

  calculate(
    accountId: string,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult {
    if (parameter.paramType !== "PERCENTAGE") {
      throw new Error("Invalid parameter type");
    }

    const referenceValue = this.getValue(parameter.paramReferences.accountId, context);
    const value = referenceValue * parameter.paramValue;

    return this.createResult(
      accountId,
      context.periodId,
      value,
      `[${parameter.paramReferences.accountId}] × ${(parameter.paramValue * 100).toFixed(1)}%`,
      [parameter.paramReferences.accountId]
    );
  }
}
