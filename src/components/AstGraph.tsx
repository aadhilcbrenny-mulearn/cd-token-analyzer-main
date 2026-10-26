import { useMemo } from 'react';
import {
  Background,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import { Expr, Stmt } from '@/compiler/parser';

import '@xyflow/react/dist/style.css';

interface Props {
  statements: Stmt[];
}

const NODE_WIDTH = 110;
const NODE_HEIGHT = 48;
const HORIZONTAL_GAP = 150;
const VERTICAL_GAP = 90;

type AstNode = Node<{ label: string; kind: 'operator' | 'value' }>;

function createNode(
  id: string,
  label: string,
  kind: 'operator' | 'value',
): AstNode {
  return {
    id,
    data: { label, kind },
    position: { x: 0, y: 0 },
    style: {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      borderRadius: 8,
      border: `2px solid ${kind === 'operator' ? '#22d3ee' : '#a7f3d0'}`,
      background: kind === 'operator' ? '#164e63' : '#064e3b',
      color: '#e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'ui-monospace, monospace',
      fontWeight: 600,
    },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  };
}

function expressionLabel(expr: Expr): string {
  switch (expr.kind) {
    case 'Num':
      return String(expr.value);
    case 'Var':
      return expr.name;
    case 'BinOp':
      return expr.op;
  }
}

function expressionKind(expr: Expr): 'operator' | 'value' {
  return expr.kind === 'BinOp' ? 'operator' : 'value';
}

function graphForExpression(expr: Expr, graphId: string): {
  nodes: AstNode[];
  edges: Edge[];
  rootId: string;
} {
  const nodes: AstNode[] = [];
  const edges: Edge[] = [];
  let nextId = 0;

  const visit = (current: Expr): string => {
    const id = `${graphId}-node-${nextId++}`;
    nodes.push(createNode(id, expressionLabel(current), expressionKind(current)));

    if (current.kind === 'BinOp') {
      const leftId = visit(current.left);
      const rightId = visit(current.right);
      edges.push(
        createEdge(id, leftId),
        createEdge(id, rightId),
      );
    }

    return id;
  };

  const rootId = visit(expr);
  return { nodes, edges, rootId };
}

function graphForStatement(stmt: Stmt, graphId: string): {
  nodes: AstNode[];
  edges: Edge[];
} {
  if (stmt.kind === 'ExprStmt') {
    const graph = graphForExpression(stmt.expr, graphId);
    layoutTree(graph.nodes, graph.edges, graph.rootId);
    return graph;
  }

  const expressionGraph = graphForExpression(stmt.expr, graphId);
  const rootId = `${graphId}-statement`;
  const rootLabel = stmt.kind === 'Assign' ? '=' : 'print';
  expressionGraph.nodes.push(createNode(rootId, rootLabel, 'operator'));

  if (stmt.kind === 'Assign') {
    const nameId = `${graphId}-name`;
    expressionGraph.nodes.push(createNode(nameId, stmt.name, 'value'));
    expressionGraph.edges.push(
      createEdge(rootId, nameId),
      createEdge(rootId, expressionGraph.nodes[0].id),
    );
  } else {
    expressionGraph.edges.push(createEdge(rootId, expressionGraph.nodes[0].id));
  }

  layoutTree(expressionGraph.nodes, expressionGraph.edges, rootId);
  return expressionGraph;
}

function createEdge(source: string, target: string): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: 'smoothstep',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: '#64748b',
    },
    style: {
      stroke: '#64748b',
      strokeWidth: 2,
    },
  };
}

function layoutTree(nodes: AstNode[], edges: Edge[], rootId: string) {
  const childrenById = new Map<string, string[]>();
  for (const edge of edges) {
    const children = childrenById.get(edge.source) ?? [];
    children.push(edge.target);
    childrenById.set(edge.source, children);
  }

  let leafIndex = 0;
  const positionNode = (id: string, depth: number): number => {
    const children = childrenById.get(id) ?? [];
    let x: number;

    if (children.length === 0) {
      x = leafIndex * HORIZONTAL_GAP;
      leafIndex += 1;
    } else {
      const childPositions = children.map((childId) =>
        positionNode(childId, depth + 1),
      );
      x = (childPositions[0] + childPositions[childPositions.length - 1]) / 2;
    }

    const node = nodes.find((candidate) => candidate.id === id);
    if (node) {
      node.position = {
        x,
        y: depth * VERTICAL_GAP,
      };
    }
    return x;
  };

  positionNode(rootId, 0);
}

function statementExpression(stmt: Stmt): Expr | null {
  switch (stmt.kind) {
    case 'Assign':
    case 'Print':
    case 'ExprStmt':
      return stmt.expr;
  }
}

function statementLabel(stmt: Stmt): string {
  switch (stmt.kind) {
    case 'Assign':
      return `${stmt.name} =`;
    case 'Print':
      return 'print()';
    case 'ExprStmt':
      return 'expression';
  }
}

function AstCanvas({
  graphId,
  statement,
}: {
  graphId: string;
  statement: Stmt;
}) {
  const graph = useMemo(
    () => graphForStatement(statement, graphId),
    [statement, graphId],
  );

  const graphHeight = Math.max(
    220,
    (Math.max(...graph.nodes.map((node) => node.position.y)) || 0) +
      NODE_HEIGHT +
      40,
  );
  const graphWidth = Math.max(
    320,
    (Math.max(...graph.nodes.map((node) => node.position.x)) || 0) +
      NODE_WIDTH +
      40,
  );

  return (
    <div
      className="w-full overflow-auto"
      style={{ height: graphHeight }}
    >
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        defaultViewport={{ x: 20, y: 20, zoom: 1 }}
        style={{ width: graphWidth, height: graphHeight }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background color="#334155" gap={18} size={1} />
      </ReactFlow>
    </div>
  );
}

export default function AstGraph({ statements }: Props) {
  const expressionStatements = statements
    .map((statement, index) => ({
      statement,
      index,
      expr: statementExpression(statement),
    }))
    .filter(
      (
        item,
      ): item is { statement: Stmt; index: number; expr: Expr } =>
        item.expr !== null,
    );

  if (expressionStatements.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        No arithmetic expressions to visualize yet.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="space-y-6">
        {expressionStatements.map(({ statement, index }) => (
          <div
            key={`statement-${index}`}
            className="bg-slate-900/40 rounded-lg border border-slate-700/50 p-3"
          >
            <div className="text-xs uppercase tracking-wider text-cyan-400 mb-2 font-mono">
              {statementLabel(statement)}
            </div>
            <AstCanvas
              graphId={`statement-${index}`}
              statement={statement}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
