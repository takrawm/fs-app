import { useState, useEffect } from "react";
import { Header } from "./components/layout/Header";
import { ControlPanel } from "./components/layout/ControlPanel";
import { AccountCreationForm } from "./components/forms/AccountCreationForm";
import { AccountTable } from "./components/tables/AccountTable";
import { useFinancialModel } from "./hooks/useFinancialModel";
import type { AccountCategory, AccountDetailType } from "./types/account";
import type { ParameterConfig } from "./types/parameter";
import { PARAMETER_TYPES, CF_IMPACT_TYPES } from "./types/newFinancialTypes";

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

    initializeSampleData,
  } = useFinancialModel();

  const [showAccountForm, setShowAccountForm] = useState(false);

  useEffect(() => {
    initializeSampleData();
  }, [initializeSampleData]);

  const handleAddAccount = (accountData: {
    accountName: string;
    category: AccountCategory;
    detailType?: AccountDetailType;
    parameterConfig?: ParameterConfig;
  }) => {
    // Convert legacy accountData to new Account structure
    const newAccountData = {
      accountName: accountData.accountName,
      parentId: null,
      sheet: "BS" as const, // Default sheet type
      isCredit: null,
      displayOrder: {
        sheetOrder: 1,
        sectionOrder: 1,
        itemOrder: 1,
      },
      parameter: {
        type: PARAMETER_TYPES.CONSTANT,
        value: 0,
      },
      cfImpact: {
        type: CF_IMPACT_TYPES.ADJUSTMENT,
      },
    };

    const newAccount = addAccount(newAccountData);

    setShowAccountForm(false);
  };

  const handleAddPeriod = () => {
    const currentYear = new Date().getFullYear();
    const nextOrder = periods.length + 1;

    addPeriod({
      id: `period_${currentYear + nextOrder - 1}`,
      year: currentYear + nextOrder - 1,
      month: 3,
      displayName: `${currentYear + nextOrder - 1}年3月期`,
      isHistorical: false,
      isForecast: true,
    });
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

  const availableAccounts = accounts.map((account) => ({
    id: account.id,
    accountName: account.accountName,
  }));

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
        <AccountCreationForm
          onSubmit={handleAddAccount}
          onCancel={() => setShowAccountForm(false)}
          availableAccounts={availableAccounts}
        />
      )}
    </div>
  );
}

export default App;
