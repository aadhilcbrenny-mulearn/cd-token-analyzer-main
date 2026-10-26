import { Token, tokenize, LexError } from "./lexer";

export type Expr =
  | { kind: "Num"; value: number; token: Token }
  | { kind: "Var"; name: string; token: Token }
  | {
      kind: "BinOp";
      op: "+" | "-" | "*" | "/";
      left: Expr;
      right: Expr;
      token: Token;
    };

export type Stmt =
  | { kind: "Assign"; name: string; expr: Expr; token: Token }
  | { kind: "Print"; expr: Expr; token: Token }
  | { kind: "ExprStmt"; expr: Expr; token: Token };

export interface ParseResult {
  statements: Stmt[];
  errors: ParseError[];
}

export class ParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public col: number,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

export class TokenStream {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  peek(): Token {
    return this.tokens[this.pos];
  }

  peekNext(): Token {
    return this.tokens[this.pos + 1];
  }

  next(): Token {
    return this.tokens[this.pos++];
  }

  at(type: string): boolean {
    return this.peek().type === type;
  }

  match(type: string): Token | null {
    if (this.at(type)) return this.next();
    return null;
  }

  expect(type: string, what: string): Token {
    const t = this.peek();
    if (t.type === type) return this.next();
    throw new ParseError(
      `Expected ${what} but found '${t.value || t.type}'`,
      t.line,
      t.col,
    );
  }
}

export function parse(src: string): ParseResult {
  let tokens: Token[];
  try {
    tokens = tokenize(src);
  } catch (e) {
    if (e instanceof LexError) {
      return {
        statements: [],
        errors: [new ParseError(e.message, e.line, e.col)],
      };
    }
    throw e;
  }

  const stream = new TokenStream(tokens);
  const statements: Stmt[] = [];
  const errors: ParseError[] = [];

  const synchronize = () => {
    while (!stream.at("EOF") && !stream.at("NEWLINE") && !stream.at("SEMI")) {
      stream.next();
    }
    stream.match("NEWLINE");
    stream.match("SEMI");
  };

  while (!stream.at("EOF")) {
    // Skip empty separators
    if (stream.at("NEWLINE") || stream.at("SEMI")) {
      stream.next();
      continue;
    }
    try {
      const stmt = parseStatement(stream);
      if (stmt) statements.push(stmt);
      while (stream.match("NEWLINE") || stream.match("SEMI")) {
        // consume separators
      }
    } catch (e) {
      if (e instanceof ParseError) {
        errors.push(e);
        synchronize();
      } else {
        throw e;
      }
    }
  }

  return { statements, errors };
}

function parseStatement(stream: TokenStream): Stmt | null {
  const t = stream.peek();

  // Assignment: ID '=' expr
  if (t.type === "ID") {
    const after = stream.peekNext();
    if (after && after.type === "ASSIGN") {
      const nameTok = stream.next();
      stream.next(); // '='
      const expr = parseExpr(stream);
      return { kind: "Assign", name: nameTok.value, expr, token: nameTok };
    }
  }

  // print(expr)
  if (t.type === "PRINT") {
    const printTok = stream.next();
    stream.expect("LPAREN", "'('");
    const expr = parseExpr(stream);
    stream.expect("RPAREN", "')'");
    return { kind: "Print", expr, token: printTok };
  }

  // bare expression statement
  const expr = parseExpr(stream);
  return { kind: "ExprStmt", expr, token: t };
}

// expr : term (('+' | '-') term)*
function parseExpr(stream: TokenStream): Expr {
  let left = parseTerm(stream);
  while (stream.at("PLUS") || stream.at("MINUS")) {
    const op = stream.next();
    const right = parseTerm(stream);
    left = {
      kind: "BinOp",
      op: op.value as "+" | "-",
      left,
      right,
      token: op,
    };
  }
  return left;
}

// term : factor (('*' | '/') factor)*
function parseTerm(stream: TokenStream): Expr {
  let left = parseFactor(stream);
  while (stream.at("STAR") || stream.at("SLASH")) {
    const op = stream.next();
    const right = parseFactor(stream);
    left = {
      kind: "BinOp",
      op: op.value as "*" | "/",
      left,
      right,
      token: op,
    };
  }
  return left;
}

// factor : NUMBER | ID | '(' expr ')' | '-' factor
function parseFactor(stream: TokenStream): Expr {
  const t = stream.peek();

  if (t.type === "MINUS") {
    const op = stream.next();
    const operand = parseFactor(stream);
    // Represent unary minus as 0 - operand
    return {
      kind: "BinOp",
      op: "-",
      left: { kind: "Num", value: 0, token: op },
      right: operand,
      token: op,
    };
  }

  if (t.type === "NUMBER") {
    stream.next();
    return { kind: "Num", value: parseFloat(t.value), token: t };
  }

  if (t.type === "ID") {
    stream.next();
    return { kind: "Var", name: t.value, token: t };
  }

  if (t.type === "LPAREN") {
    stream.next();
    const expr = parseExpr(stream);
    stream.expect("RPAREN", "')'");
    return expr;
  }

  if (t.type === "EOF") {
    throw new ParseError(
      "Unexpected end of input, expected an expression",
      t.line,
      t.col,
    );
  }

  throw new ParseError(
    `Unexpected token '${t.value || t.type}', expected a number, variable, or '('`,
    t.line,
    t.col,
  );
}
