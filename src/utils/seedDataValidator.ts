/**
 * シードデータ検証ユーティリティ
 * 既存のAccount型定義に基づいてデータの整合性を検証
 */

import type {
  Account,
  SheetType,
  Parameter,
  ParameterType,
  CfImpactType,
  FlowAccountCfImpact,
  DisplayOrder,
} from "../types/accountTypes";
import {
  SHEET_TYPES,
  CF_IMPACT_TYPES,
  PARAMETER_TYPES,
} from "../types/accountTypes";
import type { Period } from "../types/periodTypes";
import type { FinancialValue } from "../types/financialValueTypes";

// 検証結果の型定義（seedDataValidator専用）
export interface SeedValidationError {
  field: string;
  message: string;
  code: string;
  severity: "error" | "warning";
  value?: any; // 問題のある値を含める
}

export interface ValidationResult {
  isValid: boolean;
  errors: SeedValidationError[];
  warnings: SeedValidationError[];
}

export interface ParameterOverride {
  accountId: string;
  parameter: any;
}

// 型ガード関数
function isValidSheetType(value: any): value is SheetType {
  return Object.values(SHEET_TYPES).includes(value);
}

function isValidCfImpactType(value: any): value is CfImpactType {
  return Object.values(CF_IMPACT_TYPES).includes(value);
}

function isValidParameterType(value: any): value is ParameterType {
  return Object.values(PARAMETER_TYPES).includes(value);
}

// DisplayOrder検証
function validateDisplayOrder(
  displayOrder: any,
  context: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!displayOrder) {
    errors.push({
      field: "displayOrder",
      message: "DisplayOrderが必須です",
      code: "MISSING_DISPLAY_ORDER",
      severity: "error",
    });
    return errors;
  }

  if (
    typeof displayOrder.sheetOrder !== "number" ||
    displayOrder.sheetOrder < 0
  ) {
    errors.push({
      field: "displayOrder.sheetOrder",
      message: "sheetOrderは0以上の数値である必要があります",
      value: displayOrder.sheetOrder,
      code: "INVALID_SHEET_ORDER",
      severity: "error",
    });
  }

  if (
    typeof displayOrder.sectionOrder !== "number" ||
    displayOrder.sectionOrder < 0
  ) {
    errors.push({
      field: "displayOrder.sectionOrder",
      message: "sectionOrderは0以上の数値である必要があります",
      value: displayOrder.sectionOrder,
      code: "INVALID_SECTION_ORDER",
      severity: "error",
    });
  }

  if (
    typeof displayOrder.itemOrder !== "number" ||
    displayOrder.itemOrder < 0
  ) {
    errors.push({
      field: "displayOrder.itemOrder",
      message: "itemOrderは0以上の数値である必要があります",
      value: displayOrder.itemOrder,
      code: "INVALID_ITEM_ORDER",
      severity: "error",
    });
  }

  return errors;
}

// CfImpact検証
function validateCfImpact(cfImpact: any, context: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!cfImpact) {
    errors.push({
      field: "cfImpact",
      message: "CfImpactが必須です",
      code: "MISSING_CF_IMPACT",
      severity: "error",
    });
    return errors;
  }

  if (!isValidCfImpactType(cfImpact.type)) {
    errors.push({
      field: "cfImpact.type",
      message: `無効なCfImpactTypeです: ${cfImpact.type}`,
      value: cfImpact.type,
      code: "INVALID_CF_IMPACT_TYPE",
      severity: "error",
    });
  }

  if (cfImpact.targetAccountIds && !Array.isArray(cfImpact.targetAccountIds)) {
    errors.push({
      field: "cfImpact.targetAccountIds",
      message: "targetAccountIdsは配列である必要があります",
      value: cfImpact.targetAccountIds,
      code: "INVALID_TARGET_ACCOUNT_IDS",
      severity: "error",
    });
  }

  if (cfImpact.formula && typeof cfImpact.formula !== "string") {
    errors.push({
      field: "cfImpact.formula",
      message: "formulaは文字列である必要があります",
      value: cfImpact.formula,
      code: "INVALID_CF_IMPACT_FORMULA",
      severity: "error",
    });
  }

  return errors;
}

// Parameter検証
function validateParameter(
  parameter: any,
  context: string,
  accountIds?: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!parameter) {
    errors.push({
      field: "parameter",
      message: "Parameterが必須です",
      code: "MISSING_PARAMETER",
      severity: "error",
    });
    return errors;
  }

  if (!isValidParameterType(parameter.type)) {
    errors.push({
      field: "parameter.type",
      message: `無効なParameterTypeです: ${parameter.type}`,
      value: parameter.type,
      code: "INVALID_PARAMETER_TYPE",
      severity: "error",
    });
    return errors;
  }

  // 型別の検証
  switch (parameter.type) {
    case PARAMETER_TYPES.CONSTANT:
      if (typeof parameter.value !== "number") {
        errors.push({
          field: "parameter.value",
          message: "ConstantParameterのvalueは数値である必要があります",
          value: parameter.value,
          code: "INVALID_CONSTANT_VALUE",
          severity: "error",
        });
      }
      break;

    case PARAMETER_TYPES.PERCENTAGE:
      if (typeof parameter.value !== "number") {
        errors.push({
          field: "parameter.value",
          message: "PercentageParameterのvalueは数値である必要があります",
          value: parameter.value,
          code: "INVALID_PERCENTAGE_VALUE",
          severity: "error",
        });
      } else if (parameter.value < 0 || parameter.value > 100) {
        warnings.push({
          field: "parameter.value",
          message: "PercentageParameterのvalueは通常0-100の範囲です",
          value: parameter.value,
          code: "PERCENTAGE_VALUE_OUT_OF_RANGE",
          severity: "warning",
        });
      }
      if (!parameter.baseAccountId) {
        errors.push({
          field: "parameter.baseAccountId",
          message: "PercentageParameterのbaseAccountIdが必須です",
          code: "MISSING_PERCENTAGE_BASE_ACCOUNT_ID",
          severity: "error",
        });
      } else if (accountIds && !accountIds.includes(parameter.baseAccountId)) {
        errors.push({
          field: "parameter.baseAccountId",
          message: `参照先アカウントが存在しません: ${parameter.baseAccountId}`,
          value: parameter.baseAccountId,
          code: "REFERENCE_ACCOUNT_NOT_FOUND",
          severity: "error",
        });
      }
      break;

    case PARAMETER_TYPES.PERCENTAGE_OF_REVENUE:
      if (typeof parameter.value !== "number") {
        errors.push({
          field: "parameter.value",
          message:
            "PercentageOfRevenueParameterのvalueは数値である必要があります",
          value: parameter.value,
          code: "INVALID_PERCENTAGE_OF_REVENUE_VALUE",
          severity: "error",
        });
      } else if (parameter.value < 0 || parameter.value > 100) {
        warnings.push({
          field: "parameter.value",
          message: "PercentageOfRevenueParameterのvalueは通常0-100の範囲です",
          value: parameter.value,
          code: "PERCENTAGE_OF_REVENUE_VALUE_OUT_OF_RANGE",
          severity: "warning",
        });
      }
      break;

    case PARAMETER_TYPES.DAYS:
      if (typeof parameter.days !== "number") {
        errors.push({
          field: "parameter.days",
          message: "DaysParameterのdaysは数値である必要があります",
          value: parameter.days,
          code: "INVALID_DAYS_VALUE",
          severity: "error",
        });
      } else if (parameter.days < 0 || parameter.days > 365) {
        warnings.push({
          field: "parameter.days",
          message: "DaysParameterのdaysは通常0-365の範囲です",
          value: parameter.days,
          code: "DAYS_VALUE_OUT_OF_RANGE",
          severity: "warning",
        });
      }
      if (!parameter.baseAccountId) {
        errors.push({
          field: "parameter.baseAccountId",
          message: "DaysParameterのbaseAccountIdが必須です",
          code: "MISSING_DAYS_BASE_ACCOUNT_ID",
          severity: "error",
        });
      } else if (accountIds && !accountIds.includes(parameter.baseAccountId)) {
        errors.push({
          field: "parameter.baseAccountId",
          message: `参照先アカウントが存在しません: ${parameter.baseAccountId}`,
          value: parameter.baseAccountId,
          code: "REFERENCE_ACCOUNT_NOT_FOUND",
          severity: "error",
        });
      }
      break;

    case PARAMETER_TYPES.MANUAL_INPUT:
      if (
        parameter.defaultValue !== undefined &&
        typeof parameter.defaultValue !== "number"
      ) {
        errors.push({
          field: "parameter.defaultValue",
          message:
            "ManualInputParameterのdefaultValueは数値である必要があります",
          value: parameter.defaultValue,
          code: "INVALID_MANUAL_INPUT_DEFAULT_VALUE",
          severity: "error",
        });
      }
      break;

    case PARAMETER_TYPES.FORMULA:
      if (!parameter.formula || typeof parameter.formula !== "string") {
        errors.push({
          field: "parameter.formula",
          message: "FormulaParameterのformulaは文字列で必須です",
          value: parameter.formula,
          code: "MISSING_FORMULA_PARAMETER_FORMULA",
          severity: "error",
        });
      }
      if (!parameter.dependencies || !Array.isArray(parameter.dependencies)) {
        errors.push({
          field: "parameter.dependencies",
          message: "FormulaParameterのdependenciesは配列で必須です",
          value: parameter.dependencies,
          code: "MISSING_FORMULA_PARAMETER_DEPENDENCIES",
          severity: "error",
        });
      } else if (accountIds) {
        parameter.dependencies.forEach((dep: any) => {
          if (!accountIds.includes(dep)) {
            errors.push({
              field: "parameter.dependencies",
              message: `依存先アカウントが存在しません: ${dep}`,
              value: dep,
              code: "REFERENCE_ACCOUNT_NOT_FOUND",
              severity: "error",
            });
          }
        });
      }
      break;
  }

  return [...errors, ...warnings];
}

// Account検証
export function validateAccount(
  account: any,
  index: number,
  allAccountIds?: string[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const context = `Account[${index}] (${account.id || "unknown"})`;

  // 必須フィールドのチェック
  if (!account.id || typeof account.id !== "string") {
    errors.push({
      field: "id",
      message: "idは必須の文字列フィールドです",
      value: account.id,
      code: "MISSING_ACCOUNT_ID",
      severity: "error",
    });
  }

  if (!account.accountName || typeof account.accountName !== "string") {
    errors.push({
      field: "accountName",
      message: "accountNameは必須の文字列フィールドです",
      value: account.accountName,
      code: "MISSING_ACCOUNT_NAME",
      severity: "error",
    });
  }

  if (account.parentId !== null && typeof account.parentId !== "string") {
    errors.push({
      field: "parentId",
      message: "parentIdはnullまたは文字列である必要があります",
      value: account.parentId,
      code: "INVALID_PARENT_ID",
      severity: "error",
    });
  } else if (
    account.parentId &&
    allAccountIds &&
    !allAccountIds.includes(account.parentId)
  ) {
    errors.push({
      field: "parentId",
      message: `親アカウントが存在しません: ${account.parentId}`,
      value: account.parentId,
      code: "REFERENCE_ACCOUNT_NOT_FOUND",
      severity: "error",
    });
  }

  if (!isValidSheetType(account.sheet)) {
    errors.push({
      field: "sheet",
      message: `無効なSheetTypeです: ${account.sheet}`,
      value: account.sheet,
      code: "INVALID_SHEET_TYPE",
      severity: "error",
    });
  }

  if (account.isCredit !== null && typeof account.isCredit !== "boolean") {
    errors.push({
      field: "isCredit",
      message: "isCreditはnullまたはbooleanである必要があります",
      value: account.isCredit,
      code: "INVALID_IS_CREDIT",
      severity: "error",
    });
  }

  // DisplayOrderの検証
  errors.push(...validateDisplayOrder(account.displayOrder, context));

  // Parameterの検証
  const paramErrors = validateParameter(
    account.parameter,
    context,
    allAccountIds
  );
  errors.push(...paramErrors.filter((e) => e.severity === "error"));
  warnings.push(...paramErrors.filter((e) => e.severity === "warning"));

  // CfImpactの検証
  errors.push(...validateCfImpact(account.flowAccountCfImpact, context));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Period検証
export function validatePeriod(period: any, index: number): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const context = `Period[${index}] (${period.id || "unknown"})`;

  if (!period.id || typeof period.id !== "string") {
    errors.push({
      field: "id",
      message: "idは必須の文字列フィールドです",
      value: period.id,
      code: "MISSING_PERIOD_ID",
      severity: "error",
    });
  }

  if (
    typeof period.year !== "number" ||
    period.year < 1900 ||
    period.year > 2100
  ) {
    errors.push({
      field: "year",
      message: "yearは1900-2100の範囲の数値である必要があります",
      value: period.year,
      code: "INVALID_YEAR",
      severity: "error",
    });
  }

  if (
    typeof period.month !== "number" ||
    period.month < 1 ||
    period.month > 12
  ) {
    errors.push({
      field: "month",
      message: "monthは1-12の範囲の数値である必要があります",
      value: period.month,
      code: "INVALID_MONTH",
      severity: "error",
    });
  }

  if (!period.name || typeof period.name !== "string") {
    errors.push({
      field: "name",
      message: "nameは必須の文字列フィールドです",
      value: period.name,
      code: "MISSING_PERIOD_NAME",
      severity: "error",
    });
  }

  if (typeof period.isForecast !== "boolean") {
    errors.push({
      field: "isForecast",
      message: "isForecastはbooleanである必要があります",
      value: period.isForecast,
      code: "INVALID_IS_FORECAST",
      severity: "error",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// FinancialValue検証
export function validateFinancialValue(
  value: any,
  index: number,
  accountIds?: string[],
  periodIds?: string[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const context = `FinancialValue[${index}] (${value.accountId || "unknown"}/${
    value.periodId || "unknown"
  })`;

  if (!value.accountId || typeof value.accountId !== "string") {
    errors.push({
      field: "accountId",
      message: "accountIdは必須の文字列フィールドです",
      value: value.accountId,
      code: "MISSING_FINANCIAL_VALUE_ACCOUNT_ID",
      severity: "error",
    });
  } else if (accountIds && !accountIds.includes(value.accountId)) {
    errors.push({
      field: "accountId",
      message: `アカウントが存在しません: ${value.accountId}`,
      value: value.accountId,
      code: "REFERENCE_ACCOUNT_NOT_FOUND",
      severity: "error",
    });
  }

  if (!value.periodId || typeof value.periodId !== "string") {
    errors.push({
      field: "periodId",
      message: "periodIdは必須の文字列フィールドです",
      value: value.periodId,
      code: "MISSING_FINANCIAL_VALUE_PERIOD_ID",
      severity: "error",
    });
  } else if (periodIds && !periodIds.includes(value.periodId)) {
    errors.push({
      field: "periodId",
      message: `期間が存在しません: ${value.periodId}`,
      value: value.periodId,
      code: "REFERENCE_PERIOD_NOT_FOUND",
      severity: "error",
    });
  }

  if (typeof value.value !== "number") {
    errors.push({
      field: "value",
      message: "valueは数値である必要があります",
      value: value.value,
      code: "INVALID_FINANCIAL_VALUE_VALUE",
      severity: "error",
    });
  }

  if (typeof value.isCalculated !== "boolean") {
    errors.push({
      field: "isCalculated",
      message: "isCalculatedはbooleanである必要があります",
      value: value.isCalculated,
      code: "INVALID_FINANCIAL_VALUE_IS_CALCULATED",
      severity: "error",
    });
  }

  if (value.formula !== undefined && typeof value.formula !== "string") {
    errors.push({
      field: "formula",
      message: "formulaは文字列である必要があります",
      value: value.formula,
      code: "INVALID_FINANCIAL_VALUE_FORMULA",
      severity: "error",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// 参照整合性のチェック
export function validateReferentialIntegrity(
  accounts: any[],
  periods: any[],
  financialValues: any[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const accountIds = new Set(accounts.map((a) => a.id));
  const periodIds = new Set(periods.map((p) => p.id));

  // 親子関係の循環参照チェック
  const checkCircularReference = (
    accountId: string,
    visited = new Set<string>()
  ): boolean => {
    if (visited.has(accountId)) return true;
    visited.add(accountId);

    const account = accounts.find((a) => a.id === accountId);
    if (!account || !account.parentId) return false;

    return checkCircularReference(account.parentId, visited);
  };

  accounts.forEach((account, index) => {
    if (checkCircularReference(account.id)) {
      errors.push({
        field: "parentId",
        message: "親子関係に循環参照が存在します",
        value: account.id,
        code: "CIRCULAR_PARENT_REFERENCE",
        severity: "error",
      });
    }
  });

  // displayOrderの重複チェック
  const displayOrderMap = new Map<string, string[]>();
  accounts.forEach((account) => {
    const key = `${account.sheet}-${account.displayOrder.sheetOrder}-${account.displayOrder.sectionOrder}-${account.displayOrder.itemOrder}`;
    if (!displayOrderMap.has(key)) {
      displayOrderMap.set(key, []);
    }
    displayOrderMap.get(key)!.push(account.id);
  });

  displayOrderMap.forEach((accountIds, key) => {
    if (accountIds.length > 1) {
      warnings.push({
        field: "displayOrder",
        message: `同じdisplayOrderを持つアカウントが複数存在します: ${accountIds.join(
          ", "
        )}`,
        value: key,
        code: "DUPLICATE_DISPLAY_ORDER",
        severity: "warning",
      });
    }
  });

  // FinancialValueの重複チェック
  const valueMap = new Map<string, number>();
  financialValues.forEach((value, index) => {
    const key = `${value.accountId}-${value.periodId}`;
    if (valueMap.has(key)) {
      errors.push({
        field: "accountId/periodId",
        message: `同じアカウント・期間の組み合わせが複数存在します`,
        value: key,
        code: "DUPLICATE_FINANCIAL_VALUE",
        severity: "error",
      });
    }
    valueMap.set(key, index);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ビジネスルール検証
export function validateBusinessRules(
  accounts: any[],
  periods: any[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // PL科目は必ずisCreditが設定されているべき
  accounts.forEach((account, index) => {
    if (account.sheet === SHEET_TYPES.PL && account.isCredit === null) {
      warnings.push({
        field: "isCredit",
        message: "PL科目はisCreditを設定することを推奨します",
        value: account.id,
        code: "RECOMMEND_IS_CREDIT_FOR_PL",
        severity: "warning",
      });
    }
  });

  // 売上高アカウントの存在チェック
  const revenueAccount = accounts.find(
    (a) => a.id === "revenue-sales" || a.accountName === "売上高"
  );
  if (!revenueAccount) {
    warnings.push({
      field: "accounts",
      message:
        "売上高アカウントが見つかりません。PercentageOfRevenueパラメータを使用する場合は必要です",
      code: "MISSING_REVENUE_ACCOUNT",
      severity: "warning",
    });
  }

  // 期間の連続性チェック
  const sortedPeriods = [...periods].sort((a, b) => {
    const dateA = a.year * 12 + a.month;
    const dateB = b.year * 12 + b.month;
    return dateA - dateB;
  });

  for (let i = 1; i < sortedPeriods.length; i++) {
    const prev = sortedPeriods[i - 1];
    const curr = sortedPeriods[i];
    const prevMonths = prev.year * 12 + prev.month;
    const currMonths = curr.year * 12 + curr.month;

    if (currMonths - prevMonths !== 1) {
      warnings.push({
        field: "periods",
        message: `期間に連続性がありません: ${prev.name} と ${curr.name}`,
        code: "NON_CONTINUOUS_PERIODS",
        severity: "warning",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// 包括的な検証クラス
export class SeedDataValidator {
  private accounts: any[] = [];
  private periods: any[] = [];
  private financialValues: any[] = [];
  private validationResults: Map<string, ValidationResult> = new Map();

  constructor() {}

  setAccounts(accounts: any[]): this {
    this.accounts = accounts;
    return this;
  }

  setPeriods(periods: any[]): this {
    this.periods = periods;
    return this;
  }

  setFinancialValues(financialValues: any[]): this {
    this.financialValues = financialValues;
    return this;
  }

  validate(): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];

    // アカウントIDの収集
    const accountIds = this.accounts.map((a) => a.id).filter((id) => id);
    const periodIds = this.periods.map((p) => p.id).filter((id) => id);

    // 個別検証
    console.log("=== アカウント検証 ===");
    this.accounts.forEach((account, index) => {
      const result = validateAccount(account, index, accountIds);
      this.validationResults.set(`account-${index}`, result);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);

      if (!result.isValid) {
        console.error(
          `Account[${index}] (${account.id}): ${result.errors.length} errors`
        );
        result.errors.forEach((e) =>
          console.error(`  - ${e.field}: ${e.message}`)
        );
      }
    });

    console.log("\n=== 期間検証 ===");
    this.periods.forEach((period, index) => {
      const result = validatePeriod(period, index);
      this.validationResults.set(`period-${index}`, result);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);

      if (!result.isValid) {
        console.error(
          `Period[${index}] (${period.id}): ${result.errors.length} errors`
        );
        result.errors.forEach((e) =>
          console.error(`  - ${e.field}: ${e.message}`)
        );
      }
    });

    console.log("\n=== 財務値検証 ===");
    this.financialValues.forEach((value, index) => {
      const result = validateFinancialValue(
        value,
        index,
        accountIds,
        periodIds
      );
      this.validationResults.set(`financialValue-${index}`, result);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);

      if (!result.isValid) {
        console.error(
          `FinancialValue[${index}]: ${result.errors.length} errors`
        );
        result.errors.forEach((e) =>
          console.error(`  - ${e.field}: ${e.message}`)
        );
      }
    });

    // 参照整合性検証
    console.log("\n=== 参照整合性検証 ===");
    const integrityResult = validateReferentialIntegrity(
      this.accounts,
      this.periods,
      this.financialValues
    );
    this.validationResults.set("referentialIntegrity", integrityResult);
    allErrors.push(...integrityResult.errors);
    allWarnings.push(...integrityResult.warnings);

    // ビジネスルール検証
    console.log("\n=== ビジネスルール検証 ===");
    const businessResult = validateBusinessRules(this.accounts, this.periods);
    this.validationResults.set("businessRules", businessResult);
    allErrors.push(...businessResult.errors);
    allWarnings.push(...businessResult.warnings);

    // サマリー出力
    console.log("\n=== 検証結果サマリー ===");
    console.log(`総エラー数: ${allErrors.length}`);
    console.log(`総警告数: ${allWarnings.length}`);
    console.log(`検証済みアカウント数: ${this.accounts.length}`);
    console.log(`検証済み期間数: ${this.periods.length}`);
    console.log(`検証済み財務値数: ${this.financialValues.length}`);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  getDetailedReport(): string {
    const lines: string[] = ["# シードデータ検証レポート\n"];

    lines.push("## 概要");
    lines.push(`- 検証日時: ${new Date().toISOString()}`);
    lines.push(`- アカウント数: ${this.accounts.length}`);
    lines.push(`- 期間数: ${this.periods.length}`);
    lines.push(`- 財務値数: ${this.financialValues.length}\n`);

    let totalErrors = 0;
    let totalWarnings = 0;

    this.validationResults.forEach((result, key) => {
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
    });

    lines.push("## 検証結果サマリー");
    lines.push(`- 総エラー数: ${totalErrors}`);
    lines.push(`- 総警告数: ${totalWarnings}`);
    lines.push(
      `- 検証ステータス: ${totalErrors === 0 ? "✅ PASS" : "❌ FAIL"}\n`
    );

    if (totalErrors > 0) {
      lines.push("## エラー詳細");
      this.validationResults.forEach((result, key) => {
        if (result.errors.length > 0) {
          lines.push(`\n### ${key}`);
          result.errors.forEach((error) => {
            lines.push(`- **${error.field}**: ${error.message}`);
            if (error.value !== undefined) {
              lines.push(`  - 値: \`${JSON.stringify(error.value)}\``);
            }
          });
        }
      });
    }

    if (totalWarnings > 0) {
      lines.push("\n## 警告詳細");
      this.validationResults.forEach((result, key) => {
        if (result.warnings.length > 0) {
          lines.push(`\n### ${key}`);
          result.warnings.forEach((warning) => {
            lines.push(`- **${warning.field}**: ${warning.message}`);
            if (warning.value !== undefined) {
              lines.push(`  - 値: \`${JSON.stringify(warning.value)}\``);
            }
          });
        }
      });
    }

    return lines.join("\n");
  }
}

// 使用例のエクスポート
export function exampleUsage(): void {
  console.log("=== SeedDataValidator 使用例 ===\n");

  // サンプルデータの作成
  const sampleAccount: Account = {
    id: "revenue-sales",
    accountName: "売上高",
    parentId: null,
    sheet: SHEET_TYPES.PL,
    isCredit: true,
    displayOrder: {
      sheetOrder: 1,
      sectionOrder: 1,
      itemOrder: 1,
    },
    parameter: {
      type: PARAMETER_TYPES.MANUAL_INPUT,
      defaultValue: 1000000,
    },
    cfImpact: {
      type: CF_IMPACT_TYPES.IS_BASE_PROFIT,
    },
  };

  const samplePeriod: Period = {
    id: "2024-01",
    name: "2024年1月",
    year: 2024,
    month: 1,
    financialYear: 2024,
    isAnnual: false,
    isForecast: true,
    sequence: 1,
  };

  const sampleFinancialValue: FinancialValue = {
    accountId: "revenue-sales",
    periodId: "2024-01",
    value: 1000000,
    isCalculated: false,
  };

  // 検証実行
  const validator = new SeedDataValidator()
    .setAccounts([sampleAccount])
    .setPeriods([samplePeriod])
    .setFinancialValues([sampleFinancialValue]);

  const result = validator.validate();
  console.log("\n検証結果:", result.isValid ? "✅ 有効" : "❌ 無効");

  // 詳細レポートの生成
  const report = validator.getDetailedReport();
  console.log("\n詳細レポート:\n", report);
}
