import React, { useState } from "react";
import { Button } from "../common/Button";
import { FormInput } from "../common/FormInput";
import { Select } from "../common/Select";
import type { 
  Account,
  SheetType,
  CfImpactType
} from "../../types/account";
import type { 
  Parameter,
  ParameterType 
} from "../../types/parameter";
import { 
  SHEET_TYPES,
  CF_IMPACT_TYPES
} from "../../types/account";
import {
  PARAMETER_TYPES
} from "../../types/parameter";
import { 
  SHEET_TYPE_LABELS,
  CF_IMPACT_TYPE_LABELS,
  NEW_PARAMETER_TYPE_LABELS,
  DEFAULT_DISPLAY_ORDER,
  DEFAULT_CF_IMPACT
} from "../../utils/constants";
import { 
  validateAccountName, 
  validateParameterValue,
  validateReferenceId
} from "../../utils/validation";
import { X } from "lucide-react";

interface AccountCreationFormProps {
  onSubmit: (account: Omit<Account, "id">) => void;
  onCancel: () => void;
  availableAccounts: Array<{ id: string; accountName: string }>;
}

export const AccountCreationForm: React.FC<AccountCreationFormProps> = ({
  onSubmit,
  onCancel,
  availableAccounts,
}) => {
  const [formData, setFormData] = useState({
    accountName: "",
    parentId: "",
    sheet: "" as SheetType,
    isCredit: "" as "true" | "false" | "null",
    cfImpactType: CF_IMPACT_TYPES.ADJUSTMENT as CfImpactType,
    parameterType: PARAMETER_TYPES.CONSTANT as ParameterType,
    parameterValue: "",
    parameterBaseAccountId: "",
    parameterDays: "",
    parameterFormula: "",
    parameterDescription: "",
    displayOrder: {
      sheetOrder: 1,
      sectionOrder: 1,
      itemOrder: 1,
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};

    // バリデーション
    if (!formData.accountName.trim()) {
      newErrors.accountName = "勘定科目名は必須です";
    }

    if (!formData.sheet) {
      newErrors.sheet = "シートタイプは必須です";
    }

    if (!formData.parameterType) {
      newErrors.parameterType = "パラメータタイプは必須です";
    }

    // パラメータ別バリデーション
    if (formData.parameterType === PARAMETER_TYPES.CONSTANT && !formData.parameterValue) {
      newErrors.parameterValue = "定数値は必須です";
    }

    if (formData.parameterType === PARAMETER_TYPES.PERCENTAGE && 
        (!formData.parameterValue || !formData.parameterBaseAccountId)) {
      newErrors.parameterValue = "比率と基準科目は必須です";
    }

    if (formData.parameterType === PARAMETER_TYPES.PERCENTAGE_OF_REVENUE && !formData.parameterValue) {
      newErrors.parameterValue = "売上高比率は必須です";
    }

    if (formData.parameterType === PARAMETER_TYPES.DAYS && 
        (!formData.parameterDays || !formData.parameterBaseAccountId)) {
      newErrors.parameterDays = "日数と基準科目は必須です";
    }

    if (formData.parameterType === PARAMETER_TYPES.FORMULA && !formData.parameterFormula) {
      newErrors.parameterFormula = "計算式は必須です";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // パラメータオブジェクトの構築
    const parameter = buildParameter();
    
    // CFインパクトオブジェクトの構築
    const cfImpact = {
      type: formData.cfImpactType,
    };

    // 新しいアカウントオブジェクトの構築
    const newAccount: Omit<Account, "id"> = {
      accountName: formData.accountName,
      parentId: formData.parentId || null,
      sheet: formData.sheet,
      isCredit: formData.isCredit === "null" ? null : formData.isCredit === "true",
      displayOrder: formData.displayOrder,
      parameter,
      cfImpact,
    };

    onSubmit(newAccount);
  };

  const buildParameter = (): Parameter => {
    switch (formData.parameterType) {
      case PARAMETER_TYPES.CONSTANT:
        return {
          type: PARAMETER_TYPES.CONSTANT,
          value: parseFloat(formData.parameterValue) || 0,
        };

      case PARAMETER_TYPES.PERCENTAGE:
        return {
          type: PARAMETER_TYPES.PERCENTAGE,
          value: parseFloat(formData.parameterValue) || 0,
          baseAccountId: formData.parameterBaseAccountId,
        };

      case PARAMETER_TYPES.PERCENTAGE_OF_REVENUE:
        return {
          type: PARAMETER_TYPES.PERCENTAGE_OF_REVENUE,
          value: parseFloat(formData.parameterValue) || 0,
        };

      case PARAMETER_TYPES.DAYS:
        return {
          type: PARAMETER_TYPES.DAYS,
          days: parseInt(formData.parameterDays) || 0,
          baseAccountId: formData.parameterBaseAccountId,
        };

      case PARAMETER_TYPES.MANUAL_INPUT:
        return {
          type: PARAMETER_TYPES.MANUAL_INPUT,
          defaultValue: parseFloat(formData.parameterValue) || 0,
        };

      case PARAMETER_TYPES.FORMULA:
        return {
          type: PARAMETER_TYPES.FORMULA,
          formula: formData.parameterFormula,
          dependencies: extractDependencies(formData.parameterFormula),
        };

      default:
        return {
          type: PARAMETER_TYPES.CONSTANT,
          value: 0,
        };
    }
  };

  const extractDependencies = (formula: string): string[] => {
    const dependencies: string[] = [];
    const regex = /\[([^\]]+)\]/g;
    let match;
    
    while ((match = regex.exec(formula)) !== null) {
      dependencies.push(match[1]);
    }
    
    return dependencies;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleDisplayOrderChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      displayOrder: {
        ...prev.displayOrder,
        [field]: parseInt(value) || 1,
      },
    }));
  };

  const sheetOptions = Object.entries(SHEET_TYPES).map(([key, value]) => ({
    value,
    label: SHEET_TYPE_LABELS[value],
  }));

  const cfImpactOptions = Object.entries(CF_IMPACT_TYPES).map(([key, value]) => ({
    value,
    label: CF_IMPACT_TYPE_LABELS[value],
  }));

  const parameterTypeOptions = Object.entries(PARAMETER_TYPES).map(([key, value]) => ({
    value,
    label: NEW_PARAMETER_TYPE_LABELS[value],
  }));

  const accountOptions = [
    { value: "", label: "なし（ルート科目）" },
    ...availableAccounts.map(account => ({
      value: account.id,
      label: account.accountName,
    })),
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">新規勘定科目作成</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="p-2"
          >
            <X size={16} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">基本情報</h3>
            
            <FormInput
              label="勘定科目名"
              value={formData.accountName}
              onChange={(value) => handleInputChange("accountName", value)}
              error={errors.accountName}
              required
            />

            <Select
              label="親科目"
              value={formData.parentId}
              onChange={(value) => handleInputChange("parentId", value)}
              options={accountOptions}
            />

            <Select
              label="シートタイプ"
              value={formData.sheet}
              onChange={(value) => handleInputChange("sheet", value)}
              options={sheetOptions}
              error={errors.sheet}
              required
            />

            <Select
              label="借方・貸方"
              value={formData.isCredit}
              onChange={(value) => handleInputChange("isCredit", value)}
              options={[
                { value: "false", label: "借方" },
                { value: "true", label: "貸方" },
                { value: "null", label: "適用外" },
              ]}
            />
          </div>

          {/* 表示順序 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">表示順序</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <FormInput
                label="シート順序"
                type="number"
                value={formData.displayOrder.sheetOrder.toString()}
                onChange={(value) => handleDisplayOrderChange("sheetOrder", value)}
                min={1}
              />
              <FormInput
                label="セクション順序"
                type="number"
                value={formData.displayOrder.sectionOrder.toString()}
                onChange={(value) => handleDisplayOrderChange("sectionOrder", value)}
                min={1}
              />
              <FormInput
                label="項目順序"
                type="number"
                value={formData.displayOrder.itemOrder.toString()}
                onChange={(value) => handleDisplayOrderChange("itemOrder", value)}
                min={1}
              />
            </div>
          </div>

          {/* CFインパクト */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">CFインパクト</h3>
            
            <Select
              label="CFインパクトタイプ"
              value={formData.cfImpactType}
              onChange={(value) => handleInputChange("cfImpactType", value)}
              options={cfImpactOptions}
            />
          </div>

          {/* パラメータ設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">パラメータ設定</h3>
            
            <Select
              label="パラメータタイプ"
              value={formData.parameterType}
              onChange={(value) => handleInputChange("parameterType", value)}
              options={parameterTypeOptions}
              error={errors.parameterType}
              required
            />

            {/* パラメータタイプ別の入力フィールド */}
            {formData.parameterType === PARAMETER_TYPES.CONSTANT && (
              <FormInput
                label="定数値"
                type="number"
                value={formData.parameterValue}
                onChange={(value) => handleInputChange("parameterValue", value)}
                error={errors.parameterValue}
                required
              />
            )}

            {formData.parameterType === PARAMETER_TYPES.PERCENTAGE && (
              <>
                <FormInput
                  label="比率（%）"
                  type="number"
                  value={formData.parameterValue}
                  onChange={(value) => handleInputChange("parameterValue", value)}
                  error={errors.parameterValue}
                  required
                />
                <Select
                  label="基準科目"
                  value={formData.parameterBaseAccountId}
                  onChange={(value) => handleInputChange("parameterBaseAccountId", value)}
                  options={accountOptions.filter(opt => opt.value !== "")}
                  required
                />
              </>
            )}

            {formData.parameterType === PARAMETER_TYPES.PERCENTAGE_OF_REVENUE && (
              <FormInput
                label="売上高比率（%）"
                type="number"
                value={formData.parameterValue}
                onChange={(value) => handleInputChange("parameterValue", value)}
                error={errors.parameterValue}
                required
              />
            )}

            {formData.parameterType === PARAMETER_TYPES.DAYS && (
              <>
                <FormInput
                  label="日数"
                  type="number"
                  value={formData.parameterDays}
                  onChange={(value) => handleInputChange("parameterDays", value)}
                  error={errors.parameterDays}
                  required
                />
                <Select
                  label="基準科目"
                  value={formData.parameterBaseAccountId}
                  onChange={(value) => handleInputChange("parameterBaseAccountId", value)}
                  options={accountOptions.filter(opt => opt.value !== "")}
                  required
                />
              </>
            )}

            {formData.parameterType === PARAMETER_TYPES.MANUAL_INPUT && (
              <FormInput
                label="デフォルト値"
                type="number"
                value={formData.parameterValue}
                onChange={(value) => handleInputChange("parameterValue", value)}
              />
            )}

            {formData.parameterType === PARAMETER_TYPES.FORMULA && (
              <FormInput
                label="計算式"
                value={formData.parameterFormula}
                onChange={(value) => handleInputChange("parameterFormula", value)}
                error={errors.parameterFormula}
                placeholder="例: [account1] + [account2] * 0.1"
                required
              />
            )}

            <FormInput
              label="説明"
              value={formData.parameterDescription}
              onChange={(value) => handleInputChange("parameterDescription", value)}
            />
          </div>

          {/* フォームボタン */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              キャンセル
            </Button>
            <Button type="submit">作成</Button>
          </div>
        </form>
      </div>
    </div>
  );
};