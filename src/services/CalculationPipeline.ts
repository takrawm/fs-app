import type { Account, Parameter } from "../types/accountTypes";
import type { Period } from "../types/periodTypes";
import type { FinancialValue } from "../types/financialValueTypes";
import type { CalculationError } from "../types/calculationTypes";
import { PeriodIndexSystem } from "../utils/PeriodIndexSystem";
import { OptimizedFinancialDataStore } from "../utils/OptimizedFinancialDataStore";
import { ValidateAccountDefinitionsStage } from "./stages/ValidateAccountDefinitionsStage";
import { InitializeFinancialValuesStage } from "./stages/InitializeFinancialValuesStage";
import { CfAccountGenerationStage } from "./stages/CfAccountGenerationStage";
import { DependencyResolutionStage } from "./stages/DependencyResolutionStage";
import { CalculationStage } from "./stages/CalculationStage";

/**
 * パイプライン実行時のコンテキスト
 * 各ステージ間で状態を引き継ぐためのオブジェクト
 */
export interface PipelineContext {
  accounts: Account[];
  periods: Period[];
  financialValues: Map<string, FinancialValue>;
  periodIndexSystem: PeriodIndexSystem;
  dataStore: OptimizedFinancialDataStore;
  parameters: Map<string, Parameter>;

  // ステージごとに追加される情報
  sortedAccountIds?: string[];
  cfTargetAccounts?: string[];
  cfGeneratedAccounts?: Account[];
  calculationErrors?: CalculationError[];
  calculationResults?: Map<string, number>;
}

/**
 * パイプラインステージのインターフェース
 */
export interface PipelineStage {
  name: string;
  execute(context: PipelineContext): PipelineContext;
  validate?(context: PipelineContext): boolean;
}

/**
 * 計算パイプラインの設定
 */
export interface PipelineConfig {
  enableValidation?: boolean;
  enableCfGeneration?: boolean;
  enableDependencyResolution?: boolean;
  targetPeriodId?: string;
  targetPeriods?: string[];
}

/**
 * 計算プロセス全体を管理するパイプライン
 * ステージベースの実行により、柔軟で拡張可能な計算フローを実現
 */
export class CalculationPipeline {
  private stages: PipelineStage[] = [];
  private config: PipelineConfig;

  constructor(config: PipelineConfig = {}) {
    this.config = {
      enableValidation: true,
      enableCfGeneration: true,
      enableDependencyResolution: true,
      ...config,
    };
  }

  /**
   * パイプラインにステージを追加
   */
  addStage(stage: PipelineStage): CalculationPipeline {
    this.stages.push(stage);
    return this;
  }

  /**
   * パイプラインのステージをクリア
   */
  clearStages(): CalculationPipeline {
    this.stages = [];
    return this;
  }

  /**
   * パイプラインを実行
   */
  run(initialContext: PipelineContext): PipelineContext {
    let context = { ...initialContext };

    console.log(
      `[Pipeline] Starting execution with ${this.stages.length} stages`
    );

    for (const stage of this.stages) {
      console.log(`[Pipeline] Executing stage: ${stage.name}`);

      // ステージの検証（オプション）
      if (stage.validate && !stage.validate(context)) {
        throw new Error(`Stage validation failed: ${stage.name}`);
      }

      try {
        // ステージを実行
        context = stage.execute(context);
        console.log(`[Pipeline] Stage completed: ${stage.name}`);
      } catch (error) {
        console.error(`[Pipeline] Stage failed: ${stage.name}`, error);
        throw new Error(
          `Pipeline execution failed at stage: ${stage.name}. ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    console.log(`[Pipeline] Execution completed successfully`);
    return context;
  }

  /**
   * 標準的なフルパイプラインを構築
   */
  static createFullPipeline(config: PipelineConfig = {}): CalculationPipeline {
    const pipeline = new CalculationPipeline(config);

    // 各ステージを使用

    // 設定に基づいてステージを追加
    if (config.enableValidation !== false) {
      pipeline.addStage(new ValidateAccountDefinitionsStage());
    }

    // 財務数値初期化は常に実行
    pipeline.addStage(new InitializeFinancialValuesStage());

    if (config.enableCfGeneration !== false) {
      pipeline.addStage(new CfAccountGenerationStage());
    }

    if (config.enableDependencyResolution !== false) {
      pipeline.addStage(new DependencyResolutionStage());
    }

    // 計算ステージは必須
    const targetPeriods =
      config.targetPeriods ||
      (config.targetPeriodId ? [config.targetPeriodId] : []);
    pipeline.addStage(new CalculationStage(targetPeriods));

    return pipeline;
  }

  /**
   * 計算のみの短縮パイプラインを構築
   */
  static createCalculationOnlyPipeline(
    config: PipelineConfig = {}
  ): CalculationPipeline {
    const pipeline = new CalculationPipeline({
      ...config,
      enableValidation: false,
      enableCfGeneration: false,
      enableDependencyResolution: false,
    });

    // 必要なステージのみ使用

    // 財務数値初期化
    pipeline.addStage(new InitializeFinancialValuesStage());

    // 計算ステージ
    const targetPeriods =
      config.targetPeriods ||
      (config.targetPeriodId ? [config.targetPeriodId] : []);
    pipeline.addStage(new CalculationStage(targetPeriods));

    return pipeline;
  }

  /**
   * 現在のステージ構成を取得
   */
  getStages(): PipelineStage[] {
    return [...this.stages];
  }

  /**
   * パイプラインの設定を取得
   */
  getConfig(): PipelineConfig {
    return { ...this.config };
  }
}
