import type { Parameter } from "../../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../../types/calculationTypes";

// 新しいパラメータ構造に対応した抽象ストラテジークラス
export abstract class NewCalculationStrategy {
  abstract readonly type: Parameter["paramType"];

  abstract calculate(
    accountId: string,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult;

  protected createResult(
    _accountId: string,
    _periodId: string,
    value: number,
    formula?: string,
    references: string[] = []
  ): CalculationResult {
    return {
      value,
      formula: formula || "",
      references,
    };
  }

  protected getValue(accountId: string, context: CalculationContext): number {
    return context.getValue(accountId) || 0;
  }

  protected getPreviousValue(
    accountId: string,
    context: CalculationContext
  ): number {
    return context.getPreviousValue(accountId) || 0;
  }

  // 日数計算用のヘルパーメソッド
  protected calculateDaysBasedValue(
    baseValue: number,
    days: number,
    daysInPeriod: number = 30
  ): number {
    return (baseValue * days) / daysInPeriod;
  }

  // パーセンテージ計算用のヘルパーメソッド
  protected calculatePercentage(baseValue: number, percentage: number): number {
    return baseValue * (percentage / 100);
  }
}
