import type { ParameterConfig, CalculationContext } from "../../types/parameter";
import type { CalculationResult } from "../../types/financial";

export abstract class CalculationStrategy {
  abstract readonly type: ParameterConfig["type"];

  abstract calculate(
    accountId: string,
    config: ParameterConfig,
    context: CalculationContext
  ): CalculationResult;

  protected createResult(
    accountId: string,
    periodId: string,
    value: number,
    formula?: string,
    dependencies: string[] = []
  ): CalculationResult {
    return {
      accountId,
      periodId,
      value,
      formula,
      dependencies,
      calculatedAt: new Date(),
    };
  }

  protected getValue(accountId: string, context: CalculationContext): number {
    return context.accounts.get(accountId) || 0;
  }

  protected getPreviousValue(accountId: string, context: CalculationContext): number {
    if (!context.previousPeriodId) return 0;
    return context.accounts.get(`${accountId}_${context.previousPeriodId}`) || 0;
  }
}