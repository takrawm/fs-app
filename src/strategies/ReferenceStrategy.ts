// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
import { CalculationStrategy } from "./base/CalculationStrategy";
import type {
  ParameterConfig,
  CalculationContext,
} from "../types/accountTypes";
import type { CalculationResult } from "../types/financial";

export class ReferenceStrategy extends CalculationStrategy {
  readonly type = "参照" as const;

  calculate(
    accountId: string,
    config: ParameterConfig,
    context: CalculationContext
  ): CalculationResult {
    if (config.type !== "参照") {
      throw new Error("Invalid parameter config type");
    }

    const value = this.getValue(config.referenceId, context);

    return this.createResult(
      accountId,
      context.currentPeriodId,
      value,
      `=[${config.referenceId}]`,
      [config.referenceId]
    );
  }
}
