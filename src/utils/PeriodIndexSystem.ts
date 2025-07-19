import type { Period } from "../types/periodTypes";

export class PeriodIndexSystem {
  private periodToIndex: Map<string, number>;
  private indexToPeriod: Map<number, string>;
  private periods: Period[];

  constructor(periods: Period[]) {
    // sequenceで並び替えて確実な時系列順序を保証
    this.periods = [...periods].sort((a, b) => a.sequence - b.sequence);
    this.periodToIndex = new Map();
    this.indexToPeriod = new Map();

    // インデックスマップを構築（O(n)、初期化時のみ）
    this.periods.forEach((period, index) => {
      this.periodToIndex.set(period.id, index);
      this.indexToPeriod.set(index, period.id);
    });
  }

  // O(1)で相対期間のIDを取得
  getRelativePeriodId(currentPeriodId: string, offset: number): string | null {
    const currentIndex = this.periodToIndex.get(currentPeriodId);
    if (currentIndex === undefined) return null;

    const targetIndex = currentIndex + offset;
    return this.indexToPeriod.get(targetIndex) || null;
  }

  // O(1)で期間のインデックスを取得
  getPeriodIndex(periodId: string): number | null {
    return this.periodToIndex.get(periodId) ?? null;
  }

  // O(1)で前期のIDを取得
  getPreviousPeriodId(periodId: string): string | null {
    return this.getRelativePeriodId(periodId, -1);
  }

  // O(1)で次期のIDを取得
  getNextPeriodId(periodId: string): string | null {
    return this.getRelativePeriodId(periodId, 1);
  }

  // 期間範囲のIDを取得（最小限のループ）
  getPeriodRange(startId: string, endId: string): string[] {
    const startIndex = this.periodToIndex.get(startId);
    const endIndex = this.periodToIndex.get(endId);

    if (startIndex === undefined || endIndex === undefined) return [];

    const result: string[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const periodId = this.indexToPeriod.get(i);
      if (periodId) result.push(periodId);
    }
    return result;
  }

  // 全期間を取得
  getAllPeriods(): Period[] {
    return [...this.periods];
  }

  // 期間データの再構築（期間が追加・削除された時用）
  rebuild(periods: Period[]): void {
    this.periods = [...periods].sort((a, b) => a.sequence - b.sequence);
    this.periodToIndex.clear();
    this.indexToPeriod.clear();

    this.periods.forEach((period, index) => {
      this.periodToIndex.set(period.id, index);
      this.indexToPeriod.set(index, period.id);
    });
  }
}
