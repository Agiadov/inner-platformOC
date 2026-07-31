"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ForceGraphMethods } from "react-force-graph-3d";
import type { KnowledgeGraph, KnowledgeNode } from "@/lib/graph-data";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

type KnowledgeGraphViewProps = {
  data: KnowledgeGraph;
  selectedNodeId: string;
  onSelectNode: (node: KnowledgeNode) => void;
};

export function KnowledgeGraphView({
  data,
  selectedNodeId,
  onSelectNode,
}: KnowledgeGraphViewProps) {
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const graph = useMemo(
    () => ({
      nodes: data.nodes.map((node) => ({ ...node })),
      links: data.links.map((link) => ({ ...link })),
    }),
    [data],
  );

  const focusNode = useCallback(
    (rawNode: object) => {
      const node = rawNode as KnowledgeNode & {
        x?: number;
        y?: number;
        z?: number;
      };

      onSelectNode(node);

      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const z = node.z ?? 0;
      const distance = 115;
      const length = Math.hypot(x, y, z) || 1;
      const ratio = 1 + distance / length;

      graphRef.current?.cameraPosition(
        { x: x * ratio, y: y * ratio, z: z * ratio },
        { x, y, z },
        700,
      );
    },
    [onSelectNode],
  );

  return (
    <div className="graph-wrap" aria-label="Интерактивный граф знаний">
      <ForceGraph3D
        ref={graphRef}
        graphData={graph}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel={(node) => {
          const item = node as KnowledgeNode;
          return `${item.name} · ${item.kind}`;
        }}
        nodeColor={(node) => (node as KnowledgeNode).color}
        nodeVal={(node) => {
          const item = node as KnowledgeNode;
          const selectedBoost = item.id === selectedNodeId ? 1.75 : 1;
          const hoverBoost = item.id === hoveredNodeId ? 1.35 : 1;
          return item.val * selectedBoost * hoverBoost;
        }}
        nodeRelSize={5.5}
        nodeResolution={24}
        nodeOpacity={0.96}
        linkColor={() => "rgba(85, 242, 192, 0.38)"}
        linkOpacity={0.72}
        linkWidth={1.1}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={() => "#55f2c0"}
        showNavInfo={false}
        enableNodeDrag
        cooldownTicks={120}
        d3AlphaDecay={0.025}
        d3VelocityDecay={0.28}
        onNodeHover={(node) => {
          const item = node as KnowledgeNode | null;
          setHoveredNodeId(item?.id ?? null);
          document.body.style.cursor = item ? "pointer" : "default";
        }}
        onNodeClick={(node) => focusNode(node as object)}
        onEngineStop={() => graphRef.current?.zoomToFit(700, 90)}
      />
      <div className="graph-help">Наведи на узел и нажми — карточка откроется справа от графа</div>
    </div>
  );
}
