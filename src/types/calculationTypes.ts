// ========== 計算関連の型定義 ==========

import type { Parameter } from "./accountTypes";

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

/** 計算エラーの型定義 */
export interface CalculationError {
  accountId: string;
  errorType:
    | "CIRCULAR_REFERENCE"
    | "MISSING_DEPENDENCY"
    | "INVALID_FORMULA"
    | "DIVISION_BY_ZERO"
    | "UNKNOWN";
  message: string;
  details?: any;
}

/** 計算統計情報 */
export interface CalculationStats {
  totalAccounts: number;
  calculatedAccounts: number;
  errorCount: number;
  successRate: number;
  calculationTime: number;
  errors: CalculationError[];
}

/** 計算オプション */
export interface CalculationOptions {
  validateCircularReferences?: boolean;
  allowMissingDependencies?: boolean;
  maxIterations?: number;
  tolerance?: number;
  includeErrors?: boolean;
}

/** 計算キャッシュ */
export interface CalculationCache {
  accountId: string;
  periodId: string;
  result: CalculationResult;
  timestamp: Date;
  dependencies: string[];
}
