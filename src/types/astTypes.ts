export interface EvaluationContext {
  variables: Map<string, number>;
  functions: Map<string, Function>;
}