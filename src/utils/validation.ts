import type { ValidationError } from "../types/financial";
import type { AccountCategory, AccountDetailType } from "../types/account";
import type { ParameterType } from "../types/parameter";

export const validateAccountName = (name: string): ValidationError | null => {
  if (!name || name.trim().length === 0) {
    return {
      field: "name",
      message: "科目名は必須です",
      code: "REQUIRED",
    };
  }

  if (name.length > 100) {
    return {
      field: "name",
      message: "科目名は100文字以内で入力してください",
      code: "MAX_LENGTH",
    };
  }

  return null;
};

export const validateAccountCategory = (category: string): ValidationError | null => {
  const validCategories: AccountCategory[] = ["資産", "負債", "純資産", "収益", "費用"];
  
  if (!validCategories.includes(category as AccountCategory)) {
    return {
      field: "category",
      message: "無効なカテゴリです",
      code: "INVALID_VALUE",
    };
  }

  return null;
};

export const validateDetailType = (
  category: AccountCategory,
  detailType?: AccountDetailType
): ValidationError | null => {
  if (!detailType) return null;

  if ((category === "資産" || category === "負債") && 
      (detailType === "流動" || detailType === "固定")) {
    return null;
  }

  if ((category === "収益" || category === "費用") && 
      (detailType === "営業" || detailType === "営業外" || detailType === "特別")) {
    return null;
  }

  return {
    field: "detailType",
    message: `${category}には${detailType}は設定できません`,
    code: "INVALID_COMBINATION",
  };
};

export const validateParameterValue = (
  type: ParameterType,
  value?: number
): ValidationError | null => {
  if (type === "比率" || type === "成長率") {
    if (value === undefined || value === null) {
      return {
        field: "value",
        message: `${type}には数値が必須です`,
        code: "REQUIRED",
      };
    }

    if (type === "比率" && (value < 0 || value > 100)) {
      return {
        field: "value",
        message: "比率は0〜100の範囲で入力してください",
        code: "OUT_OF_RANGE",
      };
    }

    if (type === "成長率" && (value < -100 || value > 1000)) {
      return {
        field: "value",
        message: "成長率は-100〜1000の範囲で入力してください",
        code: "OUT_OF_RANGE",
      };
    }
  }

  return null;
};

export const validateReferenceId = (
  type: ParameterType,
  referenceId?: string
): ValidationError | null => {
  const typesRequiringReference: ParameterType[] = ["比率", "他科目連動", "参照"];
  
  if (typesRequiringReference.includes(type) && !referenceId) {
    return {
      field: "referenceId",
      message: `${type}には参照科目が必須です`,
      code: "REQUIRED",
    };
  }

  return null;
};

export const validatePeriodDates = (
  startDate: Date,
  endDate: Date
): ValidationError | null => {
  if (startDate >= endDate) {
    return {
      field: "dates",
      message: "終了日は開始日より後の日付を指定してください",
      code: "INVALID_DATE_RANGE",
    };
  }

  return null;
};