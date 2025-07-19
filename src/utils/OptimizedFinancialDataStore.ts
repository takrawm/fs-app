import type { Account } from "../types/accountTypes";
import type { Period } from "../types/periodTypes";
import type { FinancialValue } from "../types/financialValueTypes";
import { PeriodIndexSystem } from "./PeriodIndexSystem";

export class OptimizedFinancialDataStore {
  private data: Map<string, number>; // 複合キーによる値の保存
  private periodIndex: PeriodIndexSystem;
  private accountIds: Set<string>;

  constructor(
    accounts: Account[],
    periods: Period[],
    financialValues: Map<string, FinancialValue>
  ) {
    this.periodIndex = new PeriodIndexSystem(periods);
    this.accountIds = new Set(accounts.map((a) => a.id));
    this.data = new Map();

    // 初期データの設定
    financialValues.forEach((value, key) => {
      this.data.set(key, value.value);
    });
  }

  // O(1)で現在期間の値を取得
  getValue(accountId: string, periodId: string): number {
    const key = `${accountId}_${periodId}`;
    return this.data.get(key) || 0;
  }

  // O(1)で相対期間の値を取得（文字列処理なし）
  getRelativeValue(
    accountId: string,
    currentPeriodId: string,
    offset: number
  ): number {
    const targetPeriodId = this.periodIndex.getRelativePeriodId(
      currentPeriodId,
      offset
    );
    if (!targetPeriodId) return 0;

    const key = `${accountId}_${targetPeriodId}`;
    return this.data.get(key) || 0;
  }

  // O(1)で前期値を取得
  getPreviousValue(accountId: string, currentPeriodId: string): number {
    return this.getRelativeValue(accountId, currentPeriodId, -1);
  }

  // 期間の全値を効率的に取得
  getPeriodValues(periodId: string): Map<string, number> {
    const result = new Map<string, number>();

    this.accountIds.forEach((accountId) => {
      const key = `${accountId}_${periodId}`;
      const value = this.data.get(key);
      if (value !== undefined) {
        result.set(accountId, value);
      }
    });

    return result;
  }

  // 値の設定
  setValue(accountId: string, periodId: string, value: number): void {
    const key = `${accountId}_${periodId}`;
    this.data.set(key, value);
  }

  // バルク更新
  setValues(
    updates: Array<{ accountId: string; periodId: string; value: number }>
  ): void {
    updates.forEach(({ accountId, periodId, value }) => {
      this.setValue(accountId, periodId, value);
    });
  }

  // 内部データを財務数値Mapに変換
  toFinancialValueMap(): Map<string, FinancialValue> {
    const result = new Map<string, FinancialValue>();

    this.data.forEach((value, key) => {
      const [accountId, periodId] = key.split("_");
      result.set(key, {
        accountId,
        periodId,
        value,
        isCalculated: false,
      });
    });

    return result;
  }

  // 時系列データの効率的取得
  getTimeSeriesValues(
    accountId: string,
    currentPeriodId: string,
    startOffset: number,
    endOffset: number
  ): number[] {
    const values: number[] = [];
    for (let offset = startOffset; offset <= endOffset; offset++) {
      values.push(this.getRelativeValue(accountId, currentPeriodId, offset));
    }
    return values;
  }

  // 複数値の一括取得
  getBulkValues(accountIds: string[], periodId: string): Map<string, number> {
    const result = new Map<string, number>();
    accountIds.forEach((id) => {
      result.set(id, this.getValue(id, periodId));
    });
    return result;
  }

  // 期間インデックスシステムの取得
  getPeriodIndexSystem(): PeriodIndexSystem {
    return this.periodIndex;
  }

  // データストアの再構築（期間やアカウントが変更された時用）
  rebuild(
    accounts: Account[],
    periods: Period[],
    financialValues: Map<string, FinancialValue>
  ): void {
    this.periodIndex.rebuild(periods);
    this.accountIds = new Set(accounts.map((a) => a.id));
    this.data.clear();

    financialValues.forEach((value, key) => {
      this.data.set(key, value.value);
    });
  }

  // デバッグ用：データストアの状態を取得
  getStats(): {
    totalValues: number;
    totalAccounts: number;
    totalPeriods: number;
    memoryUsageKB: number;
  } {
    return {
      totalValues: this.data.size,
      totalAccounts: this.accountIds.size,
      totalPeriods: this.periodIndex.getAllPeriods().length,
      memoryUsageKB: Math.round((this.data.size * 32) / 1024), // 概算
    };
  }
}
