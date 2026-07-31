"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import * as THREE from "three";
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

function makeLabel(text: string, color: string, selected: boolean) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const width = 420;
  const height = 84;
  canvas.width = width;
  canvas.height = height;

  if (!context) return new THREE.Sprite();

  context.clearRect(0, 0, width, height);
  context.font = selected ? "700 32px Arial" : "600 27px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(3, 8, 9, 0.84)";
  context.roundRect(8, 10, width - 16, height - 20, 20);
  context.fill();
  context.strokeStyle = selected ? color : "rgba(255,255,255,.14)";
  context.lineWidth = selected ? 4 : 2;
  context.stroke();
  context.fillStyle = "#edf7f4";
  context.fillText(text, width / 2, height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(selected ? 48 : 40, selected ? 9.6 : 8, 1);
  sprite.position.set(0, selected ? 12 : 10, 0);
  return sprite;
}

export function KnowledgeGraphView({ data, selectedNodeId, onSelectNode }: KnowledgeGraphViewProps) {
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const graph = useMemo(
    () => ({
      nodes: data.nodes.map((node) => ({ ...node })),
      links: data.links.map((link) => ({ ...link })),
    }),
    [data],
  );

  const focusNode = useCallback((rawNode: object) => {
    const node = rawNode as KnowledgeNode & { x?: number; y?: number; z?: number };
    onSelectNode(node);

    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const z = node.z ?? 0;
    const distance = 105;
    const length = Math.hypot(x, y, z) || 1;
    const ratio = 1 + distance / length;

    graphRef.current?.cameraPosition(
      { x: x * ratio, y: y * ratio, z: z * ratio },
      { x, y, z },
      700,
    );
  }, [onSelectNode]);

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
        nodeThreeObject={(node) => {
          const item = node as KnowledgeNode;
          const selected = item.id === selectedNodeId;
          const hovered = item.id === hoveredNodeId;
          const group = new THREE.Group();
          const radius = Math.max(3.6, Math.sqrt(item.val) * 1.45) * (selected ? 1.38 : hovered ? 1.18 : 1);
          const geometry = new THREE.SphereGeometry(radius, 24, 24);
          const material = new THREE.MeshStandardMaterial({
            color: item.color,
            emissive: item.color,
            emissiveIntensity: selected ? 1.1 : hovered ? 0.75 : 0.42,
            roughness: 0.32,
            metalness: 0.15,
          });
          group.add(new THREE.Mesh(geometry, material));
          group.add(makeLabel(item.name, item.color, selected));
          return group;
        }}
        nodeThreeObjectExtend={false}
        linkColor={() => "rgba(85, 242, 192, 0.32)"}
        linkOpacity={0.68}
        linkWidth={1.2}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={1.7}
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
        onEngineStop={() => graphRef.current?.zoomToFit(700, 110)}
      />
      <div className="graph-help">Нажми на узел · выбери глубину связей · открой карточку</div>
    </div>
  );
}
