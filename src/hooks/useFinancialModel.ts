import { useState, useCallback, useMemo, useEffect } from "react";
import { CalculationPipeline } from "../services/CalculationPipeline";
import type { PipelineContext } from "../services/CalculationPipeline";
import type {
  Account,
  SheetType,
  Parameter,
  BSSummaryAccount,
  BSDetailAccount,
  FlowSummaryAccount,
  FlowDetailAccount,
  CFSummaryAccount,
  CFDetailAccount,
} from "../types/accountTypes";
import type { Period } from "../types/periodTypes";
import type {
  CalculationError,
  CalculationContext,
} from "../types/calculationTypes";
import type { FinancialValue } from "../types/financialValueTypes";

import { seedDataLoader } from "../seed";
import { PeriodIndexSystem } from "../utils/PeriodIndexSystem";
import { OptimizedFinancialDataStore } from "../utils/OptimizedFinancialDataStore";

export const useFinancialModel = () => {
  // FinancialModelManagerを削除し、全ての状態をReactで管理
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  // ✅ parametersステートを削除: account.parameterを直接使用
  const [financialValues, setFinancialValues] = useState<
    Map<string, FinancialValue>
  >(new Map());

  const [calculationResults, setCalculationResults] = useState<
    Map<string, number>
  >(new Map());
  const [calculationErrors, setCalculationErrors] = useState<
    CalculationError[]
  >([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [periodIndexSystem, setPeriodIndexSystem] =
    useState<PeriodIndexSystem | null>(null);
  const [dataStore, setDataStore] =
    useState<OptimizedFinancialDataStore | null>(null);

  // 追加の状態管理
  const [sortedAccountIds, setSortedAccountIds] = useState<string[] | null>(
    null
  );
  const [isStructureDirty, setIsStructureDirty] = useState(true); // 初回はtrue

  // seedデータの初期化
  useEffect(() => {
    const initializeSeedData = async () => {
      try {
        setIsLoading(true);

        // seedデータからアカウントを読み込み
        const seedAccounts = seedDataLoader.getAccounts();
        setAccounts(seedAccounts);

        // seedデータから期間を読み込み
        const seedPeriods = seedDataLoader.getPeriods();
        setPeriods(seedPeriods);

        // seedデータから財務数値を読み込み
        const seedFinancialValues = seedDataLoader.getFinancialValues();
        const valuesMap = new Map<string, FinancialValue>();
        seedFinancialValues.forEach((value) => {
          valuesMap.set(`${value.accountId}_${value.periodId}`, value);
        });
        setFinancialValues(valuesMap);

        // ✅ parametersは削除: account.parameterとして既に管理されている

        // 最初の期間を選択
        if (seedPeriods.length > 0) {
          setSelectedPeriodId(seedPeriods[0].id);
        }
      } catch (error) {
        console.error("Failed to initialize seed data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSeedData();
  }, []);

  // periodsが更新されたらインデックスシステムを再構築
  useEffect(() => {
    if (periods.length > 0) {
      setPeriodIndexSystem(new PeriodIndexSystem(periods));
    }
  }, [periods]);

  // データストアの初期化
  useEffect(() => {
    if (accounts.length > 0 && periods.length > 0 && financialValues.size > 0) {
      setDataStore(
        new OptimizedFinancialDataStore(accounts, periods, financialValues)
      );
    }
  }, [accounts, periods, financialValues]);
  console.log("datastore:", dataStore);

  // ✅ accounts配列からparametersMapを動的に生成するヘルパー関数
  const getParametersMap = useCallback((): Map<string, Parameter> => {
    const parametersMap = new Map<string, Parameter>();
    accounts.forEach((account) => {
      if (account.parameter) {
        parametersMap.set(account.id, account.parameter);
      }
    });
    return parametersMap;
  }, [accounts]);

  const addAccount = useCallback(
    (
      accountData: Partial<Account> & { accountName: string; sheet: SheetType }
    ) => {
      // 構造が変更されたことをマーク
      setIsStructureDirty(true);
      // シートタイプに応じて適切なアカウントを作成
      const baseAccountData = {
        id: `account_${Date.now()}`,
        accountName: accountData.accountName,
        parentId: accountData.parentId || null,
        isSummaryAccount: accountData.isSummaryAccount || false,
        isCredit: accountData.isCredit || null,
        displayOrder: accountData.displayOrder || { order: "", prefix: "" },
        parameter: accountData.parameter || {
          paramType: null,
          paramValue: null,
          paramReferences: null,
        },
      };

      let newAccount: Account;

      if (accountData.sheet === "BS") {
        if (baseAccountData.isSummaryAccount) {
          newAccount = {
            ...baseAccountData,
            sheet: accountData.sheet,
            isSummaryAccount: true,
            parameter: baseAccountData.parameter as any, // SummaryAccountParameter
            flowAccountCfImpact: { type: null },
          } as BSSummaryAccount;
        } else {
          newAccount = {
            ...baseAccountData,
            sheet: accountData.sheet,
            isSummaryAccount: false,
            parameter: baseAccountData.parameter,
            flowAccountCfImpact: { type: null },
          } as BSDetailAccount;
        }
      } else if (accountData.sheet === "CF") {
        newAccount = {
          ...baseAccountData,
          sheet: accountData.sheet,
          isCredit: null,
          flowAccountCfImpact: { type: null },
        } as CFSummaryAccount | CFDetailAccount;
      } else {
        // PL, PPE, FINANCING
        newAccount = {
          ...baseAccountData,
          sheet: accountData.sheet,
          flowAccountCfImpact: accountData.flowAccountCfImpact || {
            type: null,
          },
        } as FlowSummaryAccount | FlowDetailAccount;
      }
      setAccounts((prev) => [...prev, newAccount]);
      return newAccount;
    },
    []
  );

  const updateAccount = useCallback(
    <T extends Account>(id: string, updates: Partial<Omit<T, "id">>) => {
      setAccounts((prev) =>
        prev.map((account) => {
          if (account.id === id) {
            // パラメータや構造に影響する変更があるか確認
            if (
              "parameter" in updates ||
              "parentId" in updates ||
              "flowAccountCfImpact" in updates ||
              "sheet" in updates
            ) {
              setIsStructureDirty(true);
            }
            // 型安全な更新のため、既存のアカウントの構造を保持
            return { ...account, ...updates } as Account;
          }
          return account;
        })
      );
    },
    []
  );

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((account) => account.id !== id));
    // 構造が変更されたことをマーク
    setIsStructureDirty(true);
  }, []);

  const addPeriod = useCallback(
    (periodData: Period) => {
      setPeriods((prev) => [...prev, periodData]);

      if (!selectedPeriodId) {
        setSelectedPeriodId(periodData.id);
      }

      return periodData;
    },
    [selectedPeriodId]
  );

  const setParameter = useCallback(
    (accountId: string, parameter: Parameter) => {
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === accountId
            ? ({ ...account, parameter } as Account)
            : account
        )
      );
      // パラメータ変更は構造変更
      setIsStructureDirty(true);
    },
    []
  );

  /**
   * パイプラインコンテキストを作成
   */
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

  const calculatePeriod = useCallback(
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
            "[useFinancialModel] Running full pipeline for single period (structure changed)"
          );
          pipeline = CalculationPipeline.createFullPipeline({
            targetPeriodId: periodId,
          });
        } else {
          // 数値変更のみの場合は短縮パイプライン
          console.log(
            "[useFinancialModel] Running calculation-only pipeline for single period"
          );
          pipeline = CalculationPipeline.createCalculationOnlyPipeline({
            targetPeriodId: periodId,
          });
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
    [createPipelineContext, isStructureDirty]
  );

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

  // 現在選択中の期間の計算を実行
  const calculateCurrentPeriod = useCallback(() => {
    if (!selectedPeriodId) return;
    return calculatePeriod(selectedPeriodId);
  }, [selectedPeriodId, calculatePeriod]);

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
          "[useFinancialModel] Running full pipeline (structure changed)"
        );
        pipeline = CalculationPipeline.createFullPipeline();
      } else {
        // 数値変更のみの場合は短縮パイプライン
        console.log("[useFinancialModel] Running calculation-only pipeline");
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
  }, [createPipelineContext, isStructureDirty]);

  const getAccountValue = useCallback(
    (accountId: string, periodId: string): number => {
      if (!dataStore) return 0;
      return dataStore.getValue(accountId, periodId);
    },
    [dataStore]
  );

  const getAccountsBySheet = useCallback(
    (sheet: SheetType): Account[] => {
      return accounts.filter((account) => account.sheet === sheet);
    },
    [accounts]
  );

  const getAccountsByParent = useCallback(
    (parentId: string | null): Account[] => {
      return accounts.filter((account) => account.parentId === parentId);
    },
    [accounts]
  );

  const getAccountHierarchy = useCallback(
    (rootId?: string) => {
      const buildHierarchy = (
        parentId: string | null
      ): AccountHierarchyNode[] => {
        const children = accounts.filter(
          (account) => account.parentId === parentId
        );
        return children.map((account) => ({
          account,
          children: buildHierarchy(account.id),
        }));
      };

      if (rootId) {
        const root = accounts.find((account) => account.id === rootId);
        if (!root) return [];
        return [
          {
            account: root,
            children: buildHierarchy(rootId),
          },
        ];
      }

      return buildHierarchy(null);
    },
    [accounts]
  );

  const validateModel = useCallback(() => {
    // 各種検証を実行
    const errors: string[] = [];

    // 必須フィールドの検証
    accounts.forEach((account) => {
      if (!account.accountName) {
        errors.push(`Account ${account.id} has no name`);
      }
    });

    // 期間の検証
    if (periods.length === 0) {
      errors.push("No periods defined");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [accounts, periods]);

  const getAccountParameter = useCallback(
    (accountId: string): Parameter | undefined => {
      const account = accounts.find((acc) => acc.id === accountId);
      return account?.parameter;
    },
    [accounts]
  );

  const setAccountParameter = useCallback(
    (accountId: string, parameter: Parameter) => {
      setParameter(accountId, parameter);
    },
    [setParameter]
  );

  // 計算結果の統計情報
  const calculationStats = useMemo(() => {
    const totalAccounts = accounts.length;
    const calculatedAccounts = calculationResults.size;
    // 新しい型定義ではvalueはnumber型なので、nullチェックは不要
    const errorCount = 0; // エラーは別途管理する必要がある

    return {
      totalAccounts,
      calculatedAccounts,
      errorCount,
      successRate:
        totalAccounts > 0
          ? (calculatedAccounts - errorCount) / totalAccounts
          : 0,
    };
  }, [accounts, calculationResults]);

  // アカウントの統計情報
  const accountStats = useMemo(() => {
    const bySheet = accounts.reduce((acc, account) => {
      acc[account.sheet] = (acc[account.sheet] || 0) + 1;
      return acc;
    }, {} as Record<SheetType, number>);

    const byParameter = accounts.reduce((acc, account) => {
      const paramType = account.parameter?.paramType || "NULL";
      acc[paramType] = (acc[paramType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { bySheet, byParameter };
  }, [accounts]);

  return {
    // 基本データ
    accounts,
    periods,
    financialValues,

    calculationResults,
    calculationErrors,
    selectedPeriodId,
    isCalculating,
    isLoading,

    // 操作関数
    addAccount,
    updateAccount,
    deleteAccount,
    addPeriod,
    setParameter,
    calculatePeriod,
    calculateCashFlow,
    calculateCurrentPeriod,
    calculateAllPeriods,

    // 取得関数
    getAccountValue,
    getAccountsBySheet,
    getAccountsByParent,
    getAccountHierarchy,
    getAccountParameter,
    setAccountParameter,

    // ユーティリティ
    validateModel,
    calculationStats,
    accountStats,

    // 期間選択
    setSelectedPeriodId: useCallback(
      (periodId: string) => {
        setSelectedPeriodId(periodId);
        const selectedPeriod = periods.find((period) => period.id === periodId);
        if (selectedPeriod) {
          console.log(
            `選択された期間: ${selectedPeriod.name} (ID: ${selectedPeriod.id})`
          );
        }
      },
      [periods]
    ),

    // seedデータアクセス
    seedDataLoader,
  };
};

// 型定義
interface AccountHierarchyNode {
  account: Account;
  children: AccountHierarchyNode[];
}
