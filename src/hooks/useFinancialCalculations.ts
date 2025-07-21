import { useState, useCallback, useMemo } from "react";
import { CalculationPipeline } from "../services/CalculationPipeline";
import type { PipelineContext } from "../services/CalculationPipeline";
import type { Account } from "../types/accountTypes";
import type { Period } from "../types/periodTypes";
import type { FinancialValue } from "../types/financialValueTypes";
import type { CalculationError } from "../types/calculationTypes";
import type { Parameter } from "../types/accountTypes";
import { PeriodIndexSystem } from "../utils/PeriodIndexSystem";
import { OptimizedFinancialDataStore } from "../utils/OptimizedFinancialDataStore";

interface UseFinancialCalculationsProps {
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  periods: Period[];
  financialValues: Map<string, FinancialValue>;
  setFinancialValues: React.Dispatch<
    React.SetStateAction<Map<string, FinancialValue>>
  >;
  periodIndexSystem: PeriodIndexSystem | null;
  dataStore: OptimizedFinancialDataStore | null;
}

/**
 * 財務計算処理を管理するフック
 * 計算ロジックの実行と結果の管理を責任とする
 */
export const useFinancialCalculations = ({
  accounts,
  setAccounts,
  periods,
  financialValues,
  setFinancialValues,
  periodIndexSystem,
  dataStore,
}: UseFinancialCalculationsProps) => {
  const [calculationResults, setCalculationResults] = useState<
    Map<string, number>
  >(new Map());
  const [calculationErrors, setCalculationErrors] = useState<
    CalculationError[]
  >([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [sortedAccountIds, setSortedAccountIds] = useState<string[] | null>(
    null
  );
  const [isStructureDirty, setIsStructureDirty] = useState(true);

  // accounts配列からparametersMapを動的に生成
  const getParametersMap = useCallback((): Map<string, Parameter> => {
    const parametersMap = new Map<string, Parameter>();
    accounts.forEach((account) => {
      if (account.parameter) {
        parametersMap.set(account.id, account.parameter);
      }
    });
    return parametersMap;
  }, [accounts]);

  // パイプラインコンテキストを作成
  const createPipelineContext = useCallback((): PipelineContext | null => {
    if (!periodIndexSystem || !dataStore) {
      return null;
    }

    return {
      accounts,
      periods,
      financialValues,
      periodIndexSystem,
      dataStore,
      parameters: getParametersMap(),
      sortedAccountIds: sortedAccountIds || undefined,
    };
  }, [
    accounts,
    periods,
    financialValues,
    periodIndexSystem,
    dataStore,
    getParametersMap,
    sortedAccountIds,
  ]);

  // 単一期間の計算を実行
  const calculateSinglePeriod = useCallback(
    (periodId: string) => {
      const pipelineContext = createPipelineContext();
      if (!pipelineContext) {
        throw new Error("System not initialized");
      }

      setIsCalculating(true);
      setCalculationErrors([]);

      try {
        let pipeline: CalculationPipeline;

        // 構造が変更されている場合はフルパイプラインを実行
        if (isStructureDirty) {
          console.log(
            "[useFinancialCalculations] Running full pipeline for single period (structure changed)"
          );
          pipeline = CalculationPipeline.createFullPipeline({
            targetPeriodId: periodId,
          });
        } else {
          // 数値変更のみの場合は短縮パイプライン
          console.log(
            "[useFinancialCalculations] Running calculation-only pipeline for single period"
          );
          pipeline = CalculationPipeline.createCalculationOnlyPipeline({
            targetPeriodId: periodId,
          });
        }

        // パイプラインを実行
        const result = pipeline.run(pipelineContext);
        console.log("result: ", result);

        // 結果を反映
        if (result.sortedAccountIds && isStructureDirty) {
          setSortedAccountIds(result.sortedAccountIds);
          setIsStructureDirty(false);
        }

        if (result.calculationResults) {
          setCalculationResults(result.calculationResults);
        }

        if (result.financialValues) {
          setFinancialValues(result.financialValues);
        }

        if (result.calculationErrors) {
          setCalculationErrors(result.calculationErrors);
        }

        // CF科目が生成された場合はアカウントを更新
        if (
          result.cfGeneratedAccounts &&
          result.cfGeneratedAccounts.length > 0
        ) {
          setAccounts(result.accounts);
        }

        return result.calculationResults || new Map();
      } catch (error) {
        console.error("Calculation error:", error);
        throw error;
      } finally {
        setIsCalculating(false);
      }
    },
    [createPipelineContext, isStructureDirty, setAccounts, setFinancialValues]
  );

  // 全期間の計算を実行
  const calculateAllPeriods = useCallback(() => {
    const pipelineContext = createPipelineContext();
    if (!pipelineContext) {
      throw new Error("System not initialized");
    }

    setIsCalculating(true);
    setCalculationErrors([]);

    try {
      let pipeline: CalculationPipeline;

      // 構造が変更されている場合はフルパイプラインを実行
      if (isStructureDirty) {
        console.log(
          "[useFinancialCalculations] Running full pipeline (structure changed)"
        );
        pipeline = CalculationPipeline.createFullPipeline();
      } else {
        // 数値変更のみの場合は短縮パイプライン
        console.log(
          "[useFinancialCalculations] Running calculation-only pipeline"
        );
        pipeline = CalculationPipeline.createCalculationOnlyPipeline();
      }

      // パイプラインを実行
      const result = pipeline.run(pipelineContext);

      // 結果を反映
      if (result.sortedAccountIds && isStructureDirty) {
        setSortedAccountIds(result.sortedAccountIds);
        setIsStructureDirty(false);
      }

      if (result.calculationResults) {
        setCalculationResults(result.calculationResults);
      }

      if (result.financialValues) {
        setFinancialValues(result.financialValues);
      }

      if (result.calculationErrors) {
        setCalculationErrors(result.calculationErrors);
      }

      // CF科目が生成された場合はアカウントを更新
      if (result.cfGeneratedAccounts && result.cfGeneratedAccounts.length > 0) {
        setAccounts(result.accounts);
      }

      return result.calculationResults || new Map();
    } catch (error) {
      console.error("All periods calculation error:", error);
      throw error;
    } finally {
      setIsCalculating(false);
    }
  }, [
    createPipelineContext,
    isStructureDirty,
    setAccounts,
    setFinancialValues,
  ]);

  // キャッシュフロー計算処理
  const calculateCashFlow = useCallback((_periodId: string) => {
    setIsCalculating(true);

    try {
      // TODO: CF計算の実装
      console.log("Cash flow calculation not yet implemented");
      return new Map<string, number>();
    } catch (error) {
      console.error("Cash flow calculation error:", error);
      throw error;
    } finally {
      setIsCalculating(false);
    }
  }, []);

  // 構造変更をマーク
  const markStructureDirty = useCallback(() => {
    setIsStructureDirty(true);
  }, []);

  // 計算結果の統計情報
  const calculationStats = useMemo(() => {
    const totalAccounts = accounts.length;
    const calculatedAccounts = calculationResults.size;
    const errorCount = calculationErrors.length;

    return {
      totalAccounts,
      calculatedAccounts,
      errorCount,
      successRate:
        totalAccounts > 0
          ? (calculatedAccounts - errorCount) / totalAccounts
          : 0,
    };
  }, [accounts, calculationResults, calculationErrors]);

  return {
    // 計算結果
    calculationResults,
    calculationErrors,
    isCalculating,

    // 内部状態
    sortedAccountIds,
    isStructureDirty,

    // 計算実行
    calculateSinglePeriod,
    calculateAllPeriods,
    calculateCashFlow,

    // 状態管理
    markStructureDirty,
    createPipelineContext,

    // 統計情報
    calculationStats,
  };
};
