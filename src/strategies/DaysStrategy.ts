import type { DaysParameter, CalculationContext } from "../types/parameter";
import type { CalculationResult } from "../types/financial";
import { NewCalculationStrategy } from "./base/NewCalculationStrategy";

export class DaysStrategy extends NewCalculationStrategy {
  readonly type = "days" as const;

  calculate(
    accountId: string,
    parameter: DaysParameter,
    context: CalculationContext
  ): CalculationResult {
    const baseValue = this.getValue(parameter.baseAccountId, context);
    const value = this.calculateDaysBasedValue(baseValue, parameter.days);
    
    return this.createResult(
      accountId,
      context.currentPeriodId,
      value,
      `[${parameter.baseAccountId}] * ${parameter.days}日 / 30日`,
      [parameter.baseAccountId]
    );
  }
}