import { useState, useCallback, useEffect, useMemo } from "react";
import type { Period } from "../types/periodTypes";
import { PeriodIndexSystem } from "../utils/PeriodIndexSystem";

interface UsePeriodManagementProps {
  initialPeriods?: Period[];
  onPeriodsChange?: (periods: Period[]) => void;
}

/**
 * 期間の管理を行うフック
 * CRUD操作、期間選択、PeriodIndexSystemの管理を責任とする
 */
export const usePeriodManagement = ({
  initialPeriods = [],
  onPeriodsChange,
}: UsePeriodManagementProps = {}) => {
  const [periods, setPeriods] = useState<Period[]>(initialPeriods);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [periodIndexSystem, setPeriodIndexSystem] = useState<PeriodIndexSystem | null>(null);

  // 初期期間の設定
  useEffect(() => {
    if (initialPeriods.length > 0) {
      setPeriods(initialPeriods);
      // 最初の期間を選択
      if (!selectedPeriodId && initialPeriods.length > 0) {
        setSelectedPeriodId(initialPeriods[0].id);
      }
    }
  }, [initialPeriods, selectedPeriodId]);

  // periodsが更新されたらインデックスシステムを再構築
  useEffect(() => {
    if (periods.length > 0) {
      setPeriodIndexSystem(new PeriodIndexSystem(periods));
    }
  }, [periods]);

  // 期間変更の通知
  useEffect(() => {
    onPeriodsChange?.(periods);
  }, [periods, onPeriodsChange]);

  // 期間の追加
  const addPeriod = useCallback(
    (periodData: Period) => {
      setPeriods((prev) => [...prev, periodData]);

      // 初めての期間の場合は自動選択
      if (!selectedPeriodId) {
        setSelectedPeriodId(periodData.id);
      }

      return periodData;
    },
    [selectedPeriodId]
  );

  // 期間の更新
  const updatePeriod = useCallback(
    (id: string, updates: Partial<Omit<Period, "id">>) => {
      setPeriods((prev) =>
        prev.map((period) =>
          period.id === id ? { ...period, ...updates } : period
        )
      );
    },
    []
  );

  // 期間の削除
  const deletePeriod = useCallback(
    (id: string) => {
      setPeriods((prev) => prev.filter((period) => period.id !== id));
      
      // 削除された期間が選択されていた場合は選択を解除
      if (selectedPeriodId === id) {
        setSelectedPeriodId(null);
      }
    },
    [selectedPeriodId]
  );

  // 期間の並び替え
  const reorderPeriods = useCallback(
    (reorderedPeriods: Period[]) => {
      setPeriods(reorderedPeriods);
    },
    []
  );

  // 現在選択中の期間を取得
  const currentPeriod = useMemo(() => {
    return periods.find((period) => period.id === selectedPeriodId) || null;
  }, [periods, selectedPeriodId]);

  // 期間選択の変更
  const selectPeriod = useCallback(
    (periodId: string) => {
      const period = periods.find((p) => p.id === periodId);
      if (period) {
        setSelectedPeriodId(periodId);
        console.log(
          `選択された期間: ${period.name} (ID: ${period.id})`
        );
      }
    },
    [periods]
  );

  // 期間の統計情報
  const periodStats = useMemo(() => {
    return {
      totalPeriods: periods.length,
      hasSelectedPeriod: selectedPeriodId !== null,
      firstPeriod: periods[0] || null,
      lastPeriod: periods[periods.length - 1] || null,
    };
  }, [periods, selectedPeriodId]);

  return {
    // 期間データ
    periods,
    selectedPeriodId,
    currentPeriod,
    periodIndexSystem,
    
    // CRUD操作
    addPeriod,
    updatePeriod,
    deletePeriod,
    reorderPeriods,
    
    // 期間選択
    setSelectedPeriodId: selectPeriod,
    
    // 統計情報
    periodStats,
  };
};