// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
import React from "react";
import { useState, useEffect } from "react";
import { Header } from "./components/layout/Header";
import { ControlPanel } from "./components/layout/ControlPanel";

import { AccountTable } from "./components/accounts/AccountTable";
import { useFinancialModel } from "./hooks/useFinancialModel";
import type { Account } from "./types/accountTypes";

function App() {
  const {
    accounts,
    periods,
    selectedPeriodId,
    setSelectedPeriodId,
    isCalculating,

    addAccount,
    deleteAccount,

    addPeriod,

    calculateCurrentPeriod,
    calculateAllPeriods,
    getAccountValue,
  } = useFinancialModel();

  const [showAccountForm, setShowAccountForm] = useState(false);

  const handleAddAccount = (account: Omit<Account, "id">) => {
    addAccount(account);
    setShowAccountForm(false);
  };

  const handleAddPeriod = () => {
    const currentYear = new Date().getFullYear();
    const nextOrder = periods.length + 1;

    const newPeriod = {
      id: `period_${Date.now()}`,
      name: `${currentYear + nextOrder - 1}年3月期`,
      year: currentYear + nextOrder - 1,
      month: 3,
      financialYear: currentYear + nextOrder - 1,
      isAnnual: false,
      isForecast: true,
      sequence: nextOrder,
    };
    addPeriod(newPeriod);
  };

  const handleEditAccount = (accountId: string) => {
    console.log("Edit account:", accountId);
  };

  const handleDeleteAccount = (accountId: string) => {
    if (
      window.confirm(
        "この科目を削除しますか？関連するキャッシュフロー項目も削除されます。"
      )
    ) {
      deleteAccount(accountId);
    }
  };

  const handleCalculate = async () => {
    try {
      await calculateCurrentPeriod();
    } catch (error) {
      console.error("計算エラー:", error);
      alert("計算中にエラーが発生しました。");
    }
  };

  const handleCalculateAll = async () => {
    try {
      await calculateAllPeriods();
    } catch (error) {
      console.error("計算エラー:", error);
      alert("計算中にエラーが発生しました。");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <ControlPanel
        periods={periods}
        selectedPeriodId={selectedPeriodId}
        onPeriodChange={setSelectedPeriodId}
        onAddAccount={() => setShowAccountForm(true)}
        onAddPeriod={handleAddPeriod}
        onCalculate={handleCalculate}
        onCalculateAll={handleCalculateAll}
        isCalculating={isCalculating}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">勘定科目一覧</h2>
          </div>

          <AccountTable
            accounts={accounts}
            periods={periods}
            getAccountValue={getAccountValue}
            onEditAccount={handleEditAccount}
            onDeleteAccount={handleDeleteAccount}
          />
        </div>
      </main>

      {showAccountForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">勘定科目作成</h2>
            <p className="text-gray-600 mb-4">
              勘定科目作成フォームは現在開発中です。
            </p>
            <button
              onClick={() => setShowAccountForm(false)}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
