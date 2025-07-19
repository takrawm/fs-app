import { useState, useCallback, useMemo, useEffect } from "react";
import { FinancialCalculator } from "../services/FinancialCalculator";
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
  CalculationResult,
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
    Map<string, CalculationResult>
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
        createdAt: new Date(),
        updatedAt: new Date(),
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
    <T extends Account>(
      id: string,
      updates: Partial<Omit<T, "id" | "createdAt">>
    ) => {
      setAccounts((prev) =>
        prev.map((account) => {
          if (account.id === id) {
            // 型安全な更新のため、既存のアカウントの構造を保持
            return { ...account, ...updates, updatedAt: new Date() } as Account;
          }
          return account;
        })
      );
    },
    []
  );

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((account) => account.id !== id));
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
            ? ({ ...account, parameter, updatedAt: new Date() } as Account)
            : account
        )
      );
    },
    []
  );

  const calculatePeriod = useCallback(
    (periodId: string) => {
      if (!periodIndexSystem || !dataStore) {
        throw new Error("System not initialized");
      }

      setIsCalculating(true);
      setCalculationErrors([]);

      try {
        // 前期IDを高速取得（O(1)）
        const previousPeriodId =
          periodIndexSystem.getPreviousPeriodId(periodId);
        const periodIndex = periodIndexSystem.getPeriodIndex(periodId) || 0;

        // 最適化されたコンテキスト
        const context: CalculationContext = {
          periodId,
          periodIndex,
          previousPeriodId,

          getValue: (accountId: string, targetPeriodId?: string) => {
            return dataStore.getValue(accountId, targetPeriodId || periodId);
          },

          getRelativeValue: (accountId: string, offset: number) => {
            return dataStore.getRelativeValue(accountId, periodId, offset);
          },

          getPreviousValue: (accountId: string) => {
            return dataStore.getPreviousValue(accountId, periodId);
          },

          getTimeSeriesValues: (
            accountId: string,
            startOffset: number,
            endOffset: number
          ) => {
            return dataStore.getTimeSeriesValues(
              accountId,
              periodId,
              startOffset,
              endOffset
            );
          },

          getBulkValues: (accountIds: string[]) => {
            return dataStore.getBulkValues(accountIds, periodId);
          },

          // 🔧 改善: 計算中の値の即座反映
          setValue: (accountId: string, periodId: string, value: number) => {
            dataStore.setValue(accountId, periodId, value);
          },
        };

        // 計算実行
        const { results, calculatedValues, errors } =
          FinancialCalculator.calculatePeriod(
            accounts,
            periodId,
            context,
            getParametersMap()
          );

        // 結果を更新
        setCalculationResults(results);

        // データストアを更新
        const updates = Array.from(calculatedValues.values()).map((v) => ({
          accountId: v.accountId,
          periodId: v.periodId,
          value: v.value,
        }));
        dataStore.setValues(updates);

        // React stateも更新
        setFinancialValues(dataStore.toFinancialValueMap());
        setCalculationErrors(errors);

        return results;
      } catch (error) {
        console.error("Calculation error:", error);
        throw error;
      } finally {
        setIsCalculating(false);
      }
    },
    [accounts, periodIndexSystem, dataStore, getParametersMap]
  );

  // キャッシュフロー計算処理
  const calculateCashFlow = useCallback((_periodId: string) => {
    setIsCalculating(true);

    try {
      // TODO: CF計算の実装
      console.log("Cash flow calculation not yet implemented");
      return new Map<string, CalculationResult>();
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
    if (!periodIndexSystem || !dataStore) {
      throw new Error("System not initialized");
    }

    setIsCalculating(true);
    setCalculationErrors([]);

    try {
      const allResults = new Map<string, CalculationResult>();
      const allErrors: CalculationError[] = [];

      // 各期間を順番に計算
      periods.forEach((period) => {
        const periodIndex = periodIndexSystem.getPeriodIndex(period.id) || 0;
        const previousPeriodId = periodIndexSystem.getPreviousPeriodId(
          period.id
        );

        const context: CalculationContext = {
          periodId: period.id,
          periodIndex,
          previousPeriodId,
          getValue: (accountId: string, targetPeriodId?: string) => {
            return dataStore.getValue(accountId, targetPeriodId || period.id);
          },
          getRelativeValue: (accountId: string, offset: number) => {
            return dataStore.getRelativeValue(accountId, period.id, offset);
          },
          getPreviousValue: (accountId: string) => {
            return dataStore.getPreviousValue(accountId, period.id);
          },
          getTimeSeriesValues: (
            accountId: string,
            startOffset: number,
            endOffset: number
          ) => {
            return dataStore.getTimeSeriesValues(
              accountId,
              period.id,
              startOffset,
              endOffset
            );
          },
          getBulkValues: (accountIds: string[]) => {
            return dataStore.getBulkValues(accountIds, period.id);
          },
          setValue: (accountId: string, periodId: string, value: number) => {
            dataStore.setValue(accountId, periodId, value);
          },
        };

        const { results, calculatedValues, errors } =
          FinancialCalculator.calculatePeriod(
            accounts,
            period.id,
            context,
            getParametersMap()
          );

        // 結果を蓄積
        results.forEach((result, accountId) => {
          allResults.set(`${accountId}_${period.id}`, result);
        });

        // データストアを更新
        const updates = Array.from(calculatedValues.values()).map((v) => ({
          accountId: v.accountId,
          periodId: v.periodId,
          value: v.value,
        }));
        dataStore.setValues(updates);

        allErrors.push(...errors);
      });

      // 状態を更新
      setCalculationResults(allResults);
      setFinancialValues(dataStore.toFinancialValueMap());
      setCalculationErrors(allErrors);

      return allResults;
    } catch (error) {
      console.error("All periods calculation error:", error);
      throw error;
    } finally {
      setIsCalculating(false);
    }
  }, [accounts, periods, periodIndexSystem, dataStore, getParametersMap]);

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
