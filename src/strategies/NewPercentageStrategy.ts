// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
import type {
  PercentageParameter,
  CalculationContext,
} from "../types/accountTypes";
import type { CalculationResult } from "../types/financial";
import { NewCalculationStrategy } from "./base/NewCalculationStrategy";

export class NewPercentageStrategy extends NewCalculationStrategy {
  readonly type = "percentage" as const;

  calculate(
    accountId: string,
    parameter: PercentageParameter,
    context: CalculationContext
  ): CalculationResult {
    const baseValue = this.getValue(parameter.baseAccountId, context);
    const value = this.calculatePercentage(baseValue, parameter.value);

    return this.createResult(
      accountId,
      context.currentPeriodId,
      value,
      `[${parameter.baseAccountId}] * ${parameter.value}%`,
      [parameter.baseAccountId]
    );
  }
}
