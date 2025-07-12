/**
 * シードデータ検証ユーティリティ
 * 既存のAccount型定義に基づいてデータの整合性を検証
 */

import type {
  Account,
  SheetType,
  CfImpact,
  DisplayOrder,
  FinancialValue
} from '../types/account';
import type { Parameter } from '../types/parameter';
import type { Period } from '../types/newFinancialTypes';
import {
  SHEET_TYPES,
  CF_IMPACT_TYPES,
  PARAMETER_TYPES,
  isConstantParameter,
  isPercentageParameter,
  isPercentageOfRevenueParameter,
  isDaysParameter,
  isManualInputParameter,
  isFormulaParameter
} from '../types/newFinancialTypes';

// 検証エラーの型定義
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  context?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// 型ガード関数
function isValidSheetType(value: any): value is SheetType {
  return Object.values(SHEET_TYPES).includes(value);
}

function isValidCfImpactType(value: any): value is CfImpact['type'] {
  return Object.values(CF_IMPACT_TYPES).includes(value);
}

function isValidParameterType(value: any): value is Parameter['type'] {
  return Object.values(PARAMETER_TYPES).includes(value);
}

// DisplayOrder検証
function validateDisplayOrder(displayOrder: any, context: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!displayOrder) {
    errors.push({
      field: 'displayOrder',
      message: 'DisplayOrderが必須です',
      context
    });
    return errors;
  }

  if (typeof displayOrder.sheetOrder !== 'number' || displayOrder.sheetOrder < 0) {
    errors.push({
      field: 'displayOrder.sheetOrder',
      message: 'sheetOrderは0以上の数値である必要があります',
      value: displayOrder.sheetOrder,
      context
    });
  }

  if (typeof displayOrder.sectionOrder !== 'number' || displayOrder.sectionOrder < 0) {
    errors.push({
      field: 'displayOrder.sectionOrder',
      message: 'sectionOrderは0以上の数値である必要があります',
      value: displayOrder.sectionOrder,
      context
    });
  }

  if (typeof displayOrder.itemOrder !== 'number' || displayOrder.itemOrder < 0) {
    errors.push({
      field: 'displayOrder.itemOrder',
      message: 'itemOrderは0以上の数値である必要があります',
      value: displayOrder.itemOrder,
      context
    });
  }

  return errors;
}

// CfImpact検証
function validateCfImpact(cfImpact: any, context: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!cfImpact) {
    errors.push({
      field: 'cfImpact',
      message: 'CfImpactが必須です',
      context
    });
    return errors;
  }

  if (!isValidCfImpactType(cfImpact.type)) {
    errors.push({
      field: 'cfImpact.type',
      message: `無効なCfImpactTypeです: ${cfImpact.type}`,
      value: cfImpact.type,
      context
    });
  }

  if (cfImpact.targetAccountIds && !Array.isArray(cfImpact.targetAccountIds)) {
    errors.push({
      field: 'cfImpact.targetAccountIds',
      message: 'targetAccountIdsは配列である必要があります',
      value: cfImpact.targetAccountIds,
      context
    });
  }

  if (cfImpact.formula && typeof cfImpact.formula !== 'string') {
    errors.push({
      field: 'cfImpact.formula',
      message: 'formulaは文字列である必要があります',
      value: cfImpact.formula,
      context
    });
  }

  return errors;
}

// Parameter検証
function validateParameter(parameter: any, context: string, accountIds?: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!parameter) {
    errors.push({
      field: 'parameter',
      message: 'Parameterが必須です',
      context
    });
    return errors;
  }

  if (!isValidParameterType(parameter.type)) {
    errors.push({
      field: 'parameter.type',
      message: `無効なParameterTypeです: ${parameter.type}`,
      value: parameter.type,
      context
    });
    return errors;
  }

  // 型別の検証
  switch (parameter.type) {
    case PARAMETER_TYPES.CONSTANT:
      if (typeof parameter.value !== 'number') {
        errors.push({
          field: 'parameter.value',
          message: 'ConstantParameterのvalueは数値である必要があります',
          value: parameter.value,
          context
        });
      }
      break;

    case PARAMETER_TYPES.PERCENTAGE:
      if (typeof parameter.value !== 'number') {
        errors.push({
          field: 'parameter.value',
          message: 'PercentageParameterのvalueは数値である必要があります',
          value: parameter.value,
          context
        });
      } else if (parameter.value < 0 || parameter.value > 100) {
        warnings.push({
          field: 'parameter.value',
          message: 'PercentageParameterのvalueは通常0-100の範囲です',
          value: parameter.value,
          context
        });
      }
      if (!parameter.baseAccountId) {
        errors.push({
          field: 'parameter.baseAccountId',
          message: 'PercentageParameterのbaseAccountIdが必須です',
          context
        });
      } else if (accountIds && !accountIds.includes(parameter.baseAccountId)) {
        errors.push({
          field: 'parameter.baseAccountId',
          message: `参照先アカウントが存在しません: ${parameter.baseAccountId}`,
          value: parameter.baseAccountId,
          context
        });
      }
      break;

    case PARAMETER_TYPES.PERCENTAGE_OF_REVENUE:
      if (typeof parameter.value !== 'number') {
        errors.push({
          field: 'parameter.value',
          message: 'PercentageOfRevenueParameterのvalueは数値である必要があります',
          value: parameter.value,
          context
        });
      } else if (parameter.value < 0 || parameter.value > 100) {
        warnings.push({
          field: 'parameter.value',
          message: 'PercentageOfRevenueParameterのvalueは通常0-100の範囲です',
          value: parameter.value,
          context
        });
      }
      break;

    case PARAMETER_TYPES.DAYS:
      if (typeof parameter.days !== 'number') {
        errors.push({
          field: 'parameter.days',
          message: 'DaysParameterのdaysは数値である必要があります',
          value: parameter.days,
          context
        });
      } else if (parameter.days < 0 || parameter.days > 365) {
        warnings.push({
          field: 'parameter.days',
          message: 'DaysParameterのdaysは通常0-365の範囲です',
          value: parameter.days,
          context
        });
      }
      if (!parameter.baseAccountId) {
        errors.push({
          field: 'parameter.baseAccountId',
          message: 'DaysParameterのbaseAccountIdが必須です',
          context
        });
      } else if (accountIds && !accountIds.includes(parameter.baseAccountId)) {
        errors.push({
          field: 'parameter.baseAccountId',
          message: `参照先アカウントが存在しません: ${parameter.baseAccountId}`,
          value: parameter.baseAccountId,
          context
        });
      }
      break;

    case PARAMETER_TYPES.MANUAL_INPUT:
      if (parameter.defaultValue !== undefined && typeof parameter.defaultValue !== 'number') {
        errors.push({
          field: 'parameter.defaultValue',
          message: 'ManualInputParameterのdefaultValueは数値である必要があります',
          value: parameter.defaultValue,
          context
        });
      }
      break;

    case PARAMETER_TYPES.FORMULA:
      if (!parameter.formula || typeof parameter.formula !== 'string') {
        errors.push({
          field: 'parameter.formula',
          message: 'FormulaParameterのformulaは文字列で必須です',
          value: parameter.formula,
          context
        });
      }
      if (!parameter.dependencies || !Array.isArray(parameter.dependencies)) {
        errors.push({
          field: 'parameter.dependencies',
          message: 'FormulaParameterのdependenciesは配列で必須です',
          value: parameter.dependencies,
          context
        });
      } else if (accountIds) {
        parameter.dependencies.forEach((dep: any) => {
          if (!accountIds.includes(dep)) {
            errors.push({
              field: 'parameter.dependencies',
              message: `依存先アカウントが存在しません: ${dep}`,
              value: dep,
              context
            });
          }
        });
      }
      break;
  }

  return [...errors, ...warnings];
}

// Account検証
export function validateAccount(account: any, index: number, allAccountIds?: string[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const context = `Account[${index}] (${account.id || 'unknown'})`;

  // 必須フィールドのチェック
  if (!account.id || typeof account.id !== 'string') {
    errors.push({
      field: 'id',
      message: 'idは必須の文字列フィールドです',
      value: account.id,
      context
    });
  }

  if (!account.accountName || typeof account.accountName !== 'string') {
    errors.push({
      field: 'accountName',
      message: 'accountNameは必須の文字列フィールドです',
      value: account.accountName,
      context
    });
  }

  if (account.parentId !== null && typeof account.parentId !== 'string') {
    errors.push({
      field: 'parentId',
      message: 'parentIdはnullまたは文字列である必要があります',
      value: account.parentId,
      context
    });
  } else if (account.parentId && allAccountIds && !allAccountIds.includes(account.parentId)) {
    errors.push({
      field: 'parentId',
      message: `親アカウントが存在しません: ${account.parentId}`,
      value: account.parentId,
      context
    });
  }

  if (!isValidSheetType(account.sheet)) {
    errors.push({
      field: 'sheet',
      message: `無効なSheetTypeです: ${account.sheet}`,
      value: account.sheet,
      context
    });
  }

  if (account.isCredit !== null && typeof account.isCredit !== 'boolean') {
    errors.push({
      field: 'isCredit',
      message: 'isCreditはnullまたはbooleanである必要があります',
      value: account.isCredit,
      context
    });
  }

  // DisplayOrderの検証
  errors.push(...validateDisplayOrder(account.displayOrder, context));

  // Parameterの検証
  const paramErrors = validateParameter(account.parameter, context, allAccountIds);
  errors.push(...paramErrors.filter(e => !e.message.includes('通常')));
  warnings.push(...paramErrors.filter(e => e.message.includes('通常')));

  // CfImpactの検証
  errors.push(...validateCfImpact(account.cfImpact, context));

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Period検証
export function validatePeriod(period: any, index: number): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const context = `Period[${index}] (${period.id || 'unknown'})`;

  if (!period.id || typeof period.id !== 'string') {
    errors.push({
      field: 'id',
      message: 'idは必須の文字列フィールドです',
      value: period.id,
      context
    });
  }

  if (typeof period.year !== 'number' || period.year < 1900 || period.year > 2100) {
    errors.push({
      field: 'year',
      message: 'yearは1900-2100の範囲の数値である必要があります',
      value: period.year,
      context
    });
  }

  if (typeof period.month !== 'number' || period.month < 1 || period.month > 12) {
    errors.push({
      field: 'month',
      message: 'monthは1-12の範囲の数値である必要があります',
      value: period.month,
      context
    });
  }

  if (!period.displayName || typeof period.displayName !== 'string') {
    errors.push({
      field: 'displayName',
      message: 'displayNameは必須の文字列フィールドです',
      value: period.displayName,
      context
    });
  }

  if (typeof period.isHistorical !== 'boolean') {
    errors.push({
      field: 'isHistorical',
      message: 'isHistoricalはbooleanである必要があります',
      value: period.isHistorical,
      context
    });
  }

  if (typeof period.isForecast !== 'boolean') {
    errors.push({
      field: 'isForecast',
      message: 'isForecastはbooleanである必要があります',
      value: period.isForecast,
      context
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// FinancialValue検証
export function validateFinancialValue(value: any, index: number, accountIds?: string[], periodIds?: string[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const context = `FinancialValue[${index}] (${value.accountId || 'unknown'}/${value.periodId || 'unknown'})`;

  if (!value.accountId || typeof value.accountId !== 'string') {
    errors.push({
      field: 'accountId',
      message: 'accountIdは必須の文字列フィールドです',
      value: value.accountId,
      context
    });
  } else if (accountIds && !accountIds.includes(value.accountId)) {
    errors.push({
      field: 'accountId',
      message: `アカウントが存在しません: ${value.accountId}`,
      value: value.accountId,
      context
    });
  }

  if (!value.periodId || typeof value.periodId !== 'string') {
    errors.push({
      field: 'periodId',
      message: 'periodIdは必須の文字列フィールドです',
      value: value.periodId,
      context
    });
  } else if (periodIds && !periodIds.includes(value.periodId)) {
    errors.push({
      field: 'periodId',
      message: `期間が存在しません: ${value.periodId}`,
      value: value.periodId,
      context
    });
  }

  if (typeof value.value !== 'number') {
    errors.push({
      field: 'value',
      message: 'valueは数値である必要があります',
      value: value.value,
      context
    });
  }

  if (typeof value.isManualInput !== 'boolean') {
    errors.push({
      field: 'isManualInput',
      message: 'isManualInputはbooleanである必要があります',
      value: value.isManualInput,
      context
    });
  }

  if (value.formula !== undefined && typeof value.formula !== 'string') {
    errors.push({
      field: 'formula',
      message: 'formulaは文字列である必要があります',
      value: value.formula,
      context
    });
  }

  if (!value.lastUpdated || !(value.lastUpdated instanceof Date || typeof value.lastUpdated === 'string')) {
    errors.push({
      field: 'lastUpdated',
      message: 'lastUpdatedは日付である必要があります',
      value: value.lastUpdated,
      context
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// 参照整合性のチェック
export function validateReferentialIntegrity(accounts: any[], periods: any[], financialValues: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const accountIds = new Set(accounts.map(a => a.id));
  const periodIds = new Set(periods.map(p => p.id));

  // 親子関係の循環参照チェック
  const checkCircularReference = (accountId: string, visited = new Set<string>()): boolean => {
    if (visited.has(accountId)) return true;
    visited.add(accountId);
    
    const account = accounts.find(a => a.id === accountId);
    if (!account || !account.parentId) return false;
    
    return checkCircularReference(account.parentId, visited);
  };

  accounts.forEach((account, index) => {
    if (checkCircularReference(account.id)) {
      errors.push({
        field: 'parentId',
        message: '親子関係に循環参照が存在します',
        value: account.id,
        context: `Account[${index}] (${account.id})`
      });
    }
  });

  // displayOrderの重複チェック
  const displayOrderMap = new Map<string, string[]>();
  accounts.forEach(account => {
    const key = `${account.sheet}-${account.displayOrder.sheetOrder}-${account.displayOrder.sectionOrder}-${account.displayOrder.itemOrder}`;
    if (!displayOrderMap.has(key)) {
      displayOrderMap.set(key, []);
    }
    displayOrderMap.get(key)!.push(account.id);
  });

  displayOrderMap.forEach((accountIds, key) => {
    if (accountIds.length > 1) {
      warnings.push({
        field: 'displayOrder',
        message: `同じdisplayOrderを持つアカウントが複数存在します: ${accountIds.join(', ')}`,
        value: key,
        context: 'ReferentialIntegrity'
      });
    }
  });

  // FinancialValueの重複チェック
  const valueMap = new Map<string, number>();
  financialValues.forEach((value, index) => {
    const key = `${value.accountId}-${value.periodId}`;
    if (valueMap.has(key)) {
      errors.push({
        field: 'accountId/periodId',
        message: `同じアカウント・期間の組み合わせが複数存在します`,
        value: key,
        context: `FinancialValue[${index}]`
      });
    }
    valueMap.set(key, index);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ビジネスルール検証
export function validateBusinessRules(accounts: any[], periods: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // PL科目は必ずisCreditが設定されているべき
  accounts.forEach((account, index) => {
    if (account.sheet === SHEET_TYPES.PL && account.isCredit === null) {
      warnings.push({
        field: 'isCredit',
        message: 'PL科目はisCreditを設定することを推奨します',
        value: account.id,
        context: `Account[${index}] (${account.id})`
      });
    }
  });

  // 売上高アカウントの存在チェック
  const revenueAccount = accounts.find(a => a.id === 'revenue-sales' || a.accountName === '売上高');
  if (!revenueAccount) {
    warnings.push({
      field: 'accounts',
      message: '売上高アカウントが見つかりません。PercentageOfRevenueパラメータを使用する場合は必要です',
      context: 'BusinessRules'
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
        field: 'periods',
        message: `期間に連続性がありません: ${prev.displayName} と ${curr.displayName}`,
        context: 'BusinessRules'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
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
    const accountIds = this.accounts.map(a => a.id).filter(id => id);
    const periodIds = this.periods.map(p => p.id).filter(id => id);

    // 個別検証
    console.log('=== アカウント検証 ===');
    this.accounts.forEach((account, index) => {
      const result = validateAccount(account, index, accountIds);
      this.validationResults.set(`account-${index}`, result);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      
      if (!result.isValid) {
        console.error(`Account[${index}] (${account.id}): ${result.errors.length} errors`);
        result.errors.forEach(e => console.error(`  - ${e.field}: ${e.message}`));
      }
    });

    console.log('\n=== 期間検証 ===');
    this.periods.forEach((period, index) => {
      const result = validatePeriod(period, index);
      this.validationResults.set(`period-${index}`, result);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      
      if (!result.isValid) {
        console.error(`Period[${index}] (${period.id}): ${result.errors.length} errors`);
        result.errors.forEach(e => console.error(`  - ${e.field}: ${e.message}`));
      }
    });

    console.log('\n=== 財務値検証 ===');
    this.financialValues.forEach((value, index) => {
      const result = validateFinancialValue(value, index, accountIds, periodIds);
      this.validationResults.set(`financialValue-${index}`, result);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      
      if (!result.isValid) {
        console.error(`FinancialValue[${index}]: ${result.errors.length} errors`);
        result.errors.forEach(e => console.error(`  - ${e.field}: ${e.message}`));
      }
    });

    // 参照整合性検証
    console.log('\n=== 参照整合性検証 ===');
    const integrityResult = validateReferentialIntegrity(this.accounts, this.periods, this.financialValues);
    this.validationResults.set('referentialIntegrity', integrityResult);
    allErrors.push(...integrityResult.errors);
    allWarnings.push(...integrityResult.warnings);

    // ビジネスルール検証
    console.log('\n=== ビジネスルール検証 ===');
    const businessResult = validateBusinessRules(this.accounts, this.periods);
    this.validationResults.set('businessRules', businessResult);
    allErrors.push(...businessResult.errors);
    allWarnings.push(...businessResult.warnings);

    // サマリー出力
    console.log('\n=== 検証結果サマリー ===');
    console.log(`総エラー数: ${allErrors.length}`);
    console.log(`総警告数: ${allWarnings.length}`);
    console.log(`検証済みアカウント数: ${this.accounts.length}`);
    console.log(`検証済み期間数: ${this.periods.length}`);
    console.log(`検証済み財務値数: ${this.financialValues.length}`);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  getDetailedReport(): string {
    const lines: string[] = ['# シードデータ検証レポート\n'];
    
    lines.push('## 概要');
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

    lines.push('## 検証結果サマリー');
    lines.push(`- 総エラー数: ${totalErrors}`);
    lines.push(`- 総警告数: ${totalWarnings}`);
    lines.push(`- 検証ステータス: ${totalErrors === 0 ? '✅ PASS' : '❌ FAIL'}\n`);

    if (totalErrors > 0) {
      lines.push('## エラー詳細');
      this.validationResults.forEach((result, key) => {
        if (result.errors.length > 0) {
          lines.push(`\n### ${key}`);
          result.errors.forEach(error => {
            lines.push(`- **${error.field}**: ${error.message}`);
            if (error.value !== undefined) {
              lines.push(`  - 値: \`${JSON.stringify(error.value)}\``);
            }
          });
        }
      });
    }

    if (totalWarnings > 0) {
      lines.push('\n## 警告詳細');
      this.validationResults.forEach((result, key) => {
        if (result.warnings.length > 0) {
          lines.push(`\n### ${key}`);
          result.warnings.forEach(warning => {
            lines.push(`- **${warning.field}**: ${warning.message}`);
            if (warning.value !== undefined) {
              lines.push(`  - 値: \`${JSON.stringify(warning.value)}\``);
            }
          });
        }
      });
    }

    return lines.join('\n');
  }
}

// 使用例のエクスポート
export function exampleUsage(): void {
  console.log('=== SeedDataValidator 使用例 ===\n');

  // サンプルデータの作成
  const sampleAccount: Account = {
    id: 'revenue-sales',
    accountName: '売上高',
    parentId: null,
    sheet: SHEET_TYPES.PL,
    isCredit: true,
    displayOrder: {
      sheetOrder: 1,
      sectionOrder: 1,
      itemOrder: 1
    },
    parameter: {
      type: PARAMETER_TYPES.MANUAL_INPUT,
      defaultValue: 1000000
    },
    cfImpact: {
      type: CF_IMPACT_TYPES.IS_BASE_PROFIT
    }
  };

  const samplePeriod: Period = {
    id: '2024-01',
    year: 2024,
    month: 1,
    displayName: '2024年1月',
    isHistorical: false,
    isForecast: true
  };

  const sampleFinancialValue: FinancialValue = {
    accountId: 'revenue-sales',
    periodId: '2024-01',
    value: 1000000,
    isManualInput: true,
    lastUpdated: new Date()
  };

  // 検証実行
  const validator = new SeedDataValidator()
    .setAccounts([sampleAccount])
    .setPeriods([samplePeriod])
    .setFinancialValues([sampleFinancialValue]);

  const result = validator.validate();
  console.log('\n検証結果:', result.isValid ? '✅ 有効' : '❌ 無効');
  
  // 詳細レポートの生成
  const report = validator.getDetailedReport();
  console.log('\n詳細レポート:\n', report);
}