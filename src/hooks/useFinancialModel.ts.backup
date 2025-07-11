import { useState, useCallback, useMemo } from "react";
import { FinancialModelManager } from "../models/FinancialModelManager";
import type { Account, AccountCategory } from "../types/account";
import type { Parameter } from "../types/parameter";
import type { Period, CalculationResult } from "../types/financial";

export const useFinancialModel = () => {
  const [manager] = useState(() => new FinancialModelManager());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [calculationResults, setCalculationResults] = useState<Map<string, CalculationResult>>(new Map());
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const addAccount = useCallback((accountData: Partial<Account> & { name: string; category: AccountCategory }) => {
    const newAccount = manager.addAccount(accountData);
    setAccounts(manager.getAllAccounts());
    return newAccount;
  }, [manager]);

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    manager.updateAccount(id, updates);
    setAccounts(manager.getAllAccounts());
  }, [manager]);

  const deleteAccount = useCallback((id: string) => {
    manager.deleteAccount(id);
    setAccounts(manager.getAllAccounts());
  }, [manager]);

  const addPeriod = useCallback((periodData: Partial<Period> & { 
    name: string; 
    startDate: Date; 
    endDate: Date; 
    order: number 
  }) => {
    const newPeriod = manager.addPeriod(periodData);
    setPeriods(manager.getAllPeriods());
    
    if (!selectedPeriodId) {
      setSelectedPeriodId(newPeriod.id);
    }
    
    return newPeriod;
  }, [manager, selectedPeriodId]);

  const setParameter = useCallback((accountId: string, periodId: string, parameter: Parameter) => {
    manager.setParameter(accountId, periodId, parameter);
  }, [manager]);

  const getParameter = useCallback((accountId: string, periodId: string): Parameter | undefined => {
    return manager.getParameter(accountId, periodId);
  }, [manager]);

  const calculateCurrentPeriod = useCallback(async () => {
    if (!selectedPeriodId) return;

    setIsCalculating(true);
    try {
      const results = manager.calculatePeriod(selectedPeriodId);
      setCalculationResults(results);
    } catch (error) {
      console.error("Calculation error:", error);
      throw error;
    } finally {
      setIsCalculating(false);
    }
  }, [manager, selectedPeriodId]);

  const calculateAllPeriods = useCallback(async () => {
    setIsCalculating(true);
    const allResults = new Map<string, CalculationResult>();

    try {
      for (const period of periods) {
        const results = manager.calculatePeriod(period.id);
        results.forEach((result, accountId) => {
          allResults.set(`${accountId}_${period.id}`, result);
        });
      }
      setCalculationResults(allResults);
    } catch (error) {
      console.error("Calculation error:", error);
      throw error;
    } finally {
      setIsCalculating(false);
    }
  }, [manager, periods]);

  const getAccountValue = useCallback((accountId: string, periodId: string): number => {
    const result = calculationResults.get(`${accountId}_${periodId}`);
    return result?.value || 0;
  }, [calculationResults]);

  const accountTree = useMemo(() => {
    const tree: Map<string | undefined, Account[]> = new Map();
    
    accounts.forEach(account => {
      const children = tree.get(account.parentId) || [];
      children.push(account);
      tree.set(account.parentId, children);
    });

    return tree;
  }, [accounts]);

  const getRootAccounts = useCallback((): Account[] => {
    return accountTree.get(undefined) || [];
  }, [accountTree]);

  const getChildAccounts = useCallback((parentId: string): Account[] => {
    return accountTree.get(parentId) || [];
  }, [accountTree]);

  const initializeSampleData = useCallback(() => {
    const period1 = addPeriod({
      name: "2024年3月期",
      startDate: new Date("2023-04-01"),
      endDate: new Date("2024-03-31"),
      order: 1,
      isActual: true,
    });

    const period2 = addPeriod({
      name: "2025年3月期",
      startDate: new Date("2024-04-01"),
      endDate: new Date("2025-03-31"),
      order: 2,
      isActual: false,
    });

    const sales = addAccount({
      name: "売上高",
      category: "収益",
      detailType: "営業",
    });

    const cogs = addAccount({
      name: "売上原価",
      category: "費用",
      detailType: "営業",
    });

    setParameter(sales.id, period1.id, {
      id: `param_${sales.id}_${period1.id}`,
      accountId: sales.id,
      periodId: period1.id,
      config: { type: "参照", referenceId: sales.id },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setParameter(sales.id, period2.id, {
      id: `param_${sales.id}_${period2.id}`,
      accountId: sales.id,
      periodId: period2.id,
      config: { type: "成長率", value: 10 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setParameter(cogs.id, period1.id, {
      id: `param_${cogs.id}_${period1.id}`,
      accountId: cogs.id,
      periodId: period1.id,
      config: { type: "比率", value: 60, referenceId: sales.id },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setParameter(cogs.id, period2.id, {
      id: `param_${cogs.id}_${period2.id}`,
      accountId: cogs.id,
      periodId: period2.id,
      config: { type: "比率", value: 58, referenceId: sales.id },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }, [addAccount, addPeriod, setParameter]);

  return {
    accounts,
    periods,
    selectedPeriodId,
    setSelectedPeriodId,
    isCalculating,
    calculationResults,
    
    addAccount,
    updateAccount,
    deleteAccount,
    
    addPeriod,
    
    setParameter,
    getParameter,
    
    calculateCurrentPeriod,
    calculateAllPeriods,
    getAccountValue,
    
    getRootAccounts,
    getChildAccounts,
    
    initializeSampleData,
  };
};