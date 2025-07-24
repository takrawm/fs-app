// 計算結果は単純にnumber型として扱う
// 以前のCalculationResultインターフェースは削除済み

// 最適化された計算コンテキストの型定義
export interface CalculationContext {
  periodId: string;
  periodIndex: number;
  previousPeriodId: string | null;

  // 遅延評価による値取得（ループなし）
  getValue: (accountId: string, targetPeriodId?: string) => number;
  getRelativeValue: (accountId: string, offset: number) => number;
  getPreviousValue: (accountId: string) => number;

  // 時系列データの効率的取得
  getTimeSeriesValues: (
    accountId: string,
    startOffset: number,
    endOffset: number
  ) => number[];

  // 複数値の一括取得
  getBulkValues: (accountIds: string[]) => Map<string, number>;

  // 🔧 改善: 計算中の値の即座反映
  setValue: (accountId: string, periodId: string, value: number) => void;

  // === 新しい計算ロジック用のメソッド ===

  // 親子計算用: 指定された親科目の子科目合計を取得
  getChildrenSum: (parentAccountId: string) => number;

  // BS残高計算用: 指定されたターゲット科目に対するフロー科目の調整合計を取得
  getFlowAdjustmentSum: (targetAccountId: string) => number;

  // BS残高計算用: 指定されたBS科目にフロー科目からの調整があるかどうかを判定
  hasFlowAdjustments: (targetAccountId: string) => boolean;

  // 利益剰余金計算用: isBaseProfitがtrueの科目の値を取得
  getBaseProfit: () => number;
}

// 計算戦略のインターフェース（非推奨）
// 現在の実装ではAccountCalculator.calculateメソッドを使用
export interface CalculationStrategy {
  calculate(context: CalculationContext): number;
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
  result: number;
  timestamp: Date;
  ttl: number;
}
