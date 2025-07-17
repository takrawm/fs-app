import { NewCalculationStrategy } from "./base/NewCalculationStrategy";
import type { Parameter } from "../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../types/calculationTypes";

export class ReferenceStrategy extends NewCalculationStrategy {
  readonly type = "CALCULATION" as const;

  calculate(
    accountId: string,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult {
    if (parameter.paramType !== "CALCULATION") {
      throw new Error("Invalid parameter type");
    }

    // CALCULATIONタイプの単純な参照の場合
    if (parameter.paramReferences.length === 1 && parameter.paramReferences[0].operation === "ADD") {
      const value = this.getValue(parameter.paramReferences[0].accountId, context);

    return this.createResult(
      accountId,
      context.periodId,
      value,
      `=[${parameter.paramReferences[0].accountId}]`,
      [parameter.paramReferences[0].accountId]
    );
    }
    
    // 複数参照の場合はエラー
    throw new Error("複数参照のCALCULATIONパラメータはサポートされていません");
  }
}
