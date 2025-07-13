// ========== 財務モデル関連の型定義 ==========

import type { Account } from "./accountTypes";
import type { Period } from "./periodTypes";
import type { FinancialValue } from "./financialValueTypes";

/** 財務モデル全体の型定義 */
export interface FinancialModel {
  id: string;
  name: string;
  description?: string;
  accounts: Account[];
  periods: Period[];
  values: FinancialValue[];
  createdAt: Date;
  updatedAt: Date;
}

/** 財務モデルの作成用型定義 */
export interface CreateFinancialModelData {
  name: string;
  description?: string;
  accounts?: Account[];
  periods?: Period[];
  values?: FinancialValue[];
}

/** 財務モデルの更新用型定義 */
export interface UpdateFinancialModelData {
  name?: string;
  description?: string;
}

/** 財務モデルの検索条件 */
export interface FinancialModelFilter {
  name?: string;
  createdAtFrom?: Date;
  createdAtTo?: Date;
  updatedAtFrom?: Date;
  updatedAtTo?: Date;
}

/** 財務モデルの統計情報 */
export interface FinancialModelStats {
  totalAccounts: number;
  totalPeriods: number;
  totalValues: number;
  manualValues: number;
  calculatedValues: number;
  lastCalculatedAt?: Date;
}

/** 財務モデルのバックアップ情報 */
export interface FinancialModelBackup {
  id: string;
  modelId: string;
  backupName: string;
  backupDate: Date;
  data: FinancialModel;
  version: string;
}
