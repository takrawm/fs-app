import { PARAMETER_TYPES } from "../types/accountTypes";
import type { Parameter } from "../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../types/calculationTypes";
import { NewCalculationStrategy } from "./base/NewCalculationStrategy";

export class ConstantStrategy extends NewCalculationStrategy {
  readonly type = PARAMETER_TYPES.CONSTANT;

  calculate(
    accountId: string,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult {
    if (parameter.paramType !== PARAMETER_TYPES.CONSTANT) {
      throw new Error(
        `Expected constant parameter, got ${parameter.paramType}`
      );
    }

    return this.createResult(
      accountId,
      context.accountId, // currentPeriodIdの代わりにaccountIdを使用
      parameter.paramValue,
      `定数: ${parameter.paramValue}`,
      []
    );
  }
}
