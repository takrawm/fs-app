import { useState } from "react";
import { Header } from "./components/layout/Header";
import { ControlPanel } from "./components/layout/ControlPanel";

import { AccountTable } from "./components/accounts/AccountTable";
import { useFinancialModel } from "./hooks/useFinancialModel";

function App() {
  const {
    accounts,
    periods,
    selectedPeriodId,
    setSelectedPeriodId,
    isCalculating,
    deleteAccount,
    addPeriod,
    calculateSinglePeriod,
    calculateAllPeriods,
    getAccountValue,
  } = useFinancialModel();

  const [showAccountForm, setShowAccountForm] = useState(false);

  const handleAddPeriod = () => {
    // 既存の期間から最新の期間を取得
    const latestPeriod =
      periods.length > 0
        ? periods.reduce((latest, current) =>
            current.sequence > latest.sequence ? current : latest
          )
        : null;

    // 新しい期間の値を計算
    const newYear = latestPeriod
      ? latestPeriod.year + 1
      : new Date().getFullYear();
    const newMonth = latestPeriod ? latestPeriod.month : 3;
    const newSequence = latestPeriod ? latestPeriod.sequence + 1 : 1;

    const newPeriod = {
      id: `${newYear}-${newMonth.toString().padStart(2, "0")}-A`,
      name: `${newYear}年${newMonth}月`,
      year: newYear,
      month: newMonth,
      financialYear: newYear,
      isAnnual: true,
      isForecast: true,
      sequence: newSequence,
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

  // 現在は同期的な処理だが、将来的にAPI呼び出しやデータベース保存などの
  // 非同期処理を実装する可能性があるため、エラーハンドリングは維持
  const handleCalculate = () => {
    try {
      if (!selectedPeriodId) {
        alert("期間を選択してください");
        return;
      }
      calculateSinglePeriod(selectedPeriodId);
    } catch (error) {
      console.error("計算エラー:", error);
      alert("計算中にエラーが発生しました。");
    }
  };

  // 複数期間の計算処理
  // 将来的には並列処理やWeb Worker、外部API連携などの非同期処理を検討
  const handleCalculateAll = () => {
    try {
      calculateAllPeriods();
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
