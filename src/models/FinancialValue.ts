// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
import type { AccountValue } from "../types/accountTypes";

export class FinancialValue implements AccountValue {
  accountId: string;
  periodId: string;
  value: number;
  calculatedAt: Date;

  constructor(accountId: string, periodId: string, value: number) {
    this.accountId = accountId;
    this.periodId = periodId;
    this.value = value;
    this.calculatedAt = new Date();
  }

  update(value: number): void {
    this.value = value;
    this.calculatedAt = new Date();
  }

  getKey(): string {
    return `${this.accountId}_${this.periodId}`;
  }

  static createKey(accountId: string, periodId: string): string {
    return `${accountId}_${periodId}`;
  }

  format(decimals: number = 0): string {
    return this.value.toLocaleString("ja-JP", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  isZero(): boolean {
    return Math.abs(this.value) < 0.0001;
  }

  isPositive(): boolean {
    return this.value > 0;
  }

  isNegative(): boolean {
    return this.value < 0;
  }
}
