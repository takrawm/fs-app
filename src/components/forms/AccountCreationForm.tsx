import React, { useState } from "react";
import { Button } from "../common/Button";
import { FormInput } from "../common/FormInput";
import { Select } from "../common/Select";
import type { AccountCategory, AccountDetailType } from "../../types/account";
import type { ParameterType, ParameterConfig } from "../../types/parameter";
import { 
  ACCOUNT_CATEGORIES, 
  PARAMETER_TYPES,
  PARAMETER_TYPE_LABELS 
} from "../../utils/constants";
import { 
  validateAccountName, 
  validateAccountCategory, 
  validateParameterValue,
  validateReferenceId
} from "../../utils/validation";
import { X } from "lucide-react";

interface AccountCreationFormProps {
  onSubmit: (account: {
    name: string;
    category: AccountCategory;
    detailType?: AccountDetailType;
    parameterConfig?: ParameterConfig;
  }) => void;
  onCancel: () => void;
  availableAccounts: Array<{ id: string; name: string }>;
}

export const AccountCreationForm: React.FC<AccountCreationFormProps> = ({
  onSubmit,
  onCancel,
  availableAccounts,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    category: "" as AccountCategory,
    detailType: "" as AccountDetailType,
    parameterType: "" as ParameterType,
    parameterValue: "",
    referenceId: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    const nameError = validateAccountName(formData.name);
    if (nameError) newErrors.name = nameError.message;
    
    const categoryError = validateAccountCategory(formData.category);
    if (categoryError) newErrors.category = categoryError.message;
    
    if (formData.parameterType) {
      const valueError = validateParameterValue(
        formData.parameterType,
        formData.parameterValue ? parseFloat(formData.parameterValue) : undefined
      );
      if (valueError) newErrors.parameterValue = valueError.message;
      
      const referenceError = validateReferenceId(formData.parameterType, formData.referenceId);
      if (referenceError) newErrors.referenceId = referenceError.message;
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      let parameterConfig: ParameterConfig | undefined;
      
      if (formData.parameterType) {
        switch (formData.parameterType) {
          case "比率":
            parameterConfig = {
              type: "比率",
              value: parseFloat(formData.parameterValue),
              referenceId: formData.referenceId,
            };
            break;
          case "成長率":
            parameterConfig = {
              type: "成長率",
              value: parseFloat(formData.parameterValue),
            };
            break;
          case "他科目連動":
            parameterConfig = {
              type: "他科目連動",
              referenceId: formData.referenceId,
            };
            break;
          case "参照":
            parameterConfig = {
              type: "参照",
              referenceId: formData.referenceId,
            };
            break;
          case "子科目合計":
            parameterConfig = {
              type: "子科目合計",
            };
            break;
          case "計算":
            parameterConfig = {
              type: "計算",
              references: [],
            };
            break;
        }
      }
      
      onSubmit({
        name: formData.name,
        category: formData.category,
        detailType: formData.detailType || undefined,
        parameterConfig,
      });
    }
  };

  const categoryOptions = ACCOUNT_CATEGORIES.map(category => ({
    value: category,
    label: category,
  }));

  const getDetailTypeOptions = () => {
    if (formData.category === "資産" || formData.category === "負債") {
      return [
        { value: "流動", label: "流動" },
        { value: "固定", label: "固定" },
      ];
    } else if (formData.category === "収益" || formData.category === "費用") {
      return [
        { value: "営業", label: "営業" },
        { value: "営業外", label: "営業外" },
        { value: "特別", label: "特別" },
      ];
    }
    return [];
  };

  const parameterTypeOptions = PARAMETER_TYPES.map(type => ({
    value: type,
    label: PARAMETER_TYPE_LABELS[type],
  }));

  const accountOptions = availableAccounts.map(account => ({
    value: account.id,
    label: account.name,
  }));

  const showValueInput = formData.parameterType === "比率" || formData.parameterType === "成長率";
  const showReferenceSelect = ["比率", "他科目連動", "参照"].includes(formData.parameterType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-lg font-semibold">新しい科目を追加</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormInput
            label="科目名"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            error={errors.name}
            placeholder="例：売上高"
            required
          />
          
          <Select
            label="カテゴリ"
            options={categoryOptions}
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as AccountCategory }))}
            error={errors.category}
            placeholder="カテゴリを選択"
            required
          />
          
          {getDetailTypeOptions().length > 0 && (
            <Select
              label="詳細タイプ"
              options={getDetailTypeOptions()}
              value={formData.detailType}
              onChange={(e) => setFormData(prev => ({ ...prev, detailType: e.target.value as AccountDetailType }))}
              placeholder="詳細タイプを選択（任意）"
            />
          )}
          
          <Select
            label="パラメータタイプ"
            options={parameterTypeOptions}
            value={formData.parameterType}
            onChange={(e) => setFormData(prev => ({ ...prev, parameterType: e.target.value as ParameterType }))}
            placeholder="パラメータタイプを選択（任意）"
          />
          
          {showValueInput && (
            <FormInput
              label={formData.parameterType === "比率" ? "比率 (%)" : "成長率 (%)"}
              type="number"
              value={formData.parameterValue}
              onChange={(e) => setFormData(prev => ({ ...prev, parameterValue: e.target.value }))}
              error={errors.parameterValue}
              placeholder="0"
              step="0.1"
            />
          )}
          
          {showReferenceSelect && accountOptions.length > 0 && (
            <Select
              label="参照科目"
              options={accountOptions}
              value={formData.referenceId}
              onChange={(e) => setFormData(prev => ({ ...prev, referenceId: e.target.value }))}
              error={errors.referenceId}
              placeholder="参照する科目を選択"
            />
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
            >
              キャンセル
            </Button>
            <Button type="submit">
              追加
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};