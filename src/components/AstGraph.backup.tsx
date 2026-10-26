import { useMemo } from 'react';
import { Expr, Stmt } from '@/compiler/parser';

interface TreeNode {
  id: string;
  label: string;
  children: TreeNode[];
  kind: string;
}

function exprToNode(expr: Expr, idPrefix: string): TreeNode {
  switch (expr.kind) {
    case 'Num':
      return { id: idPrefix, label: String(expr.value), children: [], kind: 'Number' };
    case 'Var':
      return { id: idPrefix, label: expr.name, children: [], kind: 'Variable' };
    case 'BinOp': {
      return {
        id: idPrefix,
        label: expr.op,
        children: [
          exprToNode(expr.left, `${idPrefix}.L`),
          exprToNode(expr.right, `${idPrefix}.R`),
        ],
        kind: 'Operator',
      };
    }
  }
}

function stmtToRoots(stmt: Stmt, index: number): { root: TreeNode; stmtLabel: string } | null {
  switch (stmt.kind) {
    case 'Assign':
      return {
        stmtLabel: `${stmt.name} =`,
        root: exprToNode(stmt.expr, `s${index}`),
      };
    case 'Print':
      return null;
    
    case 'ExprStmt':
      return {
        stmtLabel: 'expression',
        root: exprToNode(stmt.expr, `s${index}`),
      };
  }
}

// Compute layout positions for a tree using a simple in-order traversal.
function layout(root: TreeNode): { nodes: PositionedNode[]; width: number; height: number } {
  let xCounter = 0;
  const positioned: PositionedNode[] = [];
  const LEVEL_HEIGHT = 70;
  const NODE_SPACING = 56;

  const traverse = (node: TreeNode, depth: number): number => {
    if (node.children.length === 0) {
      const x = xCounter;
      xCounter += NODE_SPACING;
      positioned.push({ ...node, x, y: depth * LEVEL_HEIGHT + PAD });
      return x;
    }
    const childXs = node.children.map((c) => traverse(c, depth + 1));
    const x = (childXs[0] + childXs[childXs.length - 1]) / 2;
    positioned.push({ ...node, x, y: depth * LEVEL_HEIGHT + PAD });
    return x;
  };

  traverse(root, 0);

  // Normalize x so the leftmost node has full padding on its left
  const minX = Math.min(...positioned.map((p) => xOf(p) - radius));
  const maxX = Math.max(...positioned.map((p) => xOf(p) + radius));
  positioned.forEach((p) => (p.x = p.x - minX + PAD));

  const width = maxX - minX + PAD * 2;
  const maxDepth = Math.max(...positioned.map((p) => p.y));
  const height = maxDepth + radius + PAD;
  return { nodes: positioned, width, height };
}

interface PositionedNode extends TreeNode {
  x: number;
  y: number;
}

const radius = 20;
const PAD = 32; // padding around the graph so nodes/arrowheads aren't clipped
const xOf = (n: PositionedNode) => n.x;

interface Props {
  statements: Stmt[];
}

export default function AstGraph({ statements }: Props) {
  const trees = useMemo(() => {
    return statements
      .map((s, i) => stmtToRoots(s, i))
      .filter((t): t is { root: TreeNode; stmtLabel: string } => t !== null)
      .map((t) => ({ ...t, layout: layout(t.root) }));
  }, [statements]);

  if (trees.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        No arithmetic expressions to visualize yet.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="space-y-6">
        {trees.map((tree, i) => (
          <div key={i} className="bg-slate-900/40 rounded-lg border border-slate-700/50 p-3">
            <div className="text-xs uppercase tracking-wider text-cyan-400 mb-2 font-mono">
              {tree.stmtLabel}
            </div>
            <AstCanvas nodes={tree.layout.nodes} width={tree.layout.width} height={tree.layout.height} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AstCanvas({ nodes, width, height }: { nodes: PositionedNode[]; width: number; height: number }) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges: { from: PositionedNode; to: PositionedNode }[] = [];
  const collect = (n: TreeNode) => {
    for (const c of n.children) {
      const from = byId.get(n.id)!;
      const to = byId.get(c.id)!;
      edges.push({ from, to });
      collect(c);
    }
  };
  if (nodes.length > 0) collect(nodes[0]);

  const colorFor = (kind: string) => {
    switch (kind) {
      case 'Operator':
        return '#22d3ee';
      case 'Number':
        return '#a7f3d0';
      default:
        return '#fde68a';
    }
  };

  // Shorten an edge so it starts/ends on the circle boundary (not the center),
  // leaving room for the arrowhead at the tip.
  const arrowLen = 8;
  const shorten = (from: PositionedNode, to: PositionedNode) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    return {
      x1: from.x + ux * radius,
      y1: from.y + uy * radius,
      x2: to.x - ux * (radius + arrowLen),
      y2: to.y - uy * (radius + arrowLen),
    };
  };

  return (
    <svg
      width={Math.max(width, 200)}
      height={Math.max(height, 80)}
      className="block"
      style={{ minWidth: '100%' }}
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth={arrowLen}
          markerHeight={arrowLen}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
        </marker>
      </defs>
      {edges.map((e, idx) => {
        const p = shorten(e.from, e.to);
        return (
          <line
            key={`e${idx}`}
            x1={p.x1}
            y1={p.y1}
            x2={p.x2}
            y2={p.y2}
            stroke="#64748b"
            strokeWidth={2}
            markerEnd="url(#arrow)"
          />
        );
      })}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle
            cx={n.x}
            cy={n.y}
            r={radius}
            fill={colorFor(n.kind)}
            fillOpacity={0.18}
            stroke={colorFor(n.kind)}
            strokeWidth={2}
          />
          <text
            x={n.x}
            y={n.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={14}
            fontFamily="ui-monospace, monospace"
            fill="#e2e8f0"
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
