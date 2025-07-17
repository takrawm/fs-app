import { NewCalculationStrategy } from "./base/NewCalculationStrategy";
import type { Parameter } from "../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../types/calculationTypes";

export class SubtotalStrategy extends NewCalculationStrategy {
  readonly type = "CHILDREN_SUM" as const;

  private childAccountIds: string[] = [];

  setChildAccountIds(ids: string[]): void {
    this.childAccountIds = ids;
  }

  calculate(
    accountId: string,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult {
    if (parameter.paramType !== "CHILDREN_SUM") {
      throw new Error("Invalid parameter type");
    }

    let total = 0;
    const dependencies: string[] = [];

    for (const childId of this.childAccountIds) {
      const childValue = this.getValue(childId, context);
      total += childValue;
      dependencies.push(childId);
    }

    return this.createResult(
      accountId,
      context.periodId,
      total,
      `Σ(子科目)`,
      dependencies
    );
  }
}
