import type { CalculationStrategy } from "../../types/calculationTypes";
import type { CalculationContext } from "../../types/calculationTypes";
import type { Parameter } from "../../types/accountTypes";
import {
  isGrowthRateParameter,
  PARAMETER_TYPES,
} from "../../types/accountTypes";

/**
 * 成長率計算ストラテジー
 * 前期値に成長率を適用して当期値を計算
 */
export class GrowthRateStrategy implements CalculationStrategy {
  name = "GrowthRate";

  calculate(
    parameter: Parameter,
    context: CalculationContext,
    accountId: string
  ): number | null {
    if (!isGrowthRateParameter(parameter)) {
      return null;
    }

    // 初期期間の場合
    if (!context.previousPeriodId) {
      return 0;
    }

    // 前期値を取得
    const previousValue = context.getPreviousValue(accountId);

    // 成長率を適用（1 + 成長率）
    const growthRate = parameter.paramValue || 0;
    const result = previousValue * (1 + growthRate);

    return result;
  }

  isApplicable(parameter: Parameter): boolean {
    return parameter.paramType === PARAMETER_TYPES.GROWTH_RATE;
  }

  validate(parameter: Parameter): boolean {
    if (!isGrowthRateParameter(parameter)) {
      return false;
    }

    // 成長率が設定されているか確認
    if (parameter.paramValue === null || parameter.paramValue === undefined) {
      return false;
    }

    // 成長率が妥当な範囲内か確認（-100%～1000%）
    if (parameter.paramValue < -1 || parameter.paramValue > 10) {
      return false;
    }

    return true;
  }
}
