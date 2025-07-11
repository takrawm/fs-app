import React from "react";
import type { Account } from "../../types/account";
import type { Period } from "../../types/financial";
import { formatNumber } from "../../utils/formatting";
import { CATEGORY_COLORS } from "../../utils/constants";
import { Trash2, Edit } from "lucide-react";

interface AccountTableProps {
  accounts: Account[];
  periods: Period[];
  getAccountValue: (accountId: string, periodId: string) => number;
  onEditAccount: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => void;
}

export const AccountTable: React.FC<AccountTableProps> = ({
  accounts,
  periods,
  getAccountValue,
  onEditAccount,
  onDeleteAccount,
}) => {
  const groupedAccounts = accounts.reduce((groups, account) => {
    const category = account.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(account);
    return groups;
  }, {} as Record<string, Account[]>);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              科目名
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              カテゴリ
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              詳細
            </th>
            {periods.map(period => (
              <th
                key={period.id}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {period.name}
              </th>
            ))}
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Object.entries(groupedAccounts).map(([category, categoryAccounts]) => (
            <React.Fragment key={category}>
              <tr className="bg-gray-50">
                <td
                  colSpan={3 + periods.length + 1}
                  className={`px-6 py-2 text-sm font-semibold ${CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}`}
                >
                  {category}
                </td>
              </tr>
              {categoryAccounts.map(account => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {account.name}
                      </div>
                      {account.isCFItem && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          CF
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {account.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {account.detailType || "-"}
                  </td>
                  {periods.map(period => (
                    <td
                      key={period.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-right"
                    >
                      <span className={`${
                        getAccountValue(account.id, period.id) < 0 
                          ? "text-red-600" 
                          : "text-gray-900"
                      }`}>
                        {formatNumber(getAccountValue(account.id, period.id))}
                      </span>
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onEditAccount(account.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="編集"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteAccount(account.id)}
                        className="text-red-600 hover:text-red-900"
                        title="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};