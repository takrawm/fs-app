export const OPERATORS = {
  ADDITION: "+",
  SUBTRACTION: "-",
  MULTIPLICATION: "*",
  DIVISION: "/",
  POWER: "^",
} as const;

export const FUNCTIONS = {
  SUM: "SUM",
  AVG: "AVG",
  MIN: "MIN",
  MAX: "MAX",
  ABS: "ABS",
  ROUND: "ROUND",
  IF: "IF",
} as const;

export const PRECEDENCE: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "^": 3,
};

export const isOperator = (char: string): boolean => {
  return Object.values(OPERATORS).includes(char as any);
};

export const isFunction = (name: string): boolean => {
  return Object.values(FUNCTIONS).includes(name as any);
};

export const isIdentifierChar = (char: string): boolean => {
  return /[a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(char);
};

export const isWhitespace = (char: string): boolean => {
  return /\s/.test(char);
};

export const isNumber = (char: string): boolean => {
  return /[0-9.]/.test(char);
};