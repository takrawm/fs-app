import type { Parameter } from "../../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../../types/calculationTypes";

export abstract class CalculationStrategy {
  abstract readonly type: Parameter["paramType"];

  abstract calculate(
    accountId: string,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult;

  protected createResult(
    _accountId: string,
    _periodId: string,
    value: number,
    formula?: string,
    references: string[] = []
  ): CalculationResult {
    return {
      value,
      formula: formula || "",
      references,
    };
  }

  protected getValue(accountId: string, context: CalculationContext): number {
    return context.accountValues.get(accountId) || 0;
  }

  protected getPreviousValue(
    accountId: string,
    context: CalculationContext
  ): number {
    return context.previousValues.get(accountId) || 0;
  }
}
