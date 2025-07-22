import type { CalculationStrategy } from "../../types/calculationTypes";
import type { CalculationContext } from "../../types/calculationTypes";
import type { Parameter } from "../../types/accountTypes";
import {
  isPercentageParameter,
  PARAMETER_TYPES,
} from "../../types/accountTypes";

/**
 * 比率計算ストラテジー
 * 基準科目の値に比率を適用して計算
 */
export class PercentageStrategy implements CalculationStrategy {
  name = "Percentage";

  calculate(
    parameter: Parameter,
    context: CalculationContext,
    accountId: string
  ): number | null {
    if (!isPercentageParameter(parameter)) {
      return null;
    }

    // 参照科目と比率を取得
    const referenceAccountId = parameter.paramReferences?.accountId;
    const percentage = parameter.paramValue;

    if (
      !referenceAccountId ||
      percentage === null ||
      percentage === undefined
    ) {
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

    // 比率を適用
    const result = referenceValue * percentage;

    return result;
  }

  isApplicable(parameter: Parameter): boolean {
    return parameter.paramType === PARAMETER_TYPES.PERCENTAGE;
  }

  validate(parameter: Parameter): boolean {
    if (!isPercentageParameter(parameter)) {
      return false;
    }

    // 比率が設定されているか確認
    if (parameter.paramValue === null || parameter.paramValue === undefined) {
      return false;
    }

    // 参照科目が設定されているか確認
    if (!parameter.paramReferences?.accountId) {
      return false;
    }

    // 比率が妥当な範囲内か確認（-1000%～1000%）
    if (parameter.paramValue < -10 || parameter.paramValue > 10) {
      return false;
    }

    return true;
  }
}
