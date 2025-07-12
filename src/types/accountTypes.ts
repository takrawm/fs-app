// ========== 基本的な列挙型定義 ==========

/** パラメータタイプの定数定義 */
export const PARAMETER_TYPES = {
  GROWTH_RATE: "GROWTH_RATE",
  CHILDREN_SUM: "CHILDREN_SUM",
  CALCULATION: "CALCULATION",
  PERCENTAGE: "PERCENTAGE",
  PROPORTIONATE: "PROPORTIONATE",
} as const;

/** 操作タイプの定数定義 */
export const OPERATIONS = {
  ADD: "ADD",
  SUB: "SUB",
  MUL: "MUL",
  DIV: "DIV",
} as const;

/** シートタイプの定数定義 */
export const SHEET_TYPES = {
  PL: "PL",
  BS: "BS",
  CF: "CF",
  PPE: "PPE",
  FINANCING: "Financing",
} as const;

/** CFインパクトタイプの定数定義 */
export const CF_IMPACT_TYPES = {
  IS_BASE_PROFIT: "isBaseProfit",
  ADJUSTMENT: "adjustment",
  RECLASSIFICATION: "reclassification",
} as const;

// 型エイリアスの作成
export type ParameterType =
  (typeof PARAMETER_TYPES)[keyof typeof PARAMETER_TYPES];
export type Operation = (typeof OPERATIONS)[keyof typeof OPERATIONS];
export type SheetType = (typeof SHEET_TYPES)[keyof typeof SHEET_TYPES];
export type CfImpactType =
  (typeof CF_IMPACT_TYPES)[keyof typeof CF_IMPACT_TYPES];

// ========== 共通インターフェース ==========

/** 表示順序の定義 */
export interface DisplayOrder {
  order: string;
  prefix: string;
}

/** 参照情報の基本構造 */
interface BaseReference {
  accountId: string;
  operation: Operation;
  lag: number;
}

/** 単一参照（PERCENTAGE, PROPORTIONATEで使用） */
interface SingleReference extends BaseReference {}

/** 複数参照（CALCULATIONで使用） */
interface MultipleReference extends BaseReference {}

// ========== Discriminated Union による型安全なパラメータ定義 ==========

/** 成長率パラメータ */
interface GrowthRateParameter {
  paramType: typeof PARAMETER_TYPES.GROWTH_RATE;
  paramValue: number; // 成長率（例: 0.05 = 5%）
  paramReferences: null;
}

/** 子科目合計パラメータ */
interface ChildrenSumParameter {
  paramType: typeof PARAMETER_TYPES.CHILDREN_SUM;
  paramValue: null;
  paramReferences: null;
}

/** 計算パラメータ（複数科目の計算） */
interface CalculationParameter {
  paramType: typeof PARAMETER_TYPES.CALCULATION;
  paramValue: null;
  paramReferences: MultipleReference[]; // 複数の参照科目
}

/** 比率パラメータ */
interface PercentageParameter {
  paramType: typeof PARAMETER_TYPES.PERCENTAGE;
  paramValue: number; // 比率（例: 0.05 = 5%）
  paramReferences: SingleReference; // 基準となる単一科目
}

/** 連動パラメータ */
interface ProportionateParameter {
  paramType: typeof PARAMETER_TYPES.PROPORTIONATE;
  paramValue: null;
  paramReferences: SingleReference; // 連動する単一科目
}

/** パラメータなし */
interface NullParameter {
  paramType: null;
  paramValue: null;
  paramReferences: null;
}

/**
 * メインのパラメータ型（Discriminated Union）
 * TypeScriptコンパイラが型を自動で絞り込める
 */
export type Parameter =
  | GrowthRateParameter
  | ChildrenSumParameter
  | CalculationParameter
  | PercentageParameter
  | ProportionateParameter
  | NullParameter;

/** CFインパクトの定義 */
export interface CfImpact {
  type: CfImpactType;
  targetAccountIds?: string[];
}

// ========== Account オブジェクトの完全な型定義 ==========

/**
 * 財務科目の完全な型定義
 * 共通項目 + パラメータを統合した構造
 */
export interface Account {
  /** 科目の一意識別子 */
  id: string;

  /** 科目名 */
  accountName: string;

  /** 親科目のID（親がない場合はnull） */
  parentId: string | null;

  /** 所属するシート */
  sheet: SheetType;

  /** 貸方科目かどうか（借方：false, 貸方：true, 適用外：null） */
  isCredit: boolean | null;

  /** 表示順序情報 */
  displayOrder: DisplayOrder;

  /** 計算パラメータ */
  parameter: Parameter;

  /** CFへの影響タイプ */
  cfImpact: CfImpact;
}

// ========== 型ガード関数（型の判定用） ==========

/** 成長率パラメータかどうかを判定 */
export function isGrowthRateParameter(
  param: Parameter
): param is GrowthRateParameter {
  return param.paramType === PARAMETER_TYPES.GROWTH_RATE;
}

/** 子科目合計パラメータかどうかを判定 */
export function isChildrenSumParameter(
  param: Parameter
): param is ChildrenSumParameter {
  return param.paramType === PARAMETER_TYPES.CHILDREN_SUM;
}

/** 計算パラメータかどうかを判定 */
export function isCalculationParameter(
  param: Parameter
): param is CalculationParameter {
  return param.paramType === PARAMETER_TYPES.CALCULATION;
}

/** 比率パラメータかどうかを判定 */
export function isPercentageParameter(
  param: Parameter
): param is PercentageParameter {
  return param.paramType === PARAMETER_TYPES.PERCENTAGE;
}

/** 連動パラメータかどうかを判定 */
export function isProportionateParameter(
  param: Parameter
): param is ProportionateParameter {
  return param.paramType === PARAMETER_TYPES.PROPORTIONATE;
}

/** パラメータなしかどうかを判定 */
export function isNullParameter(param: Parameter): param is NullParameter {
  return param.paramType === null;
}

// ========== 型判定ヘルパー関数 ==========

/** PL科目かどうかを判定 */
export function isPLAccount(account: Account): boolean {
  return account.sheet === SHEET_TYPES.PL;
}

/** BS科目かどうかを判定 */
export function isBSAccount(account: Account): boolean {
  return account.sheet === SHEET_TYPES.BS;
}

/** CF科目かどうかを判定 */
export function isCFAccount(account: Account): boolean {
  return account.sheet === SHEET_TYPES.CF;
}

/** 基礎利益影響かどうかを判定 */
export function isBaseProfitImpact(impact: CfImpact): boolean {
  return impact.type === CF_IMPACT_TYPES.IS_BASE_PROFIT;
}

/** 調整項目かどうかを判定 */
export function isAdjustmentImpact(impact: CfImpact): boolean {
  return impact.type === CF_IMPACT_TYPES.ADJUSTMENT;
}

/** 組替項目かどうかを判定 */
export function isReclassificationImpact(impact: CfImpact): boolean {
  return impact.type === CF_IMPACT_TYPES.RECLASSIFICATION;
}

// ========== その他の型定義 ==========

/** 財務数値の型定義 */
export interface FinancialValue {
  id: string;
  accountId: string;
  periodId: string;
  value: number;
  calculatedAt: Date;
  formula?: string;
  dependencies?: string[];
  isManualInput?: boolean;
  lastUpdated?: Date;
}

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

/** 計算結果の型 */
export interface CalculationResult {
  value: number;
  formula: string;
  references: string[];
}

/** 計算コンテキスト（計算に必要なデータ） */
export interface CalculationContext {
  accountId: string;
  accountValues: Map<string, number>; // 科目ID -> 値のマップ
  previousValues: Map<string, number>; // 前期値のマップ
}

/** 計算ストラテジーの基底インターフェース */
export interface CalculationStrategy {
  calculate(context: CalculationContext): CalculationResult;
  getRequiredReferences(): string[];
  validate(parameter: Parameter): boolean;
}
