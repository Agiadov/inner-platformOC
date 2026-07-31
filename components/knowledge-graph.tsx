"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef } from "react";
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

      const distance = 135;
      const length = Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0) || 1;
      const ratio = 1 + distance / length;

      graphRef.current?.cameraPosition(
        {
          x: (node.x ?? 0) * ratio,
          y: (node.y ?? 0) * ratio,
          z: (node.z ?? 0) * ratio,
        },
        { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 },
        850,
      );

      onSelectNode(node);
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
          return item.val * (item.id === selectedNodeId ? 1.55 : 1);
        }}
        nodeOpacity={0.93}
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
        onNodeClick={focusNode}
        onEngineStop={() => graphRef.current?.zoomToFit(700, 90)}
      />
      <div className="graph-help">Перетаскивай · вращай · нажимай на узлы</div>
    </div>
  );
}
