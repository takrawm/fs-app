import { NewCalculationStrategy } from "./base/NewCalculationStrategy";
import type { Parameter } from "../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../types/calculationTypes";

export class ProportionateStrategy extends NewCalculationStrategy {
  readonly type = "PROPORTIONATE" as const;

  calculate(
    accountId: string,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult {
    if (parameter.paramType !== "PROPORTIONATE") {
      throw new Error("Invalid parameter type");
    }

    const referenceValue = this.getValue(parameter.paramReferences.accountId, context);
    const value = referenceValue;

    return this.createResult(
      accountId,
      context.periodId,
      value,
      `[${parameter.paramReferences.accountId}]`,
      [parameter.paramReferences.accountId]
    );
  }
}
