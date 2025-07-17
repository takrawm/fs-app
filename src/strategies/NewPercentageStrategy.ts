import type { Parameter } from "../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../types/calculationTypes";
import { NewCalculationStrategy } from "./base/NewCalculationStrategy";

export class NewPercentageStrategy extends NewCalculationStrategy {
  readonly type = "PERCENTAGE" as const;

  calculate(
    accountId: string,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult {
    if (parameter.paramType !== "PERCENTAGE") {
      throw new Error("Invalid parameter type");
    }
    
    const baseValue = this.getValue(parameter.paramReferences.accountId, context);
    const value = this.calculatePercentage(baseValue, parameter.paramValue * 100);

    return this.createResult(
      accountId,
      context.periodId,
      value,
      `[${parameter.paramReferences.accountId}] * ${(parameter.paramValue * 100).toFixed(1)}%`,
      [parameter.paramReferences.accountId]
    );
  }
}
