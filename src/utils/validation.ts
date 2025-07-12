import type { ValidationError } from "../types/financial";
import type { SheetType } from "../types/account";
import type { ParameterType, Parameter } from "../types/parameter";
import { SHEET_TYPES } from "../types/account";
import { PARAMETER_TYPES } from "../types/parameter";
import { ACCOUNT_NAME_MAX_LENGTH, FORMULA_MAX_LENGTH } from "../utils/constants";

export const validateAccountName = (name: string): ValidationError | null => {
  if (!name || name.trim().length === 0) {
    return {
      field: "accountName",
      message: "科目名は必須です",
      code: "REQUIRED",
    };
  }

  if (name.length > ACCOUNT_NAME_MAX_LENGTH) {
    return {
      field: "accountName",
      message: `科目名は${ACCOUNT_NAME_MAX_LENGTH}文字以内で入力してください`,
      code: "MAX_LENGTH",
    };
  }

  return null;
};

export const validateSheet = (sheet: string): ValidationError | null => {
  const validSheets = Object.values(SHEET_TYPES);
  
  if (!validSheets.includes(sheet as SheetType)) {
    return {
      field: "sheet",
      message: "無効なシートタイプです",
      code: "INVALID_VALUE",
    };
  }

  return null;
};

export const validateIsCredit = (
  sheet: SheetType,
  isCredit: boolean | null
): ValidationError | null => {
  if (sheet === SHEET_TYPES.CF) {
    // CFシートの場合はnullであるべき
    if (isCredit !== null) {
      return {
        field: "isCredit",
        message: "CFシートでは借方・貸方の区別はありません",
        code: "INVALID_VALUE",
      };
    }
  } else {
    // その他のシートの場合はboolean値が必要
    if (isCredit === null) {
      return {
        field: "isCredit",
        message: "借方・貸方の指定が必要です",
        code: "REQUIRED",
      };
    }
  }

  return null;
};

export const validateParameterValue = (
  type: ParameterType,
  value?: number | null
): ValidationError | null => {
  if (type === PARAMETER_TYPES.PERCENTAGE || type === PARAMETER_TYPES.GROWTH_RATE) {
    if (value === undefined || value === null) {
      return {
        field: "paramValue",
        message: `${type}には数値が必須です`,
        code: "REQUIRED",
      };
    }

    if (type === PARAMETER_TYPES.PERCENTAGE && (value < 0 || value > 1)) {
      return {
        field: "paramValue",
        message: "比率は0〜1の範囲で入力してください",
        code: "OUT_OF_RANGE",
      };
    }

    if (type === PARAMETER_TYPES.GROWTH_RATE && (value < -1 || value > 10)) {
      return {
        field: "paramValue",
        message: "成長率は-100%〜1000%の範囲で入力してください",
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
  if (type === PARAMETER_TYPES.PERCENTAGE || type === PARAMETER_TYPES.PROPORTIONATE) {
    if (!referenceId) {
      return {
        field: "referenceId",
        message: "参照先の科目を選択してください",
        code: "REQUIRED",
      };
    }
  }

  return null;
};

export const validateFormula = (formula: string): ValidationError | null => {
  if (!formula || formula.trim().length === 0) {
    return {
      field: "formula",
      message: "計算式は必須です",
      code: "REQUIRED",
    };
  }

  if (formula.length > FORMULA_MAX_LENGTH) {
    return {
      field: "formula",
      message: `計算式は${FORMULA_MAX_LENGTH}文字以内で入力してください`,
      code: "MAX_LENGTH",
    };
  }

  // 基本的な構文チェック
  const allowedChars = /^[a-zA-Z0-9\s\+\-\*\/\(\)\[\]\.@]+$/;
  if (!allowedChars.test(formula)) {
    return {
      field: "formula",
      message: "計算式に使用できない文字が含まれています",
      code: "INVALID_FORMAT",
    };
  }

  return null;
};

export const validateParameter = (parameter: Parameter): ValidationError[] => {
  const errors: ValidationError[] = [];

  // パラメータタイプに応じたバリデーション
  switch (parameter.paramType) {
    case PARAMETER_TYPES.GROWTH_RATE:
    case PARAMETER_TYPES.PERCENTAGE:
      const valueError = validateParameterValue(parameter.paramType, parameter.paramValue);
      if (valueError) errors.push(valueError);
      break;

    case PARAMETER_TYPES.CALCULATION:
      if (!parameter.paramReferences || parameter.paramReferences.length === 0) {
        errors.push({
          field: "paramReferences",
          message: "計算対象の科目を選択してください",
          code: "REQUIRED",
        });
      }
      break;

    case PARAMETER_TYPES.PROPORTIONATE:
      if (!parameter.paramReferences) {
        errors.push({
          field: "paramReferences",
          message: "連動する科目を選択してください",
          code: "REQUIRED",
        });
      }
      break;
  }

  return errors;
};