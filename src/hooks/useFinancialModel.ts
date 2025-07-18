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
} from "../types/calculationTypes";
import type { FinancialValue } from "../types/financialValueTypes";

import { seedDataLoader } from "../seed";

export const useFinancialModel = () => {
  // FinancialModelManagerを削除し、全ての状態をReactで管理
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [parameters, setParameters] = useState<Map<string, Parameter>>(
    new Map()
  );
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

        // パラメータをアカウントから抽出
        const parametersMap = new Map<string, Parameter>();
        seedAccounts.forEach((account) => {
          if (account.parameter) {
            parametersMap.set(account.id, account.parameter);
          }
        });
        setParameters(parametersMap);

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
      setParameters((prev) => {
        const newParams = new Map(prev);
        newParams.set(accountId, parameter);
        return newParams;
      });
    },
    []
  );

  const calculatePeriod = useCallback(
    (periodId: string) => {
      setIsCalculating(true);
      setCalculationErrors([]);

      try {
        // 現在と前期の値をイミュータブルなMapとして準備
        const currentValues = new Map<string, number>();
        const previousPeriodValues = new Map<string, number>();

        // 手動入力値や既存値を設定
        financialValues.forEach((value) => {
          if (value.periodId === periodId) {
            currentValues.set(value.accountId, value.value);
          }
        });

        // 前期値を設定
        const periodIndex = periods.findIndex((p) => p.id === periodId);
        if (periodIndex > 0) {
          const previousPeriodId = periods[periodIndex - 1].id;
          financialValues.forEach((value) => {
            if (value.periodId === previousPeriodId) {
              previousPeriodValues.set(value.accountId, value.value);
            }
          });
        }

        // 純粋関数による計算実行
        const { results, calculatedValues, errors } =
          FinancialCalculator.calculatePeriod(
            accounts,
            periodId,
            currentValues,
            previousPeriodValues,
            parameters
          );

        // 計算結果で状態を更新
        setCalculationResults(results);
        setFinancialValues((prev) => {
          const newMap = new Map(prev);
          calculatedValues.forEach((value, key) => {
            newMap.set(key, value);
          });
          return newMap;
        });
        setCalculationErrors(errors);

        return results;
      } catch (error) {
        console.error("Calculation error:", error);
        throw error;
      } finally {
        setIsCalculating(false);
      }
    },
    [accounts, periods, parameters, financialValues]
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
    setIsCalculating(true);
    setCalculationErrors([]);

    try {
      // 初期値を設定
      const initialValues = new Map<string, number>();
      accounts.forEach((account) => {
        if (
          account.parameter.paramType === "MANUAL_INPUT" ||
          account.parameter.paramType === "CONSTANT"
        ) {
          initialValues.set(account.id, account.parameter.paramValue || 0);
        }
      });

      // 複数期間を一括計算
      const { allResults, allValues, allErrors } =
        FinancialCalculator.calculateMultiplePeriods(
          accounts,
          periods,
          initialValues,
          parameters
        );

      // 結果をフラット化
      const flatResults = new Map<string, CalculationResult>();
      const flatValues = new Map<string, FinancialValue>();
      const flatErrors: CalculationError[] = [];

      allResults.forEach((periodResults, periodId) => {
        periodResults.forEach((result, accountId) => {
          flatResults.set(`${accountId}_${periodId}`, result);
        });
      });

      allValues.forEach((periodValues, periodId) => {
        periodValues.forEach((value, key) => {
          flatValues.set(key, value);
        });
      });

      allErrors.forEach((errors) => {
        flatErrors.push(...errors);
      });

      // 状態を更新
      setCalculationResults(flatResults);
      setFinancialValues(new Map([...financialValues, ...flatValues]));
      setCalculationErrors(flatErrors);

      return flatResults;
    } catch (error) {
      console.error("All periods calculation error:", error);
      throw error;
    } finally {
      setIsCalculating(false);
    }
  }, [accounts, periods, parameters, financialValues]);

  const getAccountValue = useCallback(
    (accountId: string, periodId: string): number => {
      // 1. 計算結果を優先して取得
      const result = calculationResults.get(`${accountId}_${periodId}`);
      if (result !== undefined) {
        return result.value;
      }

      // 2. 計算結果がない場合、財務数値から取得
      const financialValue = financialValues.get(`${accountId}_${periodId}`);
      return financialValue?.value || 0;
    },
    [calculationResults, financialValues]
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
      return parameters.get(accountId);
    },
    [parameters]
  );

  const setAccountParameter = useCallback(
    (accountId: string, parameter: Parameter) => {
      setParameters((prev) => {
        const newParams = new Map(prev);
        newParams.set(accountId, parameter);
        return newParams;
      });
    },
    []
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
      const parameter = parameters.get(account.id);
      const paramType = parameter?.paramType || "NULL";
      acc[paramType] = (acc[paramType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { bySheet, byParameter };
  }, [accounts, parameters]);

  return {
    // 基本データ
    accounts,
    periods,
    parameters,
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
