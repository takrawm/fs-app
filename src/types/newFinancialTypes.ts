// 新しい財務モデル型定義

// シートタイプ定数
export const SHEET_TYPES = {
  PL: "PL",
  BS: "BS",
  CF: "CF",
  PPE: "PPE",
  FINANCING: "Financing",
} as const;

export type SheetType = (typeof SHEET_TYPES)[keyof typeof SHEET_TYPES];

// CFインパクトタイプ定数
export const CF_IMPACT_TYPES = {
  IS_BASE_PROFIT: "isBaseProfit",
  ADJUSTMENT: "adjustment",
  RECLASSIFICATION: "reclassification",
} as const;

export type CfImpactType =
  (typeof CF_IMPACT_TYPES)[keyof typeof CF_IMPACT_TYPES];

// パラメータタイプ定数
export const PARAMETER_TYPES = {
  CONSTANT: "constant",
  PERCENTAGE: "percentage",
  PERCENTAGE_OF_REVENUE: "percentageOfRevenue",
  DAYS: "days",
  MANUAL_INPUT: "manualInput",
  FORMULA: "formula",
} as const;

export type ParameterType =
  (typeof PARAMETER_TYPES)[keyof typeof PARAMETER_TYPES];

// 表示順序の型定義
export interface DisplayOrder {
  sheetOrder: number;
  sectionOrder: number;
  itemOrder: number;
}

// キャッシュフロー影響の型定義
export interface CfImpact {
  type: CfImpactType;
  targetAccountIds?: string[];
  formula?: string;
}

// パラメータの基底インターフェース
interface BaseParameter {
  type: ParameterType;
}

// 定数パラメータ
export interface ConstantParameter extends BaseParameter {
  type: typeof PARAMETER_TYPES.CONSTANT;
  value: number;
}

// パーセンテージパラメータ
export interface PercentageParameter extends BaseParameter {
  type: typeof PARAMETER_TYPES.PERCENTAGE;
  value: number;
  baseAccountId: string;
}

// 売上高比率パラメータ
export interface PercentageOfRevenueParameter extends BaseParameter {
  type: typeof PARAMETER_TYPES.PERCENTAGE_OF_REVENUE;
  value: number;
}

// 日数パラメータ
export interface DaysParameter extends BaseParameter {
  type: typeof PARAMETER_TYPES.DAYS;
  days: number;
  baseAccountId: string;
}

// 手動入力パラメータ
export interface ManualInputParameter extends BaseParameter {
  type: typeof PARAMETER_TYPES.MANUAL_INPUT;
  defaultValue?: number;
}

// 計算式パラメータ
export interface FormulaParameter extends BaseParameter {
  type: typeof PARAMETER_TYPES.FORMULA;
  formula: string;
  dependencies: string[];
}

// Discriminated Union
export type Parameter =
  | ConstantParameter
  | PercentageParameter
  | PercentageOfRevenueParameter
  | DaysParameter
  | ManualInputParameter
  | FormulaParameter;

// 勘定科目の型定義
export interface Account {
  id: string;
  accountName: string;
  parentId: string | null;
  sheet: SheetType;
  isCredit: boolean | null;
  displayOrder: DisplayOrder;
  parameter: Parameter;
  cfImpact: CfImpact;
}

// 期間の型定義
export interface Period {
  id: string;
  year: number;
  month: number;
  displayName: string;
  isAnnual: boolean;
  isForecast: boolean;
}

// 財務値の型定義
export interface FinancialValue {
  accountId: string;
  periodId: string;
  value: number;
  isManualInput: boolean;
  formula?: string;
  lastUpdated: Date;
}

// 型ガード関数
export function isConstantParameter(
  param: Parameter
): param is ConstantParameter {
  return param.type === PARAMETER_TYPES.CONSTANT;
}

export function isPercentageParameter(
  param: Parameter
): param is PercentageParameter {
  return param.type === PARAMETER_TYPES.PERCENTAGE;
}

export function isPercentageOfRevenueParameter(
  param: Parameter
): param is PercentageOfRevenueParameter {
  return param.type === PARAMETER_TYPES.PERCENTAGE_OF_REVENUE;
}

export function isDaysParameter(param: Parameter): param is DaysParameter {
  return param.type === PARAMETER_TYPES.DAYS;
}

export function isManualInputParameter(
  param: Parameter
): param is ManualInputParameter {
  return param.type === PARAMETER_TYPES.MANUAL_INPUT;
}

export function isFormulaParameter(
  param: Parameter
): param is FormulaParameter {
  return param.type === PARAMETER_TYPES.FORMULA;
}

// シートタイプの型ガード
export function isPLAccount(account: Account): boolean {
  return account.sheet === SHEET_TYPES.PL;
}

export function isBSAccount(account: Account): boolean {
  return account.sheet === SHEET_TYPES.BS;
}

export function isCFAccount(account: Account): boolean {
  return account.sheet === SHEET_TYPES.CF;
}

// CFインパクトタイプの型ガード
export function isBaseProfitImpact(cfImpact: CfImpact): boolean {
  return cfImpact.type === CF_IMPACT_TYPES.IS_BASE_PROFIT;
}

export function isAdjustmentImpact(cfImpact: CfImpact): boolean {
  return cfImpact.type === CF_IMPACT_TYPES.ADJUSTMENT;
}

export function isReclassificationImpact(cfImpact: CfImpact): boolean {
  return cfImpact.type === CF_IMPACT_TYPES.RECLASSIFICATION;
}

// データ変換ユーティリティ（既存データからの移行用）
export function migrateOldAccountToNew(oldAccount: any): Account {
  // デフォルトの表示順序
  const defaultDisplayOrder: DisplayOrder = {
    sheetOrder: 1,
    sectionOrder: 1,
    itemOrder: 1,
  };

  // デフォルトのCFインパクト
  const defaultCfImpact: CfImpact = {
    type: CF_IMPACT_TYPES.ADJUSTMENT,
  };

  // デフォルトのパラメータ
  const defaultParameter: ConstantParameter = {
    type: PARAMETER_TYPES.CONSTANT,
    value: 0,
  };

  return {
    id: oldAccount.id || "",
    accountName: oldAccount.name || oldAccount.accountName || "",
    parentId: oldAccount.parentId || null,
    sheet: mapOldCategoryToSheet(oldAccount.category || "BS"),
    isCredit: determineIsCredit(oldAccount),
    displayOrder: oldAccount.displayOrder || defaultDisplayOrder,
    parameter: oldAccount.parameter || defaultParameter,
    cfImpact: oldAccount.cfImpact || defaultCfImpact,
  };
}

// 旧カテゴリーから新シートタイプへのマッピング
function mapOldCategoryToSheet(category: string): SheetType {
  const mapping: Record<string, SheetType> = {
    PL: SHEET_TYPES.PL,
    BS: SHEET_TYPES.BS,
    CF: SHEET_TYPES.CF,
    revenue: SHEET_TYPES.PL,
    expense: SHEET_TYPES.PL,
    asset: SHEET_TYPES.BS,
    liability: SHEET_TYPES.BS,
    equity: SHEET_TYPES.BS,
  };
  return mapping[category] || SHEET_TYPES.BS;
}

// 借方・貸方の判定
function determineIsCredit(account: any): boolean | null {
  if (account.isCredit !== undefined) return account.isCredit;

  // カテゴリーベースの推定
  const creditCategories = ["revenue", "liability", "equity"];
  const debitCategories = ["expense", "asset"];

  if (creditCategories.includes(account.category)) return true;
  if (debitCategories.includes(account.category)) return false;

  return null;
}
