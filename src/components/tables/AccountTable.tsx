import React from "react";
import type { Account, SheetType } from "../../types/account";
import type { Period } from "../../types/newFinancialTypes";
import { formatNumber } from "../../utils/formatting";
import { 
  SHEET_TYPE_COLORS, 
  SHEET_TYPE_LABELS,
  CF_IMPACT_TYPE_LABELS,
  NEW_PARAMETER_TYPE_LABELS
} from "../../utils/constants";
import { Trash2, Edit, Eye, ArrowRight } from "lucide-react";

interface AccountTableProps {
  accounts: Account[];
  periods: Period[];
  getAccountValue: (accountId: string, periodId: string) => number;
  onEditAccount: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onViewAccountDetails?: (accountId: string) => void;
  groupBySheet?: boolean;
  showHierarchy?: boolean;
}

export const AccountTable: React.FC<AccountTableProps> = ({
  accounts,
  periods,
  getAccountValue,
  onEditAccount,
  onDeleteAccount,
  onViewAccountDetails,
  groupBySheet = true,
  showHierarchy = true,
}) => {
  // アカウントをシートタイプでグループ化
  const groupedAccounts = groupBySheet
    ? accounts.reduce((groups, account) => {
        const sheet = account.sheet;
        if (!groups[sheet]) {
          groups[sheet] = [];
        }
        groups[sheet].push(account);
        return groups;
      }, {} as Record<SheetType, Account[]>)
    : { all: accounts };

  // 階層表示用の整理
  const organizeAccountHierarchy = (accounts: Account[]) => {
    const accountMap = new Map<string, Account>();
    const rootAccounts: Account[] = [];
    
    accounts.forEach(account => {
      accountMap.set(account.id, account);
    });
    
    accounts.forEach(account => {
      if (!account.parentId) {
        rootAccounts.push(account);
      }
    });
    
    return rootAccounts.sort((a, b) => {
      const aOrder = a.displayOrder;
      const bOrder = b.displayOrder;
      
      if (aOrder.sheetOrder !== bOrder.sheetOrder) {
        return aOrder.sheetOrder - bOrder.sheetOrder;
      }
      if (aOrder.sectionOrder !== bOrder.sectionOrder) {
        return aOrder.sectionOrder - bOrder.sectionOrder;
      }
      return aOrder.itemOrder - bOrder.itemOrder;
    });
  };

  const getChildAccounts = (parentId: string, allAccounts: Account[]): Account[] => {
    return allAccounts
      .filter(account => account.parentId === parentId)
      .sort((a, b) => {
        const aOrder = a.displayOrder;
        const bOrder = b.displayOrder;
        return aOrder.itemOrder - bOrder.itemOrder;
      });
  };

  const renderAccountRow = (account: Account, level: number = 0) => {
    const indent = level * 20;
    const childAccounts = getChildAccounts(account.id, accounts);
    
    return (
      <React.Fragment key={account.id}>
        <tr className="bg-white hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center" style={{ marginLeft: `${indent}px` }}>
              {level > 0 && (
                <ArrowRight size={16} className="mr-2 text-gray-400" />
              )}
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {account.accountName}
                </div>
                {account.parameter.description && (
                  <div className="text-xs text-gray-500">
                    {account.parameter.description}
                  </div>
                )}
              </div>
            </div>
          </td>
          
          <td className="px-6 py-4 whitespace-nowrap">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${SHEET_TYPE_COLORS[account.sheet]} bg-gray-100`}>
              {SHEET_TYPE_LABELS[account.sheet]}
            </span>
          </td>
          
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <div className="space-y-1">
              <div>
                借方・貸方: {
                  account.isCredit === true ? "貸方" : 
                  account.isCredit === false ? "借方" : "適用外"
                }
              </div>
              <div>
                パラメータ: {NEW_PARAMETER_TYPE_LABELS[account.parameter.type]}
              </div>
              <div>
                CFインパクト: {CF_IMPACT_TYPE_LABELS[account.cfImpact.type]}
              </div>
            </div>
          </td>
          
          {periods.map(period => (
            <td
              key={period.id}
              className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"
            >
              {formatNumber(getAccountValue(account.id, period.id))}
            </td>
          ))}
          
          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <div className="flex items-center space-x-2">
              {onViewAccountDetails && (
                <button
                  onClick={() => onViewAccountDetails(account.id)}
                  className="text-blue-600 hover:text-blue-900"
                  title="詳細を表示"
                >
                  <Eye size={16} />
                </button>
              )}
              <button
                onClick={() => onEditAccount(account.id)}
                className="text-indigo-600 hover:text-indigo-900"
                title="編集"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => onDeleteAccount(account.id)}
                className="text-red-600 hover:text-red-900"
                title="削除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </td>
        </tr>
        
        {/* 子アカウントの再帰的レンダリング */}
        {showHierarchy && childAccounts.map(child => renderAccountRow(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              科目名
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              シートタイプ
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              詳細
            </th>
            {periods.map(period => (
              <th
                key={period.id}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {period.displayName}
              </th>
            ))}
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        
        <tbody className="bg-white divide-y divide-gray-200">
          {Object.entries(groupedAccounts).map(([groupKey, groupAccounts]) => (
            <React.Fragment key={groupKey}>
              {/* グループヘッダー（シート別表示の場合） */}
              {groupBySheet && groupKey !== "all" && (
                <tr className="bg-gray-100">
                  <td 
                    colSpan={3 + periods.length + 1}
                    className="px-6 py-3 text-sm font-medium text-gray-900"
                  >
                    <div className="flex items-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${SHEET_TYPE_COLORS[groupKey as SheetType]} bg-gray-200 mr-2`}>
                        {SHEET_TYPE_LABELS[groupKey as SheetType]}
                      </span>
                      <span>({groupAccounts.length}件)</span>
                    </div>
                  </td>
                </tr>
              )}
              
              {/* アカウント行 */}
              {showHierarchy
                ? organizeAccountHierarchy(groupAccounts).map(account => renderAccountRow(account))
                : groupAccounts.map(account => renderAccountRow(account))
              }
            </React.Fragment>
          ))}
        </tbody>
      </table>
      
      {/* 合計行（必要に応じて） */}
      <tfoot className="bg-gray-50">
        <tr>
          <td colSpan={3} className="px-6 py-3 text-sm font-medium text-gray-900">
            合計 ({accounts.length}件)
          </td>
          {periods.map(period => {
            const total = accounts.reduce((sum, account) => {
              return sum + getAccountValue(account.id, period.id);
            }, 0);
            
            return (
              <td
                key={period.id}
                className="px-6 py-3 text-right text-sm font-medium text-gray-900"
              >
                {formatNumber(total)}
              </td>
            );
          })}
          <td className="px-6 py-3"></td>
        </tr>
      </tfoot>
    </div>
  );
};