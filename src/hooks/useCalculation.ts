import { useState, useCallback } from "react";
import type { CalculationResult, CalculationError } from "../types/financial";

export const useCalculation = () => {
  const [results, setResults] = useState<Map<string, CalculationResult>>(new Map());
  const [errors, setErrors] = useState<CalculationError[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const startCalculation = useCallback(() => {
    setIsCalculating(true);
    setErrors([]);
  }, []);

  const endCalculation = useCallback(() => {
    setIsCalculating(false);
  }, []);

  const addResult = useCallback((accountId: string, result: CalculationResult) => {
    setResults(prev => {
      const newResults = new Map(prev);
      newResults.set(accountId, result);
      return newResults;
    });
  }, []);

  const addError = useCallback((error: CalculationError) => {
    setErrors(prev => [...prev, error]);
  }, []);

  const clearResults = useCallback(() => {
    setResults(new Map());
    setErrors([]);
  }, []);

  const getResult = useCallback((accountId: string): CalculationResult | undefined => {
    return results.get(accountId);
  }, [results]);

  const getValue = useCallback((accountId: string): number => {
    return results.get(accountId)?.value || 0;
  }, [results]);

  const hasErrors = useCallback((): boolean => {
    return errors.length > 0;
  }, [errors]);

  const getErrorsForAccount = useCallback((accountId: string): CalculationError[] => {
    return errors.filter(error => error.accountId === accountId);
  }, [errors]);

  return {
    results,
    errors,
    isCalculating,
    
    startCalculation,
    endCalculation,
    addResult,
    addError,
    clearResults,
    
    getResult,
    getValue,
    hasErrors,
    getErrorsForAccount,
  };
};