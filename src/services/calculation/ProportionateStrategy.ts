import type { CalculationStrategy } from "./CalculationStrategy";
import type { CalculationContext } from "../../types/calculationTypes";
import type { Parameter } from "../../types/accountTypes";
import { isProportionateParameter, PARAMETER_TYPES } from "../../types/accountTypes";

/**
 * 連動計算ストラテジー
 * 参照科目の値をそのまま使用（1対1の連動）
 */
export class ProportionateStrategy implements CalculationStrategy {
  name = "Proportionate";

  calculate(
    parameter: Parameter,
    context: CalculationContext,
    accountId: string
  ): number | null {
    if (!isProportionateParameter(parameter)) {
      return null;
    }

    // 参照科目を取得
    const referenceAccountId = parameter.paramReferences?.accountId;
    if (!referenceAccountId) {
      return null;
    }

    // ラグを考慮して参照値を取得
    const lag = parameter.paramReferences.lag || 0;
    let referenceValue: number;

    if (lag === 0) {
      // 同期間の値を取得
      referenceValue = context.getValue(referenceAccountId);
    } else {
      // ラグを考慮した値を取得
      referenceValue = context.getRelativeValue(referenceAccountId, lag);
    }

    // 操作を適用（ADD, SUB, MUL, DIV）
    const operation = parameter.paramReferences.operation;
    let result = referenceValue;

    // 操作がADD/SUBの場合、符号を考慮
    if (operation === "SUB") {
      result = -result;
    }
    // MUL/DIVは連動計算では通常使用されないが、念のため処理
    else if (operation === "MUL") {
      result = result * 1; // そのまま
    } else if (operation === "DIV") {
      result = result !== 0 ? 1 / result : 0;
    }

    return result;
  }

  isApplicable(parameter: Parameter): boolean {
    return parameter.paramType === PARAMETER_TYPES.PROPORTIONATE;
  }

  validate(parameter: Parameter): boolean {
    if (!isProportionateParameter(parameter)) {
      return false;
    }

    // 参照科目が設定されているか確認
    if (!parameter.paramReferences?.accountId) {
      return false;
    }

    // 操作が設定されているか確認
    if (!parameter.paramReferences.operation) {
      return false;
    }

    return true;
  }
}