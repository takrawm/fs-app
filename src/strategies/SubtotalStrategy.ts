import { CalculationStrategy } from "./base/CalculationStrategy";
import type { ParameterConfig, CalculationContext } from "../types/parameter";
import type { CalculationResult } from "../types/financial";

export class SubtotalStrategy extends CalculationStrategy {
  readonly type = "子科目合計" as const;

  private childAccountIds: string[] = [];

  setChildAccountIds(ids: string[]): void {
    this.childAccountIds = ids;
  }

  calculate(
    accountId: string,
    config: ParameterConfig,
    context: CalculationContext
  ): CalculationResult {
    if (config.type !== "子科目合計") {
      throw new Error("Invalid parameter config type");
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
      context.currentPeriodId,
      total,
      `Σ(子科目)`,
      dependencies
    );
  }
}