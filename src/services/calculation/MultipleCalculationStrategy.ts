import type { CalculationStrategy } from "../../types/calculationTypes";
import type { CalculationContext } from "../../types/calculationTypes";
import type { Parameter } from "../../types/accountTypes";
import {
  isCalculationParameter,
  PARAMETER_TYPES,
} from "../../types/accountTypes";

/**
 * 複数科目計算ストラテジー
 * 複数の科目を参照して計算（加減乗除）
 */
export class MultipleCalculationStrategy implements CalculationStrategy {
  name = "Calculation";

  calculate(
    parameter: Parameter,
    context: CalculationContext,
    accountId: string
  ): number | null {
    if (!isCalculationParameter(parameter)) {
      return null;
    }

    // 参照リストを取得
    const references = parameter.paramReferences;
    if (!references || references.length === 0) {
      return null;
    }

    // 初期値は0（加算・減算の場合）
    let result = 0;
    let isFirstMultiplication = true;

    // 各参照を処理
    for (const ref of references) {
      const refAccountId = ref.accountId;
      const operation = ref.operation;
      const lag = ref.lag || 0;

      // ラグを考慮して値を取得
      let value: number;
      if (lag === 0) {
        value = context.getValue(refAccountId);
      } else {
        value = context.getRelativeValue(refAccountId, lag);
      }

      // 操作を適用
      switch (operation) {
        case "ADD":
          result += value;
          break;

        case "SUB":
          result -= value;
          break;

        case "MUL":
          if (isFirstMultiplication) {
            result = value;
            isFirstMultiplication = false;
          } else {
            result *= value;
          }
          break;

        case "DIV":
          if (value !== 0) {
            if (isFirstMultiplication) {
              result = 1 / value;
              isFirstMultiplication = false;
            } else {
              result /= value;
            }
          } else {
            // ゼロ除算の場合は0を返す
            return 0;
          }
          break;

        default:
          console.warn(`Unknown operation: ${operation}`);
      }
    }

    return result;
  }

  isApplicable(parameter: Parameter): boolean {
    return parameter.paramType === PARAMETER_TYPES.CALCULATION;
  }

  validate(parameter: Parameter): boolean {
    if (!isCalculationParameter(parameter)) {
      return false;
    }

    // 参照が設定されているか確認
    if (!parameter.paramReferences || parameter.paramReferences.length === 0) {
      return false;
    }

    // 各参照の妥当性を確認
    for (const ref of parameter.paramReferences) {
      if (!ref.accountId) {
        return false;
      }
      if (!ref.operation) {
        return false;
      }
    }

    return true;
  }
}
