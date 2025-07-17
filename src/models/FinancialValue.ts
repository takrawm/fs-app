import type { FinancialValue as FinancialValueType } from "../types/financialValueTypes";

export class FinancialValue implements FinancialValueType {
  id: string;
  accountId: string;
  periodId: string;
  value: number;
  isCalculated: boolean;

  constructor(
    accountId: string,
    periodId: string,
    value: number,
    isCalculated: boolean = false
  ) {
    this.id = FinancialValue.createKey(accountId, periodId);
    this.accountId = accountId;
    this.periodId = periodId;
    this.value = value;
    this.isCalculated = isCalculated;
  }

  update(value: number, isCalculated?: boolean): void {
    this.value = value;
    if (isCalculated !== undefined) {
      this.isCalculated = isCalculated;
    }
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
