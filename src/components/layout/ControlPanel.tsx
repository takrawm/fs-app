import React from "react";
import { Button } from "../common/Button";
import { Select } from "../common/Select";
import type { Period } from "../../types/newFinancialTypes";
import { Plus, Play, RefreshCw } from "lucide-react";

interface ControlPanelProps {
  periods: Period[];
  selectedPeriodId: string | null;
  onPeriodChange: (periodId: string) => void;
  onAddAccount: () => void;
  onAddPeriod: () => void;
  onCalculate: () => void;
  onCalculateAll: () => void;
  isCalculating: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  periods,
  selectedPeriodId,
  onPeriodChange,
  onAddAccount,
  onAddPeriod,
  onCalculate,
  onCalculateAll,
  isCalculating,
}) => {
  const periodOptions = periods.map(period => ({
    value: period.id,
    label: period.displayName,
  }));

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Select
              options={periodOptions}
              value={selectedPeriodId || ""}
              onChange={(e) => onPeriodChange(e.target.value)}
              placeholder="期間を選択"
              className="min-w-[200px]"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={onAddPeriod}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>期間追加</span>
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={onAddAccount}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>科目追加</span>
            </Button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={onCalculate}
              disabled={isCalculating || !selectedPeriodId}
              className="flex items-center space-x-2"
            >
              {isCalculating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span>計算実行</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onCalculateAll}
              disabled={isCalculating || periods.length === 0}
              className="flex items-center space-x-2"
            >
              {isCalculating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span>全期間計算</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};