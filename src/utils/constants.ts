import type { SheetType, CfImpactType } from "../types/accountTypes";
import type { ParameterType } from "../types/accountTypes";
import { SHEET_TYPES, CF_IMPACT_TYPES } from "../types/accountTypes";
import { PARAMETER_TYPES } from "../types/accountTypes";

// シートタイプのラベル
export const SHEET_TYPE_LABELS: Record<SheetType, string> = {
  [SHEET_TYPES.PL]: "PL",
  [SHEET_TYPES.BS]: "BS",
  [SHEET_TYPES.CF]: "CF",
  [SHEET_TYPES.PPE]: "PP&E",
  [SHEET_TYPES.FINANCING]: "FINANCING",
};

// シートタイプの色
export const SHEET_TYPE_COLORS: Record<SheetType, string> = {
  [SHEET_TYPES.PL]: "text-purple-600",
  [SHEET_TYPES.BS]: "text-blue-600",
  [SHEET_TYPES.CF]: "text-green-600",
  [SHEET_TYPES.PPE]: "text-gray-600",
  [SHEET_TYPES.FINANCING]: "text-orange-600",
};

// CFインパクトタイプのラベル
export const CF_IMPACT_TYPE_LABELS: Record<CfImpactType, string> = {
  [CF_IMPACT_TYPES.IS_BASE_PROFIT]: "基準利益",
  [CF_IMPACT_TYPES.ADJUSTMENT]: "調整項目",
  [CF_IMPACT_TYPES.RECLASSIFICATION]: "振替項目",
};

// パラメータタイプのラベル
export const NEW_PARAMETER_TYPE_LABELS: Record<ParameterType, string> = {
  [PARAMETER_TYPES.GROWTH_RATE]: "成長率",
  [PARAMETER_TYPES.CALCULATION]: "計算式",
  [PARAMETER_TYPES.PERCENTAGE]: "比率",
  [PARAMETER_TYPES.PROPORTIONATE]: "連動",
};

// デフォルト値の定義
export const DEFAULT_DISPLAY_ORDER = {
  order: "1",
  prefix: "G",
};

export const DEFAULT_CF_IMPACT = {
  type: CF_IMPACT_TYPES.ADJUSTMENT,
};

// バリデーション定数
export const ACCOUNT_NAME_MAX_LENGTH = 100;
export const FORMULA_MAX_LENGTH = 500;

// フォームの初期状態
export const INITIAL_FORM_STATE = {
  accountName: "",
  parentId: null,
  sheet: SHEET_TYPES.PL,
  isCredit: false,
  displayOrder: DEFAULT_DISPLAY_ORDER,
  paramType: null as null,
  paramValue: null as null,
  paramReferences: null as null,
  cfImpactType: CF_IMPACT_TYPES.ADJUSTMENT,
  targetAccountIds: [] as string[],
};
