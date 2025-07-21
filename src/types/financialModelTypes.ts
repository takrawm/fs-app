// 財務モデル関連の型定義
import type { Period } from "./periodTypes";
import type { FinancialValue } from "./financialValueTypes";

// 財務モデルの型定義
export interface FinancialModel {
  id: string;
  name: string;
  description?: string;
  periods: Period[];
  values: FinancialValue[];
}

// 財務モデル作成データの型定義
export interface CreateFinancialModelData {
  name: string;
  description?: string;
  periods?: Period[];
  values?: FinancialValue[];
}

// 財務モデル更新データの型定義
export interface UpdateFinancialModelData {
  name?: string;
  description?: string;
}

// 財務モデルフィルターの型定義
export interface FinancialModelFilter {
  name?: string;
}

// 財務モデル統計情報の型定義
export interface FinancialModelStats {
  totalModels: number;
  totalPeriods: number;
  totalValues: number;
  averageValuesPerModel: number;
}

// 財務モデルバックアップの型定義
export interface FinancialModelBackup {
  id: string;
  modelId: string;
  backupDate: Date;
  data: FinancialModel;
  version: string;
}
