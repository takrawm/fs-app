import { useState, useEffect, useCallback } from "react";
import { OptimizedFinancialDataStore } from "../utils/OptimizedFinancialDataStore";
import type { Account } from "../types/accountTypes";
import type { Period } from "../types/periodTypes";
import type { FinancialValue } from "../types/financialValueTypes";

interface UseFinancialDataStoreProps {
  accounts: Account[];
  periods: Period[];
  initialFinancialValues?: Map<string, FinancialValue>;
}

/**
 * 財務数値の管理とデータストアの構築を行うフック
 * financialValuesの状態管理とOptimizedFinancialDataStoreの管理を責任とする
 */
export const useFinancialDataStore = ({
  accounts,
  periods,
  initialFinancialValues = new Map(),
}: UseFinancialDataStoreProps) => {
  const [financialValues, setFinancialValues] = useState<
    Map<string, FinancialValue>
  >(initialFinancialValues);
  const [dataStore, setDataStore] =
    useState<OptimizedFinancialDataStore | null>(null);

  // 初期値の設定
  useEffect(() => {
    if (initialFinancialValues.size > 0) {
      setFinancialValues(initialFinancialValues);
    }
  }, [initialFinancialValues]);

  // データストアの初期化と更新
  useEffect(() => {
    if (accounts.length > 0 && periods.length > 0 && financialValues.size > 0) {
      console.log("Rebuilding OptimizedFinancialDataStore");
      setDataStore(
        new OptimizedFinancialDataStore(accounts, periods, financialValues)
      );
    }
  }, [accounts, periods, financialValues]);

  // 財務数値の取得
  const getAccountValue = useCallback(
    (accountId: string, periodId: string): number => {
      if (!dataStore) return 0;
      return dataStore.getValue(accountId, periodId);
    },
    [dataStore]
  );

  // 財務数値の更新
  const updateFinancialValue = useCallback(
    (accountId: string, periodId: string, value: number) => {
      const key = `${accountId}_${periodId}`;
      const newValue: FinancialValue = {
        accountId,
        periodId,
        value,
        isCalculated: false,
      };

      setFinancialValues((prev) => {
        const newMap = new Map(prev);
        newMap.set(key, newValue);
        return newMap;
      });
    },
    []
  );

  // 複数の財務数値を一括更新
  const updateFinancialValues = useCallback(
    (updates: Map<string, FinancialValue>) => {
      setFinancialValues((prev) => {
        const newMap = new Map(prev);
        updates.forEach((value, key) => {
          newMap.set(key, value);
        });
        return newMap;
      });
    },
    []
  );

  // 特定の勘定科目の全期間の値を取得
  const getAccountValuesForAllPeriods = useCallback(
    (accountId: string): Map<string, number> => {
      const result = new Map<string, number>();
      periods.forEach((period) => {
        const value = getAccountValue(accountId, period.id);
        result.set(period.id, value);
      });
      return result;
    },
    [periods, getAccountValue]
  );

  // 特定の期間の全勘定科目の値を取得
  const getPeriodValuesForAllAccounts = useCallback(
    (periodId: string): Map<string, number> => {
      const result = new Map<string, number>();
      accounts.forEach((account) => {
        const value = getAccountValue(account.id, periodId);
        result.set(account.id, value);
      });
      return result;
    },
    [accounts, getAccountValue]
  );

  // データストアの統計情報
  const dataStoreStats = useCallback(() => {
    return {
      totalValues: financialValues.size,
      hasDataStore: dataStore !== null,
      isReady: dataStore !== null && financialValues.size > 0,
    };
  }, [dataStore, financialValues]);

  return {
    // 財務数値データ
    financialValues,
    dataStore,

    // 値の取得
    getAccountValue,
    getAccountValuesForAllPeriods,
    getPeriodValuesForAllAccounts,

    // 値の更新
    updateFinancialValue,
    updateFinancialValues,
    setFinancialValues,

    // 統計情報
    dataStoreStats,
  };
};
