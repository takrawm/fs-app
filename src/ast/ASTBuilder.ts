// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
import type {
  ASTNode,
  NumberNode,
  IdentifierNode,
  UnaryNode,
  FunctionNode,
  ParenthesisNode,
  BinaryOperator,
  UnaryOperator,
} from "../types/ast";
import {
  PRECEDENCE,
  isOperator,
  isIdentifierChar,
  isWhitespace,
  isNumber,
} from "./ASTTypes";

export class ASTBuilder {
  private input: string;
  private position: number;

  constructor() {
    this.input = "";
    this.position = 0;
  }

  parse(expression: string): ASTNode {
    this.input = expression;
    this.position = 0;
    return this.parseExpression();
  }

  private parseExpression(): ASTNode {
    return this.parseBinary(this.parseTerm(), 0);
  }

  private parseBinary(left: ASTNode, minPrecedence: number): ASTNode {
    while (this.position < this.input.length) {
      this.skipWhitespace();

      const operator = this.peek();
      if (!isOperator(operator)) break;

      const precedence = PRECEDENCE[operator] || 0;
      if (precedence < minPrecedence) break;

      this.advance();
      this.skipWhitespace();

      let right = this.parseTerm();

      while (this.position < this.input.length) {
        const nextOp = this.peek();
        if (!isOperator(nextOp)) break;

        const nextPrecedence = PRECEDENCE[nextOp] || 0;
        if (nextPrecedence <= precedence) break;

        right = this.parseBinary(right, nextPrecedence);
      }

      left = {
        type: "binary",
        operator: operator as BinaryOperator,
        left,
        right,
      };
    }

    return left;
  }

  private parseTerm(): ASTNode {
    this.skipWhitespace();

    if (this.position >= this.input.length) {
      throw new Error("Unexpected end of expression");
    }

    const char = this.peek();

    if (char === "(") {
      return this.parseParenthesis();
    }

    if (char === "-" || char === "+") {
      return this.parseUnary();
    }

    if (isNumber(char)) {
      return this.parseNumber();
    }

    if (isIdentifierChar(char)) {
      return this.parseIdentifierOrFunction();
    }

    if (char === "[") {
      return this.parseBracketedIdentifier();
    }

    throw new Error(`Unexpected character: ${char}`);
  }

  private parseParenthesis(): ParenthesisNode {
    this.expect("(");
    const expression = this.parseExpression();
    this.expect(")");
    return {
      type: "parenthesis",
      expression,
    };
  }

  private parseUnary(): UnaryNode {
    const operator = this.advance() as UnaryOperator;
    const operand = this.parseTerm();
    return {
      type: "unary",
      operator,
      operand,
    };
  }

  private parseNumber(): NumberNode {
    let num = "";
    while (this.position < this.input.length && isNumber(this.peek())) {
      num += this.advance();
    }
    return {
      type: "number",
      value: parseFloat(num),
    };
  }

  private parseIdentifierOrFunction(): ASTNode {
    const name = this.parseIdentifierName();

    this.skipWhitespace();
    if (this.peek() === "(") {
      return this.parseFunctionCall(name);
    }

    return {
      type: "identifier",
      name,
    };
  }

  private parseBracketedIdentifier(): IdentifierNode {
    this.expect("[");
    const name = this.parseUntil("]");
    this.expect("]");
    return {
      type: "identifier",
      name,
    };
  }

  private parseFunctionCall(name: string): FunctionNode {
    this.expect("(");
    const args: ASTNode[] = [];

    while (this.peek() !== ")") {
      args.push(this.parseExpression());
      this.skipWhitespace();

      if (this.peek() === ",") {
        this.advance();
        this.skipWhitespace();
      } else if (this.peek() !== ")") {
        throw new Error("Expected ',' or ')' in function arguments");
      }
    }

    this.expect(")");
    return {
      type: "function",
      name,
      arguments: args,
    };
  }

  private parseIdentifierName(): string {
    let name = "";
    while (this.position < this.input.length && isIdentifierChar(this.peek())) {
      name += this.advance();
    }
    return name;
  }

  private parseUntil(char: string): string {
    let result = "";
    while (this.position < this.input.length && this.peek() !== char) {
      result += this.advance();
    }
    return result;
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length && isWhitespace(this.peek())) {
      this.advance();
    }
  }

  private peek(): string {
    return this.input[this.position] || "";
  }

  private advance(): string {
    return this.input[this.position++];
  }

  private expect(char: string): void {
    if (this.peek() !== char) {
      throw new Error(`Expected '${char}' but found '${this.peek()}'`);
    }
    this.advance();
  }
}
