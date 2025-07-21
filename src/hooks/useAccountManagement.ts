import { useCallback } from "react";
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

interface UseAccountManagementProps {
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  onStructureChange?: () => void;
}

interface AccountHierarchyNode {
  account: Account;
  children: AccountHierarchyNode[];
}

/**
 * 勘定科目の管理を行うフック
 * CRUD操作と階層構造の管理を責任とする
 */
export const useAccountManagement = ({
  accounts,
  setAccounts,
  onStructureChange,
}: UseAccountManagementProps) => {
  // 勘定科目の追加
  const addAccount = useCallback(
    (
      accountData: Partial<Account> & { accountName: string; sheet: SheetType }
    ) => {
      // 構造が変更されたことを通知
      onStructureChange?.();

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
            parameter: baseAccountData.parameter as any,
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
    [setAccounts, onStructureChange]
  );

  // 勘定科目の更新
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
              onStructureChange?.();
            }
            // 型安全な更新のため、既存のアカウントの構造を保持
            return { ...account, ...updates } as Account;
          }
          return account;
        })
      );
    },
    [setAccounts, onStructureChange]
  );

  // 勘定科目の削除
  const deleteAccount = useCallback(
    (id: string) => {
      setAccounts((prev) => prev.filter((account) => account.id !== id));
      // 構造が変更されたことを通知
      onStructureChange?.();
    },
    [setAccounts, onStructureChange]
  );

  // パラメータの設定
  const setParameter = useCallback(
    (accountId: string, parameter: Parameter) => {
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === accountId
            ? ({ ...account, parameter } as Account)
            : account
        )
      );
      // パラメータ変更は構造変更として通知
      onStructureChange?.();
    },
    [setAccounts, onStructureChange]
  );

  // シートごとの勘定科目取得
  const getAccountsBySheet = useCallback(
    (sheet: SheetType): Account[] => {
      return accounts.filter((account) => account.sheet === sheet);
    },
    [accounts]
  );

  // 親科目ごとの勘定科目取得
  const getAccountsByParent = useCallback(
    (parentId: string | null): Account[] => {
      return accounts.filter((account) => account.parentId === parentId);
    },
    [accounts]
  );

  // 階層構造の取得
  const getAccountHierarchy = useCallback(
    (rootId?: string): AccountHierarchyNode[] => {
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

  // パラメータの取得
  const getAccountParameter = useCallback(
    (accountId: string): Parameter | undefined => {
      const account = accounts.find((acc) => acc.id === accountId);
      return account?.parameter;
    },
    [accounts]
  );

  // パラメータの設定（別名）
  const setAccountParameter = useCallback(
    (accountId: string, parameter: Parameter) => {
      setParameter(accountId, parameter);
    },
    [setParameter]
  );

  return {
    // CRUD操作
    addAccount,
    updateAccount,
    deleteAccount,
    setParameter,
    
    // 取得関数
    getAccountsBySheet,
    getAccountsByParent,
    getAccountHierarchy,
    getAccountParameter,
    setAccountParameter,
  };
};