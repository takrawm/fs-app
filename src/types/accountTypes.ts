// ========== 基本的な列挙型定義 ==========

/** パラメータタイプの定数定義 */
export const PARAMETER_TYPES = {
  GROWTH_RATE: "GROWTH_RATE",
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
  FINANCING: "FINANCING",
} as const;

/** CFインパクトタイプの定数定義 */
export const CF_IMPACT_TYPES = {
  IS_BASE_PROFIT: "IS_BASE_PROFIT",
  ADJUSTMENT: "ADJUSTMENT",
  RECLASSIFICATION: "RECLASSIFICATION",
} as const;

// 型エイリアスの作成（キーではなく値を使う）
// 結果: "GROWTH_RATE" | "CALCULATION" | "PERCENTAGE" | "PROPORTIONATE"
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
// SingleReferenceがBaseReferenceの全てのプロパティを継承することを意味
// {}の中に何も追加されていない場合、SingleReferenceとBaseReferenceは実質的に同じ定義
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

/** 定数パラメータ */

/**
 * メインのパラメータ型（Discriminated Union）
 * TypeScriptコンパイラが型を自動で絞り込める
 */
export type Parameter =
  | GrowthRateParameter
  | CalculationParameter
  | PercentageParameter
  | ProportionateParameter
  | NullParameter;

/**
 * サマリー科目で使用可能なパラメータ型
 */
export type SummaryAccountParameter = CalculationParameter | NullParameter;

// ========== CFインパクトの種類ごとの型定義 ==========

/** 基礎利益影響 - isBaseProfitがtrueになる */
export interface BaseProfitImpact {
  type: typeof CF_IMPACT_TYPES.IS_BASE_PROFIT;
  isBaseProfit: true;
}

/** 調整項目影響 - targetIdとoperationを持つ */
export interface AdjustmentImpact {
  type: typeof CF_IMPACT_TYPES.ADJUSTMENT;
  adjustment: {
    targetId: string;
    operation: "ADD" | "SUB";
  };
}

/** 組替項目影響 - fromとtoを持つ */
export interface ReclassificationImpact {
  type: typeof CF_IMPACT_TYPES.RECLASSIFICATION;
  reclassification: {
    from: string;
    to: string;
  };
}

/** CFに影響しない場合の型 */
export interface NoCfImpact {
  type: null;
}

/** CFインパクトの定義（Discriminated Union） */
export type FlowAccountCfImpact =
  | BaseProfitImpact
  | AdjustmentImpact
  | ReclassificationImpact
  | NoCfImpact;

// ========== Account オブジェクトの完全な型定義 ==========

/**
 * 共通の財務科目プロパティ
 */
interface BaseAccount {
  /** 科目の一意識別子 */
  id: string;

  /** 科目名 */
  accountName: string;

  /** 親科目のID（親がない場合はnull） */
  parentId: string | null;

  /** サマリー科目かどうか（集計科目：true, 明細科目：false） */
  isSummaryAccount: boolean;

  /** 貸方科目かどうか（借方：false, 貸方：true, 適用外：null） */
  isCredit: boolean | null;

  /** 表示順序情報 */
  displayOrder: DisplayOrder;

  /** 計算パラメータ */
  parameter: Parameter;
}

/**
 * BS科目のサマリー科目型定義
 */
export interface BSSummaryAccount extends BaseAccount {
  sheet: typeof SHEET_TYPES.BS;
  isSummaryAccount: true;
  parameter: SummaryAccountParameter;
  flowAccountCfImpact: NoCfImpact;
}

/**
 * BS科目の明細科目型定義
 */
export interface BSDetailAccount extends BaseAccount {
  sheet: typeof SHEET_TYPES.BS;
  isSummaryAccount: false;
  parameter: Parameter;
  flowAccountCfImpact: NoCfImpact;
}

/**
 * フロー科目（PL、PPE、FINANCING）のサマリー科目型定義
 */
export interface FlowSummaryAccount extends BaseAccount {
  sheet:
    | typeof SHEET_TYPES.PL
    | typeof SHEET_TYPES.PPE
    | typeof SHEET_TYPES.FINANCING;
  isSummaryAccount: true;
  parameter: SummaryAccountParameter;
  flowAccountCfImpact: NoCfImpact;
}

/**
 * フロー科目（PL、PPE、FINANCING）の明細科目型定義
 */
export interface FlowDetailAccount extends BaseAccount {
  sheet:
    | typeof SHEET_TYPES.PL
    | typeof SHEET_TYPES.PPE
    | typeof SHEET_TYPES.FINANCING;
  isSummaryAccount: false;
  parameter: Parameter;
  flowAccountCfImpact: FlowAccountCfImpact;
}

/**
 * CF科目のサマリー科目型定義
 */
export interface CFSummaryAccount extends BaseAccount {
  sheet: typeof SHEET_TYPES.CF;
  isSummaryAccount: true;
  isCredit: null;
  parameter: SummaryAccountParameter;
  flowAccountCfImpact: NoCfImpact;
}

/**
 * CF科目の明細科目型定義
 */
export interface CFDetailAccount extends BaseAccount {
  sheet: typeof SHEET_TYPES.CF;
  isSummaryAccount: false;
  isCredit: null;
  parameter: NullParameter;
  flowAccountCfImpact: NoCfImpact;
}

/**
 * BS科目の型定義（サマリー科目と明細科目の判別共用体）
 */
export type BSAccount = BSSummaryAccount | BSDetailAccount;

/**
 * フロー科目（PL、PPE、FINANCING）の型定義（サマリー科目と明細科目の判別共用体）
 */
export type FlowAccount = FlowSummaryAccount | FlowDetailAccount;

/**
 * CF科目の型定義（サマリー科目と明細科目の判別共用体）
 */
export type CFAccount = CFSummaryAccount | CFDetailAccount;

/**
 * サマリー科目の型定義（BS、フロー、CFの判別共用体）
 */
export type SummaryAccount =
  | BSSummaryAccount
  | FlowSummaryAccount
  | CFSummaryAccount;

/**
 * 明細科目の型定義（BS、フロー、CFの判別共用体）
 */
export type DetailAccount =
  | BSDetailAccount
  | FlowDetailAccount
  | CFDetailAccount;

/**
 * 財務科目の完全な型定義（判別共用体）
 */
export type Account = BSAccount | FlowAccount | CFAccount;

// ========== 型ガード関数（型の判定用） ==========

/** 成長率パラメータかどうかを判定 */
export function isGrowthRateParameter(
  param: Parameter
): param is GrowthRateParameter {
  return param.paramType === PARAMETER_TYPES.GROWTH_RATE;
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

/** サマリー科目で使用可能なパラメータかどうかを判定 */
export function isSummaryAccountParameter(
  param: Parameter
): param is SummaryAccountParameter {
  return (
    param.paramType === PARAMETER_TYPES.CALCULATION || param.paramType === null
  );
}

// ========== 型判定ヘルパー関数 ==========

/** PL科目かどうかを判定 */
export function isPLSheet(account: Account): boolean {
  return account.sheet === SHEET_TYPES.PL;
}

/** BS科目かどうかを判定 */
export function isBSSheet(account: Account): boolean {
  return account.sheet === SHEET_TYPES.BS;
}

/** CF科目かどうかを判定 */
export function isCFSheet(account: Account): boolean {
  return account.sheet === SHEET_TYPES.CF;
}

/** PPE科目かどうかを判定 */
export function isPPESheet(account: Account): boolean {
  return account.sheet === SHEET_TYPES.PPE;
}

/** 財務科目かどうかを判定 */
export function isFinancingSheet(account: Account): boolean {
  return account.sheet === SHEET_TYPES.FINANCING;
}

/** BS科目かどうかを判定 */
export function isBSAccount(account: Account): account is BSAccount {
  return account.sheet === SHEET_TYPES.BS;
}

/** フロー科目（PL、PPE、FINANCING）かどうかを判定 */
export function isFlowAccount(account: Account): account is FlowAccount {
  return (
    account.sheet === SHEET_TYPES.PL ||
    account.sheet === SHEET_TYPES.PPE ||
    account.sheet === SHEET_TYPES.FINANCING
  );
}

/** CF科目かどうかを判定 */
export function isCFAccount(account: Account): account is CFAccount {
  return account.sheet === SHEET_TYPES.CF;
}

/** サマリー科目かどうかを判定 */
export function isSummaryAccount(account: Account): account is SummaryAccount {
  return account.isSummaryAccount === true;
}

/** 明細科目かどうかを判定 */
export function isDetailAccount(account: Account): account is DetailAccount {
  return account.isSummaryAccount === false;
}

/** BSサマリー科目かどうかを判定 */
export function isBSSummaryAccount(
  account: Account
): account is BSSummaryAccount {
  return account.sheet === SHEET_TYPES.BS && account.isSummaryAccount === true;
}

/** BS明細科目かどうかを判定 */
export function isBSDetailAccount(
  account: Account
): account is BSDetailAccount {
  return account.sheet === SHEET_TYPES.BS && account.isSummaryAccount === false;
}

/** フローサマリー科目かどうかを判定 */
export function isFlowSummaryAccount(
  account: Account
): account is FlowSummaryAccount {
  return isFlowAccount(account) && account.isSummaryAccount === true;
}

/** フロー明細科目かどうかを判定 */
export function isFlowDetailAccount(
  account: Account
): account is FlowDetailAccount {
  return isFlowAccount(account) && account.isSummaryAccount === false;
}

/** CFサマリー科目かどうかを判定 */
export function isCFSummaryAccount(
  account: Account
): account is CFSummaryAccount {
  return account.sheet === SHEET_TYPES.CF && account.isSummaryAccount === true;
}

/** CF明細科目かどうかを判定 */
export function isCFDetailAccount(
  account: Account
): account is CFDetailAccount {
  return account.sheet === SHEET_TYPES.CF && account.isSummaryAccount === false;
}

/** 基礎利益影響かどうかを判定 */
export function isBaseProfitImpact(
  impact: FlowAccountCfImpact
): impact is BaseProfitImpact {
  return (
    impact.type === CF_IMPACT_TYPES.IS_BASE_PROFIT &&
    "isBaseProfit" in impact &&
    impact.isBaseProfit !== undefined
  );
}

/** 調整項目かどうかを判定 */
export function isAdjustmentImpact(
  impact: FlowAccountCfImpact
): impact is AdjustmentImpact {
  return (
    impact.type === CF_IMPACT_TYPES.ADJUSTMENT &&
    "adjustment" in impact &&
    impact.adjustment !== undefined
  );
}

/** 組替項目かどうかを判定 */
export function isReclassificationImpact(
  impact: FlowAccountCfImpact
): impact is ReclassificationImpact {
  return (
    impact.type === CF_IMPACT_TYPES.RECLASSIFICATION &&
    "reclassification" in impact &&
    impact.reclassification !== undefined
  );
}

/** CFに影響しない場合かどうかを判定 */
export function isNoCfImpact(
  impact: FlowAccountCfImpact
): impact is NoCfImpact {
  return impact.type === null;
}

// ========== その他の型定義 ==========

// 分離された型定義は以下のファイルで定義されています：
// - periodTypes.ts: Period
// - financialValueTypes.ts: FinancialValue
// - financialModelTypes.ts: FinancialModel
// - calculationTypes.ts: CalculationContext
