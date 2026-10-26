import { useMemo, useState, type ReactNode } from 'react';
import { parse } from '@/compiler/parser';
import { evaluate } from '@/compiler/evaluator';
import AstGraph from '@/components/AstGraph';

const SAMPLE = `# Calculator language demo
x = 10
y = x + 5 * 2
z = (x + y) / 3
print(z)
x + y - 1`;

function App() {
  const [source, setSource] = useState(SAMPLE);

  const { evalResult, statements } = useMemo(() => {
    const parsed = parse(source);
    const result = evaluate(parsed.statements, parsed.errors);
    return { evalResult: result, statements: parsed.statements };
  }, [source]);

  const lineCount = source.split('\n').length;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <Header />
      <div className="flex-1 flex min-h-0 flex-col lg:flex-row">
        {/* Left: input */}
        <section className="flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-slate-800 lg:w-1/2 h-1/2 lg:h-full">
          <PaneHeader title="Input" subtitle={`${lineCount} line${lineCount === 1 ? '' : 's'}`} />
          <div className="flex-1 min-h-0 overflow-hidden">
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
              placeholder="Type variable assignments, arithmetic, and print() statements…"
              className="w-full h-full resize-none bg-slate-900/60 text-slate-100 font-mono text-sm leading-6 p-4 outline-none border-0 placeholder:text-slate-600"
            />
          </div>
        </section>

        {/* Right: output */}
        <section className="flex flex-col min-h-0 lg:w-1/2 h-1/2 lg:h-full">
          <PaneHeader
            title="Output"
            subtitle={
              <OverallStatus ok={evalResult.allValid} hasContent={evalResult.results.length > 0 || evalResult.parseErrors.length > 0} />
            }
          />
          <OutputScreen result={evalResult} source={source} />
        </section>
      </div>

      {/* AST graph — bottom, full width */}
      <div className="border-t border-slate-800 h-[45vh] flex flex-col min-h-0 bg-slate-950">
        <PaneHeader title="AST Graph" subtitle="arithmetic expressions only" />
        <div className="flex-1 min-h-0">
          <AstGraph statements={statements} />
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center gap-3 px-4 h-12 border-b border-slate-800 bg-slate-900/70 shrink-0">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400" />
        <span className="font-semibold tracking-tight">Compiler Front-End</span>
      </div>
      <span className="text-slate-500 text-sm hidden sm:inline">
        Calculator language · lexer → parser → AST → evaluator
      </span>
    </header>
  );
}

function PaneHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 h-10 border-b border-slate-800 bg-slate-900/40 shrink-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">{title}</span>
      <span className="text-xs text-slate-500">{subtitle}</span>
    </div>
  );
}

function OverallStatus({ ok, hasContent }: { ok: boolean; hasContent: boolean }) {
  if (!hasContent) return <span className="text-slate-500">empty</span>;
  return (
    <span className={ok ? 'text-emerald-400' : 'text-rose-400'}>
      {ok ? 'all valid' : 'has errors'}
    </span>
  );
}

function OutputScreen({
  result,
  source,
}: {
  result: ReturnType<typeof evaluate>;
  source: string;
}) {
  const { parseErrors, results, allValid } = result;

  if (source.trim() === '') {
    return (
      <div className="h-full overflow-auto p-4 text-slate-500 text-sm">
        Output will appear here as you type.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 space-y-3 font-mono text-sm">
      {parseErrors.length > 0 && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3">
          <div className="text-rose-400 font-semibold mb-1 text-xs uppercase tracking-wider">
            Syntax errors
          </div>
          <ul className="space-y-1">
            {parseErrors.map((e, i) => (
              <li key={i} className="text-rose-200">
                <span className="text-rose-400">line {e.line}:{e.col}</span> — {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {results.map((r, i) => {
        const ok = r.status === 'valid';
        return (
          <div
            key={i}
            className={`rounded-lg border p-3 ${
              ok
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-rose-500/40 bg-rose-500/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  ok ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span className={ok ? 'text-emerald-300' : 'text-rose-300'}>
                {r.message}
              </span>
            </div>
            {r.output !== undefined && (
              <div className="mt-2 ml-4 text-slate-200">
                <span className="text-slate-500">stdout &gt;</span> {r.output}
              </div>
            )}
          </div>
        );
      })}

      <div
        className={`mt-2 text-xs uppercase tracking-wider ${
          allValid ? 'text-emerald-400' : 'text-rose-400'
        }`}
      >
        {allValid ? '✓ program valid' : '✗ program invalid'}
      </div>
    </div>
  );
}

export default App;
