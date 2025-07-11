import type { AccountCategory, AccountDetailType, CFItemType, SheetType, CfImpactType } from "../types/account";
import type { ParameterType, LegacyParameterConfig } from "../types/parameter";
import { SHEET_TYPES, CF_IMPACT_TYPES, PARAMETER_TYPES } from "../types/newFinancialTypes";

// 既存の定数（互換性のため維持）
export const ACCOUNT_CATEGORIES: AccountCategory[] = [
  "資産",
  "負債",
  "純資産",
  "収益",
  "費用",
];

export const ACCOUNT_DETAIL_TYPES: AccountDetailType[] = [
  "流動",
  "固定",
  "営業",
  "営業外",
  "特別",
];

export const CF_ITEM_TYPES: CFItemType[] = [
  "営業CF",
  "投資CF",
  "財務CF",
];

// 旧パラメータタイプ（互換性のため維持）
export const LEGACY_PARAMETER_TYPES: LegacyParameterConfig["type"][] = [
  "比率",
  "成長率",
  "他科目連動",
  "計算",
  "子科目合計",
  "参照",
];

export const PARAMETER_TYPE_LABELS: Record<LegacyParameterConfig["type"], string> = {
  "比率": "他科目の比率",
  "成長率": "前期からの成長率",
  "他科目連動": "他科目と同額",
  "計算": "複数科目の計算",
  "子科目合計": "子科目の合計",
  "参照": "他科目を参照",
};

export const CATEGORY_COLORS: Record<AccountCategory, string> = {
  "資産": "text-blue-600",
  "負債": "text-red-600",
  "純資産": "text-green-600",
  "収益": "text-purple-600",
  "費用": "text-orange-600",
};

// 新しい定数の追加
export const SHEET_TYPE_LABELS: Record<SheetType, string> = {
  [SHEET_TYPES.PL]: "損益計算書",
  [SHEET_TYPES.BS]: "貸借対照表",
  [SHEET_TYPES.CF]: "キャッシュフロー計算書",
  [SHEET_TYPES.PPE]: "有形固定資産",
  [SHEET_TYPES.FINANCING]: "資金調達",
};

export const SHEET_TYPE_COLORS: Record<SheetType, string> = {
  [SHEET_TYPES.PL]: "text-purple-600",
  [SHEET_TYPES.BS]: "text-blue-600",
  [SHEET_TYPES.CF]: "text-green-600",
  [SHEET_TYPES.PPE]: "text-gray-600",
  [SHEET_TYPES.FINANCING]: "text-orange-600",
};

export const CF_IMPACT_TYPE_LABELS: Record<CfImpactType, string> = {
  [CF_IMPACT_TYPES.IS_BASE_PROFIT]: "基準利益",
  [CF_IMPACT_TYPES.ADJUSTMENT]: "調整項目",
  [CF_IMPACT_TYPES.RECLASSIFICATION]: "振替項目",
};

export const NEW_PARAMETER_TYPE_LABELS: Record<ParameterType, string> = {
  [PARAMETER_TYPES.CONSTANT]: "固定値",
  [PARAMETER_TYPES.PERCENTAGE]: "比率",
  [PARAMETER_TYPES.PERCENTAGE_OF_REVENUE]: "売上高比率",
  [PARAMETER_TYPES.DAYS]: "日数ベース",
  [PARAMETER_TYPES.MANUAL_INPUT]: "手動入力",
  [PARAMETER_TYPES.FORMULA]: "計算式",
};

// デフォルト値の定義
export const DEFAULT_DISPLAY_ORDER = {
  sheetOrder: 1,
  sectionOrder: 1,
  itemOrder: 1,
};

export const DEFAULT_CF_IMPACT = {
  type: CF_IMPACT_TYPES.ADJUSTMENT,
};

// バリデーション定数
export const ACCOUNT_NAME_MAX_LENGTH = 100;
export const FORMULA_MAX_LENGTH = 500;

// 計算関連の定数
export const MAX_DECIMAL_PLACES = 2;
export const DEFAULT_VALUE = 0;

// UI関連の定数
export const TABLE_PAGE_SIZE = 20;
export const MAX_TREE_DEPTH = 5;