import { Expr, Stmt, ParseError } from './parser';

export interface StmtResult {
  statement: Stmt;
  status: 'valid' | 'invalid';
  message: string;
  output?: string;
}

export interface EvalResult {
  results: StmtResult[];
  parseErrors: ParseError[];
  allValid: boolean;
}

export function evaluate(statements: Stmt[], parseErrors: ParseError[]): EvalResult {
  const env: Record<string, number> = {};
  const results: StmtResult[] = [];

  for (const stmt of statements) {
    try {
      if (stmt.kind === 'Assign') {
        const value = evalExpr(stmt.expr, env);
        env[stmt.name] = value;
        results.push({
          statement: stmt,
          status: 'valid',
          message: `Valid assignment — ${stmt.name} = ${formatNum(value)}`,
        });
      } else if (stmt.kind === 'Print') {
        const value = evalExpr(stmt.expr, env);
        results.push({
          statement: stmt,
          status: 'valid',
          message: `Valid print statement`,
          output: formatNum(value),
        });
      } else {
        const value = evalExpr(stmt.expr, env);
        results.push({
          statement: stmt,
          status: 'valid',
          message: `Valid expression — result: ${formatNum(value)}`,
        });
      }
    } catch (e) {
      results.push({
        statement: stmt,
        status: 'invalid',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const allValid = parseErrors.length === 0 && results.every((r) => r.status === 'valid');
  return { results, parseErrors, allValid };
}

function evalExpr(expr: Expr, env: Record<string, number>): number {
  switch (expr.kind) {
    case 'Num':
      return expr.value;
    case 'Var': {
      if (!(expr.name in env)) {
        throw new Error(`Undefined variable '${expr.name}'`);
      }
      return env[expr.name];
    }
    case 'BinOp': {
      const l = evalExpr(expr.left, env);
      const r = evalExpr(expr.right, env);
      switch (expr.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          if (r === 0) throw new Error('Division by zero');
          return l / r;
      }
    }
  }
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(parseFloat(n.toFixed(6)));
}

// Build a description string of an expression (used in AST panel)
export function describeExpr(expr: Expr): string {
  switch (expr.kind) {
    case 'Num':
      return String(expr.value);
    case 'Var':
      return expr.name;
    case 'BinOp':
      return `${describeExpr(expr.left)} ${expr.op} ${describeExpr(expr.right)}`;
  }
}
