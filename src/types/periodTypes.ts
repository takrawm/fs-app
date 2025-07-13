// 期間の型定義
export interface Period {
  id: string;
  name: string;
  year: number;
  month: number;
  financialYear: number;
  isAnnual: boolean;
  isForecast: boolean;
  sequence: number;
}

// 期間作成データの型定義
export interface CreatePeriodData {
  name: string;
  year: number;
  month: number;
  financialYear: number;
  isAnnual?: boolean;
  isForecast?: boolean;
  sequence?: number;
}

// 期間更新データの型定義
export interface UpdatePeriodData {
  name?: string;
  year?: number;
  month?: number;
  financialYear?: number;
  isAnnual?: boolean;
  isForecast?: boolean;
  sequence?: number;
}
