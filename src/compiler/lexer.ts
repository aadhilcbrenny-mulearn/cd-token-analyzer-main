export type TokenType =
  | 'NUMBER'
  | 'ID'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'ASSIGN'
  | 'LPAREN'
  | 'RPAREN'
  | 'SEMI'
  | 'NEWLINE'
  | 'PRINT'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

export class LexError extends Error {
  constructor(
    message: string,
    public line: number,
    public col: number
  ) {
    super(message);
    this.name = 'LexError';
  }
}

const KEYWORDS: Record<string, TokenType> = {
  print: 'PRINT',
};

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const push = (type: TokenType, value: string, startCol: number) => {
    tokens.push({ type, value, line, col: startCol });
  };

  while (i < src.length) {
    const ch = src[i];

    // Newlines and whitespace
    if (ch === '\n') {
      push('NEWLINE', ch, col);
      i++;
      line++;
      col = 1;
      continue;
    }
    if (ch === '\r') {
      i++;
      col++;
      continue;
    }
    if (ch === ' ' || ch === '\t') {
      i++;
      col++;
      continue;
    }

    // Comments: # to end of line
    if (ch === '#') {
      while (i < src.length && src[i] !== '\n') {
        i++;
        col++;
      }
      continue;
    }

    // Numbers (integers and decimals)
    if (/[0-9]/.test(ch)) {
      const startCol = col;
      let num = '';
      let sawDot = false;
      while (i < src.length && (/[0-9]/.test(src[i]) || (src[i] === '.' && !sawDot))) {
        if (src[i] === '.') sawDot = true;
        num += src[i];
        i++;
        col++;
      }
      push('NUMBER', num, startCol);
      continue;
    }

    // Identifiers / keywords
    if (/[a-zA-Z_]/.test(ch)) {
      const startCol = col;
      let id = '';
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) {
        id += src[i];
        i++;
        col++;
      }
      const kw = KEYWORDS[id];
      push(kw ?? 'ID', id, startCol);
      continue;
    }

    // Operators / punctuation
    const startCol = col;
    switch (ch) {
      case '+':
        push('PLUS', ch, startCol);
        break;
      case '-':
        push('MINUS', ch, startCol);
        break;
      case '*':
        push('STAR', ch, startCol);
        break;
      case '/':
        push('SLASH', ch, startCol);
        break;
      case '=':
        push('ASSIGN', ch, startCol);
        break;
      case '(':
        push('LPAREN', ch, startCol);
        break;
      case ')':
        push('RPAREN', ch, startCol);
        break;
      case ';':
        push('SEMI', ch, startCol);
        break;
      default:
        throw new LexError(`Unexpected character '${ch}'`, line, col);
    }
    i++;
    col++;
  }

  push('EOF', '', col);
  return tokens;
}
