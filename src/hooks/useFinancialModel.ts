import { useState, useCallback, useMemo } from "react";
import * as React from "react";
import type { SheetType } from "../types/accountTypes";

// 各層のフックをインポート
import { useFinancialDataInitializer } from "./useFinancialDataInitializer";
import { useAccountManagement } from "./useAccountManagement";
import { usePeriodManagement } from "./usePeriodManagement";
import { useFinancialDataStore } from "./useFinancialDataStore";
import { useFinancialCalculations } from "./useFinancialCalculations";

/**
 * 財務モデル全体を管理する統合フック
 * 各層のフックを組み合わせて既存のインターフェースを維持
 */
export const useFinancialModel = () => {
  // データ初期化層
  const {
    initialAccounts,
    initialPeriods,
    initialFinancialValues,
    isLoading,
    seedDataLoader,
  } = useFinancialDataInitializer();

  // 状態管理
  const [accounts, setAccounts] = useState(initialAccounts);
  const [periods, setPeriods] = useState(initialPeriods);

  // 初期データをaccountsとperiodsに反映
  React.useEffect(() => {
    if (initialAccounts.length > 0) {
      setAccounts(initialAccounts);
    }
  }, [initialAccounts]);

  React.useEffect(() => {
    if (initialPeriods.length > 0) {
      setPeriods(initialPeriods);
    }
  }, [initialPeriods]);

  // 期間管理層
  const periodManagement = usePeriodManagement({
    initialPeriods: periods,
    onPeriodsChange: setPeriods,
  });

  // データストア層
  const dataStoreLayer = useFinancialDataStore({
    accounts,
    periods,
    initialFinancialValues,
  });

  // 計算処理層
  const calculations = useFinancialCalculations({
    accounts,
    setAccounts,
    periods,
    financialValues: dataStoreLayer.financialValues,
    setFinancialValues: dataStoreLayer.setFinancialValues,
    periodIndexSystem: periodManagement.periodIndexSystem,
    dataStore: dataStoreLayer.dataStore,
  });

  // 勘定科目管理層
  const accountManagement = useAccountManagement({
    accounts,
    setAccounts,
    onStructureChange: () => calculations.markStructureDirty(),
  });

  // 現在選択中の期間の計算を実行
  const calculateCurrentPeriod = useCallback(() => {
    return calculations.calculateCurrentPeriod(periodManagement.selectedPeriodId);
  }, [calculations, periodManagement.selectedPeriodId]);

  // モデルの検証
  const validateModel = useCallback(() => {
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
    financialValues: dataStoreLayer.financialValues,

    calculationResults: calculations.calculationResults,
    calculationErrors: calculations.calculationErrors,
    selectedPeriodId: periodManagement.selectedPeriodId,
    isCalculating: calculations.isCalculating,
    isLoading,

    // 操作関数
    addAccount: accountManagement.addAccount,
    updateAccount: accountManagement.updateAccount,
    deleteAccount: accountManagement.deleteAccount,
    addPeriod: periodManagement.addPeriod,
    setParameter: accountManagement.setParameter,
    calculatePeriod: calculations.calculatePeriod,
    calculateCashFlow: calculations.calculateCashFlow,
    calculateCurrentPeriod,
    calculateAllPeriods: calculations.calculateAllPeriods,

    // 取得関数
    getAccountValue: dataStoreLayer.getAccountValue,
    getAccountsBySheet: accountManagement.getAccountsBySheet,
    getAccountsByParent: accountManagement.getAccountsByParent,
    getAccountHierarchy: accountManagement.getAccountHierarchy,
    getAccountParameter: accountManagement.getAccountParameter,
    setAccountParameter: accountManagement.setAccountParameter,

    // ユーティリティ
    validateModel,
    calculationStats: calculations.calculationStats,
    accountStats,

    // 期間選択
    setSelectedPeriodId: periodManagement.setSelectedPeriodId,

    // seedデータアクセス
    seedDataLoader,
  };
};