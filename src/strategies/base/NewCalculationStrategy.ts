import type { Parameter, CalculationContext } from "../../types/parameter";
import type { CalculationResult } from "../../types/financial";

// 新しいパラメータ構造に対応した抽象ストラテジークラス
export abstract class NewCalculationStrategy {
  abstract readonly type: Parameter["type"];

  abstract calculate(
    accountId: string,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult;

  protected createResult(
    accountId: string,
    periodId: string,
    value: number,
    formula?: string,
    dependencies: string[] = []
  ): CalculationResult {
    return {
      accountId,
      periodId,
      value,
      formula,
      dependencies,
      calculatedAt: new Date(),
    };
  }

  protected getValue(accountId: string, context: CalculationContext): number {
    return context.accounts.get(accountId) || 0;
  }

  protected getPreviousValue(accountId: string, context: CalculationContext): number {
    if (!context.previousPeriodId) return 0;
    return context.accounts.get(`${accountId}_${context.previousPeriodId}`) || 0;
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