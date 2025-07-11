import { useState, useEffect } from "react";
import { Header } from "./components/layout/Header";
import { ControlPanel } from "./components/layout/ControlPanel";
import { AccountCreationForm } from "./components/forms/AccountCreationForm";
import { AccountTable } from "./components/tables/AccountTable";
import { useFinancialModel } from "./hooks/useFinancialModel";
import type { AccountCategory, AccountDetailType } from "./types/account";
import type { ParameterConfig } from "./types/parameter";

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
    
    setParameter,
    
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
    name: string;
    category: AccountCategory;
    detailType?: AccountDetailType;
    parameterConfig?: ParameterConfig;
  }) => {
    const newAccount = addAccount(accountData);
    
    if (accountData.parameterConfig && selectedPeriodId) {
      setParameter(newAccount.id, selectedPeriodId, {
        id: `param_${newAccount.id}_${selectedPeriodId}`,
        accountId: newAccount.id,
        periodId: selectedPeriodId,
        config: accountData.parameterConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    setShowAccountForm(false);
  };

  const handleAddPeriod = () => {
    const currentYear = new Date().getFullYear();
    const nextOrder = periods.length + 1;
    
    addPeriod({
      name: `${currentYear + nextOrder - 1}年3月期`,
      startDate: new Date(currentYear + nextOrder - 2, 3, 1),
      endDate: new Date(currentYear + nextOrder - 1, 2, 31),
      order: nextOrder,
      isActual: false,
    });
  };

  const handleEditAccount = (accountId: string) => {
    console.log("Edit account:", accountId);
  };

  const handleDeleteAccount = (accountId: string) => {
    if (window.confirm("この科目を削除しますか？関連するキャッシュフロー項目も削除されます。")) {
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

  const availableAccounts = accounts.map(account => ({
    id: account.id,
    name: account.name,
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