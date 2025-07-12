import React, { useMemo, useRef, useCallback } from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import Handsontable from "handsontable";
import "handsontable/dist/handsontable.full.css";
import type { Account, SheetType } from "../../types/account";
import type { Period } from "../../types/account";
import { formatNumber } from "../../utils/formatting";
import { 
  SHEET_TYPE_COLORS, 
  SHEET_TYPE_LABELS,
  CF_IMPACT_TYPE_LABELS,
  NEW_PARAMETER_TYPE_LABELS
} from "../../utils/constants";

// Handsontableのモジュールを登録
registerAllModules();

interface AccountTableProps {
  accounts: Account[];
  periods: Period[];
  getAccountValue: (accountId: string, periodId: string) => number;
  onEditAccount: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onViewAccountDetails?: (accountId: string) => void;
  groupBySheet?: boolean;
  showHierarchy?: boolean;
  onValueChange?: (accountId: string, periodId: string, newValue: number) => void;
}

// カスタムレンダラー: 科目名（階層表示）
const accountNameRenderer = (
  instance: Handsontable,
  td: HTMLTableCellElement,
  row: number,
  col: number,
  prop: string | number,
  value: any,
  cellProperties: Handsontable.CellProperties
) => {
  const account = cellProperties.account as Account;
  const level = cellProperties.level as number || 0;
  
  td.innerHTML = "";
  td.className = "htLeft htMiddle";
  
  const container = document.createElement("div");
  container.className = "flex items-center";
  container.style.marginLeft = `${level * 20}px`;
  
  if (level > 0) {
    const arrow = document.createElement("span");
    arrow.innerHTML = "→";
    arrow.className = "mr-2 text-gray-400";
    container.appendChild(arrow);
  }
  
  const nameDiv = document.createElement("div");
  nameDiv.className = "text-sm font-medium text-gray-900";
  nameDiv.textContent = value;
  container.appendChild(nameDiv);
  
  td.appendChild(container);
  return td;
};

// カスタムレンダラー: シートタイプ
const sheetTypeRenderer = (
  instance: Handsontable,
  td: HTMLTableCellElement,
  row: number,
  col: number,
  prop: string | number,
  value: any,
  cellProperties: Handsontable.CellProperties
) => {
  const account = cellProperties.account as Account;
  
  td.innerHTML = "";
  td.className = "htCenter htMiddle";
  
  const badge = document.createElement("span");
  badge.className = `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${SHEET_TYPE_COLORS[account.sheet]} bg-gray-100`;
  badge.textContent = SHEET_TYPE_LABELS[account.sheet];
  
  td.appendChild(badge);
  return td;
};

// カスタムレンダラー: 詳細情報
const detailsRenderer = (
  instance: Handsontable,
  td: HTMLTableCellElement,
  row: number,
  col: number,
  prop: string | number,
  value: any,
  cellProperties: Handsontable.CellProperties
) => {
  const account = cellProperties.account as Account;
  
  td.innerHTML = "";
  td.className = "htLeft htMiddle";
  
  const container = document.createElement("div");
  container.className = "space-y-1 text-sm text-gray-500";
  
  const creditDiv = document.createElement("div");
  creditDiv.textContent = `借方・貸方: ${
    account.isCredit === true ? "貸方" : 
    account.isCredit === false ? "借方" : "適用外"
  }`;
  container.appendChild(creditDiv);
  
  const paramDiv = document.createElement("div");
  paramDiv.textContent = `パラメータ: ${NEW_PARAMETER_TYPE_LABELS[account.parameter.type]}`;
  container.appendChild(paramDiv);
  
  const cfDiv = document.createElement("div");
  cfDiv.textContent = `CFインパクト: ${CF_IMPACT_TYPE_LABELS[account.cfImpact.type]}`;
  container.appendChild(cfDiv);
  
  td.appendChild(container);
  return td;
};

// カスタムレンダラー: 数値（編集可能）
const numberRenderer = (
  instance: Handsontable,
  td: HTMLTableCellElement,
  row: number,
  col: number,
  prop: string | number,
  value: any,
  cellProperties: Handsontable.CellProperties
) => {
  td.innerHTML = "";
  td.className = "htRight htMiddle";
  td.textContent = formatNumber(value || 0);
  
  // 編集可能セルの背景色
  if (!cellProperties.readOnly) {
    td.style.backgroundColor = "#f0f9ff";
  }
  
  return td;
};

// カスタムレンダラー: 操作ボタン
const actionsRenderer = (
  instance: Handsontable,
  td: HTMLTableCellElement,
  row: number,
  col: number,
  prop: string | number,
  value: any,
  cellProperties: Handsontable.CellProperties
) => {
  const account = cellProperties.account as Account;
  const handlers = cellProperties.handlers as any;
  
  td.innerHTML = "";
  td.className = "htCenter htMiddle";
  
  const container = document.createElement("div");
  container.className = "flex items-center justify-center space-x-2";
  
  // 詳細表示ボタン
  if (handlers.onViewAccountDetails) {
    const viewBtn = document.createElement("button");
    viewBtn.className = "text-blue-600 hover:text-blue-900 p-1";
    viewBtn.title = "詳細を表示";
    viewBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    viewBtn.onclick = () => handlers.onViewAccountDetails(account.id);
    container.appendChild(viewBtn);
  }
  
  // 編集ボタン
  const editBtn = document.createElement("button");
  editBtn.className = "text-indigo-600 hover:text-indigo-900 p-1";
  editBtn.title = "編集";
  editBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
  editBtn.onclick = () => handlers.onEditAccount(account.id);
  container.appendChild(editBtn);
  
  // 削除ボタン
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "text-red-600 hover:text-red-900 p-1";
  deleteBtn.title = "削除";
  deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
  deleteBtn.onclick = () => handlers.onDeleteAccount(account.id);
  container.appendChild(deleteBtn);
  
  td.appendChild(container);
  return td;
};

export const AccountTable: React.FC<AccountTableProps> = ({
  accounts,
  periods,
  getAccountValue,
  onEditAccount,
  onDeleteAccount,
  onViewAccountDetails,
  groupBySheet = true,
  showHierarchy = true,
  onValueChange,
}) => {
  const hotTableRef = useRef<HotTable>(null);
  
  // アカウントを階層構造に整理
  const organizeAccountsForTable = useCallback(() => {
    const accountMap = new Map<string, Account>();
    const result: Array<{ account: Account; level: number }> = [];
    
    // アカウントマップを作成
    accounts.forEach(account => {
      accountMap.set(account.id, account);
    });
    
    // 階層を構築する再帰関数
    const addAccountWithChildren = (account: Account, level: number) => {
      result.push({ account, level });
      
      // 子アカウントを検索して追加
      const children = accounts
        .filter(a => a.parentId === account.id)
        .sort((a, b) => a.displayOrder.itemOrder - b.displayOrder.itemOrder);
      
      children.forEach(child => addAccountWithChildren(child, level + 1));
    };
    
    // ルートアカウントから開始
    const rootAccounts = accounts
      .filter(account => !account.parentId)
      .sort((a, b) => a.displayOrder.order.localeCompare(b.displayOrder.order));
    
    // シートタイプごとにグループ化
    if (groupBySheet) {
      const groupedAccounts = rootAccounts.reduce((groups, account) => {
        const sheet = account.sheet;
        if (!groups[sheet]) {
          groups[sheet] = [];
        }
        groups[sheet].push(account);
        return groups;
      }, {} as Record<SheetType, Account[]>);
      
      Object.entries(groupedAccounts).forEach(([sheet, sheetAccounts]) => {
        sheetAccounts.forEach(account => {
          if (showHierarchy) {
            addAccountWithChildren(account, 0);
          } else {
            result.push({ account, level: 0 });
          }
        });
      });
    } else {
      rootAccounts.forEach(account => {
        if (showHierarchy) {
          addAccountWithChildren(account, 0);
        } else {
          result.push({ account, level: 0 });
        }
      });
    }
    
    return result;
  }, [accounts, groupBySheet, showHierarchy]);
  
  // Handsontableのデータ構造に変換
  const { data, columns, accountMap } = useMemo(() => {
    const accountsWithLevel = organizeAccountsForTable();
    
    // アカウントIDマップを作成
    const accountIdToRowMap = new Map<string, number>();
    accountsWithLevel.forEach((item, index) => {
      accountIdToRowMap.set(item.account.id, index);
    });
    
    // データ行を構築
    const tableData = accountsWithLevel.map(({ account, level }) => {
      const row: any = {
        accountId: account.id,
        accountName: account.accountName,
        sheet: account.sheet,
        details: account,
        level: level,
      };
      
      // 各期間の値を追加
      periods.forEach(period => {
        row[`period_${period.id}`] = getAccountValue(account.id, period.id);
      });
      
      row.actions = account;
      
      return row;
    });
    
    // カラム定義
    const tableColumns: Handsontable.ColumnSettings[] = [
      {
        data: "accountName",
        title: "科目名",
        renderer: accountNameRenderer,
        readOnly: true,
        width: 250,
      },
      {
        data: "sheet",
        title: "シートタイプ",
        renderer: sheetTypeRenderer,
        readOnly: true,
        width: 150,
      },
      {
        data: "details",
        title: "詳細",
        renderer: detailsRenderer,
        readOnly: true,
        width: 200,
      },
      ...periods.map(period => ({
        data: `period_${period.id}`,
        title: period.displayName,
        type: "numeric" as const,
        renderer: numberRenderer,
        readOnly: !onValueChange,
        width: 120,
      })),
      {
        data: "actions",
        title: "操作",
        renderer: actionsRenderer,
        readOnly: true,
        width: 120,
      },
    ];
    
    return {
      data: tableData,
      columns: tableColumns,
      accountMap: accountIdToRowMap,
    };
  }, [accounts, periods, getAccountValue, onValueChange, organizeAccountsForTable]);
  
  // セルのプロパティを設定
  const cells = useCallback((row: number, col: number) => {
    const rowData = data[row];
    if (!rowData) return {};
    
    const account = accounts.find(a => a.id === rowData.accountId);
    if (!account) return {};
    
    return {
      account: account,
      level: rowData.level,
      handlers: {
        onEditAccount,
        onDeleteAccount,
        onViewAccountDetails,
      },
    };
  }, [data, accounts, onEditAccount, onDeleteAccount, onViewAccountDetails]);
  
  // 値の変更ハンドラー
  const afterChange = useCallback((changes: Handsontable.CellChange[] | null) => {
    if (!changes || !onValueChange) return;
    
    changes.forEach(([row, prop, oldValue, newValue]) => {
      if (typeof prop === "string" && prop.startsWith("period_")) {
        const periodId = prop.replace("period_", "");
        const accountId = data[row].accountId;
        const numericValue = parseFloat(newValue as string) || 0;
        
        if (numericValue !== oldValue) {
          onValueChange(accountId, periodId, numericValue);
        }
      }
    });
  }, [data, onValueChange]);
  
  // Handsontableの設定
  const hotSettings: Handsontable.GridSettings = {
    data: data,
    columns: columns,
    cells: cells,
    afterChange: afterChange,
    stretchH: "all",
    autoWrapRow: true,
    height: "auto",
    maxRows: data.length,
    manualRowResize: true,
    manualColumnResize: true,
    manualRowMove: false,
    manualColumnMove: false,
    contextMenu: {
      items: {
        "row_above": {
          name: "上に行を挿入",
          disabled: true,
        },
        "row_below": {
          name: "下に行を挿入",
          disabled: true,
        },
        "remove_row": {
          name: "行を削除",
          disabled: true,
        },
        "separator": "---------",
        "copy": {
          name: "コピー",
        },
        "cut": {
          name: "切り取り",
          disabled: true,
        },
      },
    },
    columnSorting: true,
    filters: true,
    dropdownMenu: true,
    hiddenColumns: {
      indicators: true,
    },
    nestedHeaders: groupBySheet ? [
      columns.map((col, index) => {
        if (index < 3 || index === columns.length - 1) return col.title;
        return {
          label: col.title,
          colspan: 1,
        };
      }),
    ] : undefined,
    fixedColumnsStart: 3,
    className: "htCenter htMiddle",
    licenseKey: "non-commercial-and-evaluation",
  };
  
  return (
    <div className="w-full">
      <style jsx global>{`
        .handsontable {
          font-size: 14px;
        }
        
        .handsontable th {
          background-color: #f9fafb;
          font-weight: 500;
          text-transform: uppercase;
          font-size: 12px;
          color: #6b7280;
          letter-spacing: 0.05em;
        }
        
        .handsontable td {
          background-color: white;
          border-color: #e5e7eb;
        }
        
        .handsontable tr:hover td {
          background-color: #f9fafb;
        }
        
        .handsontable .htFilters {
          background-color: #f3f4f6;
        }
        
        .handsontable .changeType {
          background-color: #e0f2fe;
        }
        
        .ht_clone_top {
          z-index: 101;
        }
        
        .ht_clone_left {
          z-index: 102;
        }
        
        .ht_clone_top_left_corner {
          z-index: 103;
        }
      `}</style>
      
      <HotTable
        ref={hotTableRef}
        settings={hotSettings}
      />
      
      {/* 合計行 */}
      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">
            合計 ({accounts.length}件)
          </div>
          <div className="flex space-x-4">
            {periods.map(period => {
              const total = accounts.reduce((sum, account) => {
                return sum + getAccountValue(account.id, period.id);
              }, 0);
              
              return (
                <div key={period.id} className="text-right">
                  <div className="text-xs text-gray-500">{period.displayName}</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatNumber(total)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};