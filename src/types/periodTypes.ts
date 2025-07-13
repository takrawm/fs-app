// ========== 期間関連の型定義 ==========

/** 会計期間の型定義 */
export interface Period {
  id: string;
  name: string;
  displayName?: string;
  year: number;
  month?: number;
  startDate: Date;
  endDate: Date;
  sequence: number;
  isActual: boolean;
  isHistorical?: boolean;
  isForecast?: boolean;
}

/** 期間の表示用型定義 */
export interface PeriodDisplay {
  id: string;
  year: number;
  month: number;
  displayName: string;
  isAnnual: boolean;
  isForecast: boolean;
}

/** 期間の作成用型定義 */
export interface CreatePeriodData {
  name: string;
  displayName?: string;
  year: number;
  month?: number;
  startDate: Date;
  endDate: Date;
  sequence: number;
  isActual: boolean;
  isHistorical?: boolean;
  isForecast?: boolean;
}

/** 期間の更新用型定義 */
export interface UpdatePeriodData {
  name?: string;
  displayName?: string;
  startDate?: Date;
  endDate?: Date;
  sequence?: number;
  isActual?: boolean;
  isHistorical?: boolean;
  isForecast?: boolean;
}
