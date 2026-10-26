# Compiler Front-End — Calculator Language Analyzer

An interactive, in-browser compiler front-end for a tiny calculator language. Type code on the left and, as you type, the app **tokenizes → parses → builds an AST → evaluates** it, showing per-statement results, syntax errors, and a visual AST graph for every statement.

Built with **React 18, TypeScript, Vite, Tailwind CSS** and **React Flow (`@xyflow/react`)**. Everything runs client-side; there is no backend.

---

## Features

- **Live analysis** – the whole pipeline re-runs on every keystroke.
- **Hand-written lexer** with line/column tracking for accurate error locations.
- **Recursive-descent parser** with correct operator precedence and **error recovery** (reports multiple syntax errors instead of stopping at the first).
- **Evaluator** with an environment of variables, reporting runtime errors such as undefined variables and division by zero.
- **Per-statement output panel** – valid/invalid status, computed values, and `print()` output shown as `stdout`.
- **AST graph visualisation** – one tree per statement, with operator nodes (cyan) and value nodes (green).
- **Responsive layout** – side-by-side panes on large screens, stacked on small ones.

---

## The Language

| Construct | Example | Notes |
|---|---|---|
| Numbers | `42`, `3.14` | Integers and decimals |
| Variables | `x`, `total_2` | Letters, digits, `_`; must not start with a digit |
| Assignment | `x = 10` | Defines/overwrites a variable |
| Arithmetic | `+  -  *  /` | Standard precedence; `*` `/` bind tighter than `+` `-` |
| Parentheses | `(x + y) / 3` | Grouping |
| Unary minus | `-x`, `-(2 + 3)` | Parsed as `0 - operand` |
| Print | `print(z)` | Outputs the value of an expression |
| Expression statement | `x + y - 1` | Evaluated and its result displayed |
| Comments | `# comment` | Run to end of line |
| Separators | newline or `;` | Both end a statement |

### Grammar

```
program   : (statement (NEWLINE | ';')*)*
statement : ID '=' expr
          | 'print' '(' expr ')'
          | expr
expr      : term (('+' | '-') term)*
term      : factor (('*' | '/') factor)*
factor    : NUMBER | ID | '(' expr ')' | '-' factor
```

### Sample program

```
# Calculator language demo
x = 10
y = x + 5 * 2
z = (x + y) / 3
print(z)
x + y - 1
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (Vite 7 recommends Node 20+)
- npm

### Install and run

```bash
npm install
npm run dev
```

Then open the URL printed by Vite (usually http://localhost:5173).

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check with `tsc --noEmit` |

---

## How It Works

```
source text
    │
    ▼
 Lexer (lexer.ts)       → Token[]  (NUMBER, ID, PLUS, MINUS, STAR, SLASH,
    │                                 ASSIGN, LPAREN, RPAREN, SEMI, NEWLINE,
    │                                 PRINT, EOF)
    ▼
 Parser (parser.ts)     → Stmt[] (AST) + ParseError[]
    │
    ▼
 Evaluator (evaluator.ts) → StmtResult[] (status, message, output)
    │
    ▼
 UI (App.tsx, AstGraph.tsx)
```

1. **Lexer** (`src/compiler/lexer.ts`) – scans characters into tokens, skipping whitespace and comments, and throws a `LexError` (with line and column) on an unexpected character such as `@`.
2. **Parser** (`src/compiler/parser.ts`) – a recursive-descent parser (`parseExpr` → `parseTerm` → `parseFactor`) producing typed AST nodes (`Num`, `Var`, `BinOp`; statements `Assign`, `Print`, `ExprStmt`). On a syntax error it records a `ParseError`, skips ahead to the next newline or `;`, and keeps parsing.
3. **Evaluator** (`src/compiler/evaluator.ts`) – walks the AST with a variable environment. Each statement gets a valid/invalid result; runtime errors (`Undefined variable 'x'`, `Division by zero`) mark only that statement invalid. Numbers are formatted to at most 6 decimal places.
4. **UI** – `App.tsx` runs the pipeline inside a `useMemo` keyed on the source text and renders the input, output, and AST panes. `AstGraph.tsx` lays out each statement's tree with a custom leaf-based layout and renders it read-only with React Flow.

---

## Project Structure

```
.
├── index.html
├── package.json
├── vite.config.ts            # React plugin + "@" → "src" alias
├── tailwind.config.js
├── tsconfig*.json
├── eslint.config.js
└── src
    ├── main.tsx              # React entry point
    ├── App.tsx               # Layout: input, output, AST panes
    ├── index.css             # Tailwind directives
    ├── components
    │   ├── AstGraph.tsx      # AST visualisation (React Flow)
    │   └── AstGraph.backup.tsx   # Older version, not used
    └── compiler
        ├── lexer.ts          # Tokenizer
        ├── parser.ts         # Recursive-descent parser + AST types
        ├── evaluator.ts      # Interpreter and result types
        └── astToFlow.js      # Dagre-based AST→flow helper (not currently used)
```

The `@/` import alias maps to `src/` (e.g. `@/compiler/parser`).

---

## Example Output

| Input | Result |
|---|---|
| `x = 10` | Valid assignment — x = 10 |
| `print(x * 2)` | Valid print statement — `stdout > 20` |
| `y = z + 1` | Invalid — Undefined variable 'z' |
| `1 / 0` | Invalid — Division by zero |
| `x = ` | Syntax error — Unexpected end of input, expected an expression |
| `3 $ 4` | Syntax error — Unexpected character '$' |

---

## Known Limitations

- Numbers only: no strings, booleans, functions (other than `print`), or exponent/modulo operators.
- `print` is a statement form `print(expr)`; it takes exactly one expression.
- A lexer error (invalid character) stops tokenizing, so only that error is reported for the input.
- The AST graph covers arithmetic expressions per statement; there is no whole-program tree.
- Variable names assigned in a statement that later fails to evaluate are not defined for subsequent lines.

---

## Notes on Unused Code

- `src/compiler/astToFlow.js` and `src/components/AstGraph.backup.tsx` are not imported anywhere. The former expects a different AST shape (`BinaryExpression`, `NumberLiteral`, …) than the parser produces.
- `@supabase/supabase-js`, `@dagrejs/dagre` are listed as dependencies, but the active code does not use Supabase, and Dagre is only used by the unused `astToFlow.js`. They can be removed if not needed.
- The `package.json` name is still the starter template default (`vite-react-typescript-starter`).

---

## Tech Stack

- [React](https://react.dev/) 18
- [TypeScript](https://www.typescriptlang.org/) 5
- [Vite](https://vite.dev/) 7
- [Tailwind CSS](https://tailwindcss.com/) 3
- [React Flow (@xyflow/react)](https://reactflow.dev/) 12
- [lucide-react](https://lucide.dev/) icons (installed; not currently used in the UI)
- ESLint 9 + typescript-eslint
