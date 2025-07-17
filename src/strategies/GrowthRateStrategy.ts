import { NewCalculationStrategy } from "./base/NewCalculationStrategy";
import type { Parameter } from "../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../types/calculationTypes";

export class GrowthRateStrategy extends NewCalculationStrategy {
  readonly type = "GROWTH_RATE" as const;

  calculate(
    accountId: string,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult {
    if (parameter.paramType !== "GROWTH_RATE") {
      throw new Error("Invalid parameter type");
    }

    const previousValue = this.getPreviousValue(accountId, context);
    const value = previousValue * (1 + parameter.paramValue);

    return this.createResult(
      accountId,
      context.periodId,
      value,
      `前期 × (1 + ${(parameter.paramValue * 100).toFixed(1)}%)`,
      []
    );
  }
}
