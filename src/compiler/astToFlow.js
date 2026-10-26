
import dagre from "@dagrejs/dagre";
import { MarkerType } from "@xyflow/react";

const NODE_WIDTH = 100;
const NODE_HEIGHT = 44;

export function astToFlow(ast) {
  const nodes = [];
  const edges = [];
  let nextId = 0;

  function visit(node) {
    const id = `ast-${nextId++}`;

    const label =
      node.type === "BinaryExpression" ||
      node.type === "UnaryExpression"
        ? node.operator
        : node.type === "NumberLiteral"
          ? String(node.value)
          : node.name;

    nodes.push({
      id,
      data: { label },
      position: { x: 0, y: 0 },
      style: {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        borderRadius: 10,
        border: "1px solid #64748b",
        background: [
          "BinaryExpression",
          "UnaryExpression",
        ].includes(node.type)
          ? "#dbeafe"
          : "#dcfce7",
        color: "#172033",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    });

    const children =
      node.type === "BinaryExpression"
        ? [node.left, node.right]
        : node.type === "UnaryExpression"
          ? [node.argument]
          : [];

    for (const child of children) {
      const childId = visit(child);

      edges.push({
        id: `edge-${id}-${childId}`,
        source: id,
        target: childId,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
          color: "#64748b",
        },
        style: {
          stroke: "#64748b",
          strokeWidth: 2,
        },
      });
    }

    return id;
  }

  visit(ast);

  // Automatically arrange the tree from top to bottom.
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));

  graph.setGraph({
    rankdir: "TB",
    nodesep: 35,
    ranksep: 65,
    marginx: 20,
    marginy: 20,
  });

  for (const node of nodes) {
    graph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  for (const node of nodes) {
    const { x, y } = graph.node(node.id);

    // Dagre gives the center; React Flow uses the top-left.
    node.position = {
      x: x - NODE_WIDTH / 2,
      y: y - NODE_HEIGHT / 2,
    };
  }

  return { nodes, edges };
}
