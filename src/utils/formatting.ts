export const formatNumber = (
  value: number,
  options?: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
    showSign?: boolean;
  }
): string => {
  const { decimals = 0, prefix = "", suffix = "", showSign = false } = options || {};
  
  const formatted = value.toLocaleString("ja-JP", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sign = showSign && value > 0 ? "+" : "";
  
  return `${prefix}${sign}${formatted}${suffix}`;
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return formatNumber(value, { decimals, suffix: "%" });
};

export const formatCurrency = (value: number, decimals: number = 0): string => {
  return formatNumber(value, { decimals, prefix: "¥" });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export const formatDateTime = (date: Date): string => {
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatPeriod = (startDate: Date, endDate: Date): string => {
  const start = startDate.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });
  const end = endDate.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });
  
  return `${start} - ${end}`;
};

export const abbreviateNumber = (value: number): string => {
  if (Math.abs(value) >= 1e12) {
    return formatNumber(value / 1e12, { decimals: 1, suffix: "兆" });
  } else if (Math.abs(value) >= 1e8) {
    return formatNumber(value / 1e8, { decimals: 1, suffix: "億" });
  } else if (Math.abs(value) >= 1e4) {
    return formatNumber(value / 1e4, { decimals: 1, suffix: "万" });
  }
  return formatNumber(value);
};