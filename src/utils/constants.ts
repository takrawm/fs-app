import type { AccountCategory, AccountDetailType, CFItemType } from "../types/account";
import type { ParameterType } from "../types/parameter";

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

export const PARAMETER_TYPES: ParameterType[] = [
  "比率",
  "成長率",
  "他科目連動",
  "計算",
  "子科目合計",
  "参照",
];

export const PARAMETER_TYPE_LABELS: Record<ParameterType, string> = {
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