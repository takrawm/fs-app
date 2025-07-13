// ========== 期間関連の型定義 ==========

/** 会計期間の型定義 */
export interface Period {
  id: string;
  name: string;
  year: number;
  month?: number;
  financialYear: number;
  isAnnual: boolean;
  isForecast: boolean;
  sequence: number;
}

/** 期間の作成用型定義 */
export interface CreatePeriodData {
  name: string;
  year: number;
  month?: number;
  startDate: Date;
  endDate: Date;
  sequence: number;
  isActual: boolean;
  isForecast?: boolean;
}

/** 期間の更新用型定義 */
export interface UpdatePeriodData {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  sequence?: number;
  isActual?: boolean;
  isForecast?: boolean;
}
