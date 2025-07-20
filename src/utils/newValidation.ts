import type { ValidationError } from "../types/financial";
import type { Account, SheetType } from "../types/accountTypes";
import type { Parameter } from "../types/accountTypes";
import { SHEET_TYPES, PARAMETER_TYPES } from "../types/accountTypes";
import {
  ACCOUNT_NAME_MAX_LENGTH,
  FORMULA_MAX_LENGTH,
} from "../utils/constants";

// 新しいアカウント構造用のバリデーション関数

export const validateAccount = (
  account: Partial<Account>
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // 勘定科目名の検証
  if (!account.accountName || account.accountName.trim().length === 0) {
    errors.push({
      field: "accountName",
      message: "勘定科目名は必須です",
      code: "REQUIRED",
    });
  } else if (account.accountName.length > ACCOUNT_NAME_MAX_LENGTH) {
    errors.push({
      field: "accountName",
      message: `勘定科目名は${ACCOUNT_NAME_MAX_LENGTH}文字以内で入力してください`,
      code: "MAX_LENGTH",
    });
  }

  // シートタイプの検証
  if (!account.sheet) {
    errors.push({
      field: "sheet",
      message: "シートタイプは必須です",
      code: "REQUIRED",
    });
  } else if (!Object.values(SHEET_TYPES).includes(account.sheet)) {
    errors.push({
      field: "sheet",
      message: "無効なシートタイプです",
      code: "INVALID_VALUE",
    });
  }

  // パラメータの検証
  if (!account.parameter) {
    errors.push({
      field: "parameter",
      message: "パラメータは必須です",
      code: "REQUIRED",
    });
  } else {
    const parameterErrors = validateParameter(account.parameter);
    errors.push(...parameterErrors);
  }

  // CFインパクトの検証
  if (!account.flowAccountCfImpact) {
    errors.push({
      field: "flowAccountCfImpact",
      message: "CFインパクトは必須です",
      code: "REQUIRED",
    });
  }

  // 表示順序の検証
  if (account.displayOrder) {
    if (
      !account.displayOrder.order ||
      account.displayOrder.order.trim().length === 0
    ) {
      errors.push({
        field: "displayOrder.order",
        message: "表示順序は必須です",
        code: "REQUIRED",
      });
    }
    if (
      !account.displayOrder.prefix ||
      account.displayOrder.prefix.trim().length === 0
    ) {
      errors.push({
        field: "displayOrder.prefix",
        message: "プレフィックスは必須です",
        code: "REQUIRED",
      });
    }
  }

  return errors;
};

export const validateParameter = (parameter: Parameter): ValidationError[] => {
  const errors: ValidationError[] = [];

  // パラメータタイプの検証
  if (!parameter.paramType) {
    errors.push({
      field: "parameter.paramType",
      message: "パラメータタイプは必須です",
      code: "REQUIRED",
    });
    return errors;
  }

  if (
    parameter.paramType &&
    !Object.values(PARAMETER_TYPES).includes(parameter.paramType)
  ) {
    errors.push({
      field: "parameter.paramType",
      message: "無効なパラメータタイプです",
      code: "INVALID_VALUE",
    });
  }

  // パラメータタイプ別の検証
  switch (parameter.paramType) {
    case PARAMETER_TYPES.PERCENTAGE:
      if ("value" in parameter && "baseAccountId" in parameter) {
        if (typeof parameter.value !== "number") {
          errors.push({
            field: "parameter.value",
            message: "比率は数値を入力してください",
            code: "INVALID_TYPE",
          });
        } else if (parameter.value < 0 || parameter.value > 100) {
          errors.push({
            field: "parameter.value",
            message: "比率は0から100の間で入力してください",
            code: "INVALID_RANGE",
          });
        }
        if (!parameter.baseAccountId) {
          errors.push({
            field: "parameter.baseAccountId",
            message: "基準科目は必須です",
            code: "REQUIRED",
          });
        }
      } else {
        errors.push({
          field: "parameter",
          message: "比率パラメータには値と基準科目が必要です",
          code: "MISSING_FIELD",
        });
      }
      break;

    default:
      errors.push({
        field: "parameter.type",
        message: "サポートされていないパラメータタイプです",
        code: "UNSUPPORTED",
      });
  }

  return errors;
};

export const validateFormula = (formula: string): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!formula || formula.trim().length === 0) {
    errors.push({
      field: "formula",
      message: "計算式は必須です",
      code: "REQUIRED",
    });
    return errors;
  }

  if (formula.length > FORMULA_MAX_LENGTH) {
    errors.push({
      field: "formula",
      message: `計算式は${FORMULA_MAX_LENGTH}文字以内で入力してください`,
      code: "MAX_LENGTH",
    });
  }

  // 基本的な構文チェック
  const brackets = formula.match(/\[|\]/g);
  if (brackets) {
    const openBrackets = brackets.filter((b) => b === "[").length;
    const closeBrackets = brackets.filter((b) => b === "]").length;
    if (openBrackets !== closeBrackets) {
      errors.push({
        field: "formula",
        message: "計算式の括弧が対応していません",
        code: "SYNTAX_ERROR",
      });
    }
  }

  // 無効な文字の検出
  const invalidChars = formula.match(/[^a-zA-Z0-9_\-\+\*\/\(\)\[\]\s\.]/g);
  if (invalidChars) {
    errors.push({
      field: "formula",
      message: "計算式に無効な文字が含まれています",
      code: "INVALID_CHARACTERS",
    });
  }

  return errors;
};

export const validateSheetType = (sheet: SheetType): ValidationError | null => {
  if (!Object.values(SHEET_TYPES).includes(sheet)) {
    return {
      field: "sheet",
      message: "無効なシートタイプです",
      code: "INVALID_VALUE",
    };
  }
  return null;
};

export const validateDisplayOrder = (displayOrder: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!displayOrder || typeof displayOrder !== "object") {
    errors.push({
      field: "displayOrder",
      message: "表示順序は必須です",
      code: "REQUIRED",
    });
    return errors;
  }

  if (
    typeof displayOrder.sheetOrder !== "number" ||
    displayOrder.sheetOrder <= 0
  ) {
    errors.push({
      field: "displayOrder.sheetOrder",
      message: "シート順序は1以上の数値を入力してください",
      code: "INVALID_VALUE",
    });
  }

  if (
    typeof displayOrder.sectionOrder !== "number" ||
    displayOrder.sectionOrder <= 0
  ) {
    errors.push({
      field: "displayOrder.sectionOrder",
      message: "セクション順序は1以上の数値を入力してください",
      code: "INVALID_VALUE",
    });
  }

  if (
    typeof displayOrder.itemOrder !== "number" ||
    displayOrder.itemOrder <= 0
  ) {
    errors.push({
      field: "displayOrder.itemOrder",
      message: "項目順序は1以上の数値を入力してください",
      code: "INVALID_VALUE",
    });
  }

  return errors;
};

// 複数のアカウント間の整合性チェック
export const validateAccountConsistency = (
  accounts: Account[]
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const accountIds = new Set(accounts.map((acc) => acc.id));

  accounts.forEach((account) => {
    // 親アカウントの存在チェック
    if (account.parentId && !accountIds.has(account.parentId)) {
      errors.push({
        field: `account.${account.id}.parentId`,
        message: `親アカウント ${account.parentId} が存在しません`,
        code: "REFERENCE_NOT_FOUND",
      });
    }

    // TODO: パラメータの依存関係チェック - 新しい型システムに合わせて実装が必要
    // 現在はparameter.paramTypeを使用する設計だが、バリデーションロジックの更新が必要
    /*
    // パラメータの依存関係チェック
    if (account.parameter.paramType === PARAMETER_TYPES.PERCENTAGE) {
      // バリデーションロジック
    }
    */
  });

  return errors;
};
