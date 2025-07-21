import { useState, useEffect } from "react";
import { seedDataLoader } from "../seed";
import type { Account } from "../types/accountTypes";
import type { Period } from "../types/periodTypes";
import type { FinancialValue } from "../types/financialValueTypes";

/**
 * 財務データの初期化を管理するフック
 * seedデータの読み込みと初期化のみを責任とする
 */
export const useFinancialDataInitializer = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [financialValues, setFinancialValues] = useState<Map<string, FinancialValue>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // seedデータの初期化
  useEffect(() => {
    const initializeSeedData = async () => {
      try {
        setIsLoading(true);
        setError(null);

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
      } catch (err) {
        console.error("Failed to initialize seed data:", err);
        setError(err instanceof Error ? err : new Error("Failed to initialize seed data"));
      } finally {
        setIsLoading(false);
      }
    };

    initializeSeedData();
  }, []);

  return {
    // 初期データ
    initialAccounts: accounts,
    initialPeriods: periods,
    initialFinancialValues: financialValues,
    
    // 状態
    isLoading,
    error,
    
    // ユーティリティ
    seedDataLoader,
  };
};