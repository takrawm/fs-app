// 既存の型定義をエクスポート（互換性維持のため）
export type AccountCategory = "資産" | "負債" | "純資産" | "収益" | "費用";
export type AccountDetailType = "流動" | "固定" | "営業" | "営業外" | "特別";
export type CFItemType = "営業CF" | "投資CF" | "財務CF";

// 新しい型定義を再エクスポート
export type {
  Account,
  SheetType,
  CfImpact,
  CfImpactType,
  DisplayOrder
} from './newFinancialTypes';

export {
  SHEET_TYPES,
  CF_IMPACT_TYPES,
  isPLAccount,
  isBSAccount,
  isCFAccount,
  isBaseProfitImpact,
  isAdjustmentImpact,
  isReclassificationImpact,
  migrateOldAccountToNew
} from './newFinancialTypes';

// 旧Account型（互換性のため残す）
export interface LegacyAccount {
  id: string;
  name: string;
  category: AccountCategory;
  detailType?: AccountDetailType;
  parentId?: string;
  isCFItem: boolean;
  cfItemType?: CFItemType;
  createdAt: Date;
  updatedAt: Date;
}

// AccountValue型はFinancialValueに統合されるが、互換性のため残す
export interface AccountValue {
  accountId: string;
  periodId: string;
  value: number;
  calculatedAt: Date;
}

export interface AccountRelation {
  fromAccountId: string;
  toAccountId: string;
  relationType: "parent-child" | "reference" | "cf-mapping";
}

// 新しいFinancialValue型を再エクスポート
export type { FinancialValue } from './newFinancialTypes';