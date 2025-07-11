import type {
  ASTNode,
  EvaluationContext,
  NumberNode,
  IdentifierNode,
  BinaryNode,
  UnaryNode,
  FunctionNode,
  ParenthesisNode,
} from "../types/ast";

export class ASTEvaluator {
  private context: EvaluationContext;

  constructor(context: EvaluationContext) {
    this.context = context;
    this.initializeBuiltInFunctions();
  }

  evaluate(node: ASTNode): number {
    switch (node.type) {
      case "number":
        return this.evaluateNumber(node as NumberNode);
      case "identifier":
        return this.evaluateIdentifier(node as IdentifierNode);
      case "binary":
        return this.evaluateBinary(node as BinaryNode);
      case "unary":
        return this.evaluateUnary(node as UnaryNode);
      case "function":
        return this.evaluateFunction(node as FunctionNode);
      case "parenthesis":
        return this.evaluateParenthesis(node as ParenthesisNode);
      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }

  private evaluateNumber(node: NumberNode): number {
    return node.value;
  }

  private evaluateIdentifier(node: IdentifierNode): number {
    const value = this.context.variables.get(node.name);
    if (value === undefined) {
      throw new Error(`Undefined variable: ${node.name}`);
    }
    return value;
  }

  private evaluateBinary(node: BinaryNode): number {
    const left = this.evaluate(node.left);
    const right = this.evaluate(node.right);

    switch (node.operator) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        if (right === 0) {
          throw new Error("Division by zero");
        }
        return left / right;
      case "^":
        return Math.pow(left, right);
      default:
        throw new Error(`Unknown operator: ${node.operator}`);
    }
  }

  private evaluateUnary(node: UnaryNode): number {
    const operand = this.evaluate(node.operand);

    switch (node.operator) {
      case "-":
        return -operand;
      case "+":
        return +operand;
      default:
        throw new Error(`Unknown unary operator: ${node.operator}`);
    }
  }

  private evaluateFunction(node: FunctionNode): number {
    const func = this.context.functions.get(node.name.toUpperCase());
    if (!func) {
      throw new Error(`Unknown function: ${node.name}`);
    }

    const args = node.arguments.map(arg => this.evaluate(arg));
    return func(...args);
  }

  private evaluateParenthesis(node: ParenthesisNode): number {
    return this.evaluate(node.expression);
  }

  private initializeBuiltInFunctions(): void {
    this.context.functions.set("SUM", (...args: number[]) => {
      return args.reduce((sum, val) => sum + val, 0);
    });

    this.context.functions.set("AVG", (...args: number[]) => {
      if (args.length === 0) return 0;
      return args.reduce((sum, val) => sum + val, 0) / args.length;
    });

    this.context.functions.set("MIN", (...args: number[]) => {
      if (args.length === 0) return 0;
      return Math.min(...args);
    });

    this.context.functions.set("MAX", (...args: number[]) => {
      if (args.length === 0) return 0;
      return Math.max(...args);
    });

    this.context.functions.set("ABS", (value: number) => {
      return Math.abs(value);
    });

    this.context.functions.set("ROUND", (value: number, decimals = 0) => {
      const factor = Math.pow(10, decimals);
      return Math.round(value * factor) / factor;
    });

    this.context.functions.set("IF", (condition: number, trueValue: number, falseValue: number) => {
      return condition !== 0 ? trueValue : falseValue;
    });
  }

  extractDependencies(node: ASTNode): string[] {
    const dependencies: Set<string> = new Set();
    this.collectDependencies(node, dependencies);
    return Array.from(dependencies);
  }

  private collectDependencies(node: ASTNode, dependencies: Set<string>): void {
    switch (node.type) {
      case "identifier":
        dependencies.add((node as IdentifierNode).name);
        break;
      case "binary":
        const binaryNode = node as BinaryNode;
        this.collectDependencies(binaryNode.left, dependencies);
        this.collectDependencies(binaryNode.right, dependencies);
        break;
      case "unary":
        this.collectDependencies((node as UnaryNode).operand, dependencies);
        break;
      case "function":
        const funcNode = node as FunctionNode;
        funcNode.arguments.forEach(arg => this.collectDependencies(arg, dependencies));
        break;
      case "parenthesis":
        this.collectDependencies((node as ParenthesisNode).expression, dependencies);
        break;
    }
  }
}