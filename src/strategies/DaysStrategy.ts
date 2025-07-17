import type { Parameter } from "../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../types/calculationTypes";
import { NewCalculationStrategy } from "./base/NewCalculationStrategy";

export class DaysStrategy extends NewCalculationStrategy {
  readonly type = "DAYS" as const;

  calculate(
    accountId: string,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult {
    if (parameter.paramType !== "DAYS") {
      throw new Error("Invalid parameter type");
    }
    
    const baseValue = this.getValue(parameter.paramReferences.accountId, context);
    const value = this.calculateDaysBasedValue(baseValue, parameter.paramValue);
    
    return this.createResult(
      accountId,
      context.periodId,
      value,
      `[${parameter.paramReferences.accountId}] * ${parameter.paramValue}日 / 30日`,
      [parameter.paramReferences.accountId]
    );
  }
}