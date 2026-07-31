"use client";

import { useMemo, useState } from "react";
import { KnowledgeGraphView } from "@/components/knowledge-graph";
import {
  graphData,
  kindLabels,
  type KnowledgeLink,
  type KnowledgeNode,
  type NodeKind,
} from "@/lib/graph-data";

const spaces = ["Все", "INNER", "Контент", "Сайты", "AI-инструменты"];
const kinds = Object.keys(kindLabels) as NodeKind[];

function endpointId(value: string | { id?: string }) {
  return typeof value === "string" ? value : value.id ?? "";
}

function getDepthIds(nodeId: string, depth: number, links: KnowledgeLink[]) {
  const visited = new Set([nodeId]);
  let frontier = new Set([nodeId]);

  for (let level = 0; level < depth; level += 1) {
    const next = new Set<string>();
    links.forEach((link) => {
      const source = endpointId(link.source as string | { id?: string });
      const target = endpointId(link.target as string | { id?: string });
      if (frontier.has(source) && !visited.has(target)) next.add(target);
      if (frontier.has(target) && !visited.has(source)) next.add(source);
    });
    next.forEach((id) => visited.add(id));
    frontier = next;
    if (!frontier.size) break;
  }

  return visited;
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [command, setCommand] = useState("");
  const [activeSpace, setActiveSpace] = useState("Все");
  const [depth, setDepth] = useState(3);
  const [cardOpen, setCardOpen] = useState(false);
  const [enabledKinds, setEnabledKinds] = useState<Set<NodeKind>>(() => new Set(kinds));
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode>(graphData.nodes[0]);

  const depthIds = useMemo(
    () => getDepthIds(selectedNode.id, depth, graphData.links),
    [depth, selectedNode.id],
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
      const matchesDepth = depthIds.has(node.id);

      return matchesSpace && matchesKind && matchesQuery && matchesDepth;
    });

    const visibleIds = new Set(nodes.map((node) => node.id));
    const links = graphData.links.filter((link) => {
      const source = endpointId(link.source as string | { id?: string });
      const target = endpointId(link.target as string | { id?: string });
      return visibleIds.has(source) && visibleIds.has(target);
    });

    return { nodes, links };
  }, [activeSpace, depthIds, enabledKinds, query]);

  const relatedNodes = useMemo(() => {
    const ids = new Set<string>();
    graphData.links.forEach((link) => {
      const source = endpointId(link.source as string | { id?: string });
      const target = endpointId(link.target as string | { id?: string });
      if (source === selectedNode.id) ids.add(target);
      if (target === selectedNode.id) ids.add(source);
    });
    return graphData.nodes.filter((node) => ids.has(node.id));
  }, [selectedNode.id]);

  const counts = useMemo(
    () => kinds.map((kind) => [kind, graphData.nodes.filter((node) => node.kind === kind).length] as const),
    [],
  );

  const toggleKind = (kind: NodeKind) => {
    setEnabledKinds((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  };

  const selectNode = (node: KnowledgeNode) => {
    setSelectedNode(node);
    setCardOpen(true);
  };

  return (
    <main className="os-shell">
      <aside className="sidebar panel">
        <div className="brand">LUTOWAY OS <span>/ alpha</span></div>
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
              <span className="dot" />{space}
            </button>
          ))}
        </div>

        <div className="section-title">Глубина связей</div>
        <div className="depth-switcher">
          {[1, 2, 3].map((value) => (
            <button
              key={value}
              type="button"
              className={depth === value ? "active" : undefined}
              onClick={() => setDepth(value)}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="section-title">Выбранный узел</div>
        <button type="button" className="inspector" onClick={() => setCardOpen(true)}>
          <div className="inspector-topline">
            <span className="inspector-color" style={{ backgroundColor: selectedNode.color }} />
            <span>{kindLabels[selectedNode.kind]}</span>
          </div>
          <strong>{selectedNode.name}</strong>
          <p>{selectedNode.description}</p>
          <div className="inspector-meta">Пространство: {selectedNode.group}</div>
        </button>
      </aside>

      <section className="stage">
        {filteredGraph.nodes.length > 0 ? (
          <KnowledgeGraphView
            data={filteredGraph}
            selectedNodeId={selectedNode.id}
            onSelectNode={selectNode}
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
                setDepth(3);
              }}
            >
              Сбросить фильтры
            </button>
          </div>
        )}

        <div className="stage-badge">
          <span className="pulse" />
          {filteredGraph.nodes.length} узлов · {filteredGraph.links.length} связей · глубина {depth}
        </div>

        {cardOpen && (
          <aside className="node-card" aria-live="polite">
            <button className="node-card-close" type="button" onClick={() => setCardOpen(false)} aria-label="Закрыть карточку">×</button>
            <div className="node-card-kicker">
              <span style={{ backgroundColor: selectedNode.color }} />
              {kindLabels[selectedNode.kind]}
            </div>
            <h2>{selectedNode.name}</h2>
            <p>{selectedNode.description}</p>
            <dl>
              <div><dt>Пространство</dt><dd>{selectedNode.group}</dd></div>
              <div><dt>Связей</dt><dd>{relatedNodes.length}</dd></div>
              <div><dt>Глубина</dt><dd>{depth}</dd></div>
            </dl>
            <div className="node-card-section">Связанные узлы</div>
            <div className="related-list">
              {relatedNodes.map((node) => (
                <button key={node.id} type="button" onClick={() => selectNode(node)}>
                  <span style={{ backgroundColor: node.color }} />
                  {node.name}
                </button>
              ))}
            </div>
            <div className="node-card-actions">
              <button type="button">Открыть</button>
              <button type="button">Редактировать</button>
              <button type="button">Добавить связь</button>
            </div>
          </aside>
        )}

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
              <input type="checkbox" checked={enabledKinds.has(kind)} onChange={() => toggleKind(kind)} />
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
        <p className="right-note">Нажми на узел, чтобы приблизить камеру и открыть карточку.</p>
      </aside>
    </main>
  );
}
