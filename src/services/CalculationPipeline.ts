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

  /**
   * パイプラインインスタンスを作成
   * @param config パイプライン設定（デフォルト値は設定しない）
   */
  constructor(config: PipelineConfig = {}) {
    this.config = config;
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
        // execute(context: PipelineContext): PipelineContext;で
        // PipelineContextを受け取り、PipelineContextを返す
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
   * @param inputConfig パイプライン設定（部分的な設定も可能）
   * @returns 設定済みのCalculationPipelineインスタンス
   */
  static createFullPipeline(
    inputConfig: PipelineConfig = {}
  ): CalculationPipeline {
    // デフォルト値を明示的に設定
    const resolvedConfig: Required<
      Pick<
        PipelineConfig,
        "enableValidation" | "enableCfGeneration" | "enableDependencyResolution"
      >
    > &
      Pick<PipelineConfig, "targetPeriodId" | "targetPeriods"> = {
      enableValidation: inputConfig.enableValidation ?? true,
      enableCfGeneration: inputConfig.enableCfGeneration ?? true,
      enableDependencyResolution:
        inputConfig.enableDependencyResolution ?? true,
      targetPeriodId: inputConfig.targetPeriodId,
      targetPeriods: inputConfig.targetPeriods,
    };

    const pipeline = new CalculationPipeline(resolvedConfig);

    // 解決済みの設定を使用してステージを追加
    if (resolvedConfig.enableValidation) {
      pipeline.addStage(new ValidateAccountDefinitionsStage());
    }

    // 財務数値初期化は常に実行
    pipeline.addStage(new InitializeFinancialValuesStage());

    if (resolvedConfig.enableCfGeneration) {
      pipeline.addStage(new CfAccountGenerationStage());
    }

    if (resolvedConfig.enableDependencyResolution) {
      pipeline.addStage(new DependencyResolutionStage());
    }

    // 計算ステージは必須
    const targetPeriods =
      resolvedConfig.targetPeriods ||
      (resolvedConfig.targetPeriodId ? [resolvedConfig.targetPeriodId] : []);
    pipeline.addStage(new CalculationStage(targetPeriods));

    return pipeline;
  }

  /**
   * 計算のみの短縮パイプラインを構築
   * @param inputConfig パイプライン設定（部分的な設定も可能）
   * @returns 設定済みのCalculationPipelineインスタンス
   */
  static createCalculationOnlyPipeline(
    inputConfig: PipelineConfig = {}
  ): CalculationPipeline {
    // 計算のみパイプライン用の設定を明示的に設定
    const resolvedConfig: Required<
      Pick<
        PipelineConfig,
        "enableValidation" | "enableCfGeneration" | "enableDependencyResolution"
      >
    > &
      Pick<PipelineConfig, "targetPeriodId" | "targetPeriods"> = {
      enableValidation: false,
      enableCfGeneration: false,
      enableDependencyResolution: false,
      targetPeriodId: inputConfig.targetPeriodId,
      targetPeriods: inputConfig.targetPeriods,
    };

    const pipeline = new CalculationPipeline(resolvedConfig);

    // 財務数値初期化
    pipeline.addStage(new InitializeFinancialValuesStage());

    // 計算ステージ
    const targetPeriods =
      resolvedConfig.targetPeriods ||
      (resolvedConfig.targetPeriodId ? [resolvedConfig.targetPeriodId] : []);
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
