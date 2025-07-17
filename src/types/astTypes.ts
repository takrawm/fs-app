export interface EvaluationContext {
  variables: Map<string, number>;
  functions: Map<string, Function>;
}

// AST Node型定義
export type ASTNode =
  | NumberNode
  | IdentifierNode
  | BinaryNode
  | UnaryNode
  | FunctionNode
  | ParenthesisNode;

export interface NumberNode {
  type: "number";
  value: number;
}

export interface IdentifierNode {
  type: "identifier";
  name: string;
}

export interface BinaryNode {
  type: "binary";
  operator: BinaryOperator;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryNode {
  type: "unary";
  operator: UnaryOperator;
  operand: ASTNode;
}

export interface FunctionNode {
  type: "function";
  name: string;
  args: ASTNode[];
}

export interface ParenthesisNode {
  type: "parenthesis";
  expression: ASTNode;
}

// オペレーター型定義
export type BinaryOperator =
  | "+"
  | "-"
  | "*"
  | "/"
  | "^"
  | "%"
  | "=="
  | "!="
  | "<"
  | ">"
  | "<="
  | ">=";
export type UnaryOperator = "+" | "-" | "!";
