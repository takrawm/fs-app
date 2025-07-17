// 計算結果の型定義
export interface CalculationResult {
  value: number;
  formula: string;
  references: string[];
}

// 計算コンテキストの型定義
export interface CalculationContext {
  periodId: string;
  accountValues: Map<string, number>;
  previousValues: Map<string, number>;
}

// 計算戦略のインターフェース
export interface CalculationStrategy {
  calculate(context: CalculationContext): CalculationResult;
  validate(parameters: any): boolean;
}

// 計算エラーの型定義
export interface CalculationError {
  accountId: string;
  periodId: string;
  error: string;
  stack?: string;
}

// 計算統計情報の型定義
export interface CalculationStats {
  totalCalculations: number;
  successfulCalculations: number;
  failedCalculations: number;
  errors: CalculationError[];
  executionTime: number;
}

// 計算オプションの型定義
export interface CalculationOptions {
  enableCaching: boolean;
  maxRetries: number;
  timeout: number;
  parallelExecution: boolean;
}

// 計算キャッシュの型定義
export interface CalculationCache {
  key: string;
  result: CalculationResult;
  timestamp: Date;
  ttl: number;
}
