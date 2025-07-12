export type ASTNodeType = 
  | "number"
  | "identifier"
  | "binary"
  | "unary"
  | "function"
  | "parenthesis";

export type BinaryOperator = "+" | "-" | "*" | "/" | "^";
export type UnaryOperator = "-" | "+";

export interface BaseASTNode {
  type: ASTNodeType;
  position?: {
    start: number;
    end: number;
  };
}

export interface NumberNode extends BaseASTNode {
  type: "number";
  value: number;
}

export interface IdentifierNode extends BaseASTNode {
  type: "identifier";
  name: string;
}

export interface BinaryNode extends BaseASTNode {
  type: "binary";
  operator: BinaryOperator;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryNode extends BaseASTNode {
  type: "unary";
  operator: UnaryOperator;
  operand: ASTNode;
}

export interface FunctionNode extends BaseASTNode {
  type: "function";
  name: string;
  arguments: ASTNode[];
}

export interface ParenthesisNode extends BaseASTNode {
  type: "parenthesis";
  expression: ASTNode;
}

export type ASTNode = 
  | NumberNode
  | IdentifierNode
  | BinaryNode
  | UnaryNode
  | FunctionNode
  | ParenthesisNode;

export interface EvaluationContext {
  variables: Map<string, number>;
  functions: Map<string, (...args: number[]) => number>;
}