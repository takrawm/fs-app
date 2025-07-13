// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
import { useState, useCallback, useMemo, useEffect } from "react";
import { FinancialModelManager } from "../models/FinancialModelManager";
import type { Account, SheetType } from "../types/accountTypes";
import type { Parameter } from "../types/accountTypes";
import type { Period } from "../types/periodTypes";
import type { CalculationResult } from "../types/calculationTypes";
// "../seed"と指定すると、TypeScriptは自動的に../seed/index.tsファイルを探す
import { seedDataLoader } from "../seed";

export const useFinancialModel = () => {
  const [manager] = useState(() => new FinancialModelManager());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [calculationResults, setCalculationResults] = useState<
    Map<string, CalculationResult>
  >(new Map());
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // seedデータの初期化
  useEffect(() => {
    const initializeSeedData = async () => {
      try {
        setIsLoading(true);

        // seedデータからアカウントを読み込み
        const seedAccounts = seedDataLoader.getAccounts();
        seedAccounts.forEach((account) => {
          manager.addAccount(account);
        });

        // seedデータから期間を読み込み
        const seedPeriods = seedDataLoader.getPeriods();
        seedPeriods.forEach((period) => {
          manager.addPeriod(period);
        });

        // seedデータから財務数値を読み込み
        const seedFinancialValues = seedDataLoader.getFinancialValues();
        manager.loadFinancialValues(seedFinancialValues);

        // 状態を更新
        setAccounts(manager.getAllAccounts());
        const periods = manager.getAllPeriods();
        setPeriods(periods);

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
  }, [manager]);

  const addAccount = useCallback(
    (accountData: Omit<Account, "id">) => {
      const newAccount = manager.addAccount(accountData);
      setAccounts(manager.getAllAccounts());
      return newAccount;
    },
    [manager]
  );

  const updateAccount = useCallback(
    (id: string, updates: Partial<Account>) => {
      manager.updateAccount(id, updates);
      setAccounts(manager.getAllAccounts());
    },
    [manager]
  );

  const deleteAccount = useCallback(
    (id: string) => {
      manager.deleteAccount(id);
      setAccounts(manager.getAllAccounts());
    },
    [manager]
  );

  const addPeriod = useCallback(
    (periodData: Period) => {
      manager.addPeriod(periodData);
      const periods = manager.getAllPeriods();
      setPeriods(periods);

      if (!selectedPeriodId) {
        setSelectedPeriodId(periodData.id);
      }

      return periodData;
    },
    [manager, selectedPeriodId]
  );

  const setParameter = useCallback(
    (accountId: string, periodId: string, parameter: Parameter) => {
      manager.setParameter(accountId, periodId, parameter);
    },
    [manager]
  );

  const calculatePeriod = useCallback(
    async (periodId: string) => {
      setIsCalculating(true);

      try {
        const results = manager.calculatePeriod(periodId);
        setCalculationResults(results);
        return results;
      } catch (error) {
        console.error("Calculation error:", error);
        throw error;
      } finally {
        setIsCalculating(false);
      }
    },
    [manager]
  );

  const calculateCashFlow = useCallback(
    async (periodId: string) => {
      setIsCalculating(true);

      try {
        const cfResults = manager.calculateCashFlow(periodId);
        return cfResults;
      } catch (error) {
        console.error("Cash flow calculation error:", error);
        throw error;
      } finally {
        setIsCalculating(false);
      }
    },
    [manager]
  );

  const calculateCurrentPeriod = useCallback(async () => {
    if (!selectedPeriodId) return;
    return calculatePeriod(selectedPeriodId);
  }, [selectedPeriodId, calculatePeriod]);

  const calculateAllPeriods = useCallback(async () => {
    setIsCalculating(true);

    try {
      const allResults = new Map<string, CalculationResult>();

      for (const period of periods) {
        const results = manager.calculatePeriod(period.id);
        results.forEach((result, accountId) => {
          allResults.set(`${accountId}_${period.id}`, result);
        });
      }

      setCalculationResults(allResults);
      return allResults;
    } catch (error) {
      console.error("All periods calculation error:", error);
      throw error;
    } finally {
      setIsCalculating(false);
    }
  }, [manager, periods]);

  const getAccountValue = useCallback(
    (accountId: string, periodId: string): number => {
      // 1. 計算結果を優先して取得
      const result = calculationResults.get(`${accountId}_${periodId}`);
      if (result !== undefined) {
        return result.value;
      }

      // 2. 計算結果がない場合、初期ロードした値を取得
      const initialValue = manager.getFinancialValue(accountId, periodId);
      return initialValue?.value || 0;
    },
    [calculationResults, manager]
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
    return manager.validateModel();
  }, [manager]);

  const getAccountParameter = useCallback(
    (accountId: string, periodId: string): Parameter | undefined => {
      return manager.getParameter(accountId, periodId);
    },
    [manager]
  );

  const setAccountParameter = useCallback(
    (accountId: string, periodId: string, parameter: Parameter) => {
      manager.setParameter(accountId, periodId, parameter);
    },
    [manager]
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
      acc[account.parameter.type] = (acc[account.parameter.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { bySheet, byParameter };
  }, [accounts]);

  return {
    // 基本データ
    accounts,
    periods,
    calculationResults,
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
    setSelectedPeriodId,

    // seedデータアクセス
    seedDataLoader,
  };
};

// 型定義
interface AccountHierarchyNode {
  account: Account;
  children: AccountHierarchyNode[];
}
