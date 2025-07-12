// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
import type {
  ConstantParameter,
  CalculationContext,
} from "../types/accountTypes";
import type { CalculationResult } from "../types/financial";
import { NewCalculationStrategy } from "./base/NewCalculationStrategy";

export class ConstantStrategy extends NewCalculationStrategy {
  readonly type = "constant" as const;

  calculate(
    accountId: string,
    parameter: ConstantParameter,
    context: CalculationContext
  ): CalculationResult {
    return this.createResult(
      accountId,
      context.currentPeriodId,
      parameter.value,
      `定数: ${parameter.value}`,
      []
    );
  }
}
