"use client";

import { useMemo, useState } from "react";
import { KnowledgeGraphView } from "@/components/knowledge-graph";
import {
  graphData,
  kindLabels,
  type KnowledgeNode,
  type NodeKind,
} from "@/lib/graph-data";

const spaces = ["Все", "INNER", "Контент", "Сайты", "AI-инструменты"];
const kinds = Object.keys(kindLabels) as NodeKind[];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [command, setCommand] = useState("");
  const [activeSpace, setActiveSpace] = useState("Все");
  const [enabledKinds, setEnabledKinds] = useState<Set<NodeKind>>(
    () => new Set(kinds),
  );
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode>(
    graphData.nodes[0],
  );

  const filteredGraph = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nodes = graphData.nodes.filter((node) => {
      const matchesSpace = activeSpace === "Все" || node.group === activeSpace;
      const matchesKind = enabledKinds.has(node.kind);
      const matchesQuery =
        !normalizedQuery ||
        node.name.toLowerCase().includes(normalizedQuery) ||
        node.description.toLowerCase().includes(normalizedQuery);

      return matchesSpace && matchesKind && matchesQuery;
    });

    const visibleIds = new Set(nodes.map((node) => node.id));
    const links = graphData.links.filter(
      (link) => visibleIds.has(link.source) && visibleIds.has(link.target),
    );

    return { nodes, links };
  }, [activeSpace, enabledKinds, query]);

  const counts = useMemo(
    () =>
      kinds.map((kind) => [
        kind,
        graphData.nodes.filter((node) => node.kind === kind).length,
      ] as const),
    [],
  );

  const toggleKind = (kind: NodeKind) => {
    setEnabledKinds((current) => {
      const next = new Set(current);
      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }
      return next;
    });
  };

  return (
    <main className="os-shell">
      <aside className="sidebar panel">
        <div className="brand">
          LUTOWAY OS <span>/ alpha</span>
        </div>
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по памяти..."
          aria-label="Поиск по памяти"
        />

        <div className="section-title">Пространства</div>
        <div className="list">
          {spaces.map((space) => (
            <button
              key={space}
              type="button"
              className={activeSpace === space ? "active" : undefined}
              onClick={() => setActiveSpace(space)}
            >
              <span className="dot" />
              {space}
            </button>
          ))}
        </div>

        <div className="section-title">Выбранный узел</div>
        <div className="inspector">
          <div className="inspector-topline">
            <span
              className="inspector-color"
              style={{ backgroundColor: selectedNode.color }}
            />
            <span>{kindLabels[selectedNode.kind]}</span>
          </div>
          <strong>{selectedNode.name}</strong>
          <p>{selectedNode.description}</p>
          <div className="inspector-meta">Пространство: {selectedNode.group}</div>
        </div>
      </aside>

      <section className="stage">
        {filteredGraph.nodes.length > 0 ? (
          <KnowledgeGraphView
            data={filteredGraph}
            selectedNodeId={selectedNode.id}
            onSelectNode={setSelectedNode}
          />
        ) : (
          <div className="empty-state">
            <span>Нет подходящих узлов</span>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveSpace("Все");
                setEnabledKinds(new Set(kinds));
              }}
            >
              Сбросить фильтры
            </button>
          </div>
        )}

        <div className="stage-badge">
          <span className="pulse" />
          {filteredGraph.nodes.length} узлов · {filteredGraph.links.length} связей
        </div>

        <form
          className="command"
          onSubmit={(event) => {
            event.preventDefault();
            if (!command.trim()) return;
            setQuery(command.trim());
            setCommand("");
          }}
        >
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="Найди всё, что связано с INNER..."
            aria-label="Команда для LUTOWAY OS"
          />
          <button type="submit">Найти</button>
        </form>
      </section>

      <aside className="rightbar panel">
        <div className="section-title right-title">Фильтр типов</div>
        <div className="filter-list">
          {counts.map(([kind, count]) => (
            <label key={kind} className="filter-row">
              <input
                type="checkbox"
                checked={enabledKinds.has(kind)}
                onChange={() => toggleKind(kind)}
              />
              <span className={`kind-dot kind-${kind}`} />
              <span>{kindLabels[kind]}</span>
              <span className="filter-count">{count}</span>
            </label>
          ))}
        </div>

        <div className="jarvis">
          <div className="jarvis-ring ring-one" />
          <div className="jarvis-ring ring-two" />
          <div className="jarvis-core">L·U·T·O</div>
        </div>
        <div className="status">GRAPH ONLINE</div>
        <p className="right-note">
          Нажми на узел, чтобы приблизить камеру и открыть его описание.
        </p>
      </aside>
    </main>
  );
}
