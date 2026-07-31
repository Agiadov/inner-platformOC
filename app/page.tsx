"use client";

import { useEffect, useMemo, useState } from "react";
import { KnowledgeGraphView } from "@/components/knowledge-graph";
import {
  graphData,
  kindLabels,
  type KnowledgeLink,
  type KnowledgeNode,
  type NodeKind,
} from "@/lib/graph-data";

const spaces = ["Все", "INNER", "Контент", "Сайты", "AI-инструменты"];
const editableSpaces = spaces.filter((space) => space !== "Все");
const kinds = Object.keys(kindLabels) as NodeKind[];
const storageKey = "lutoway-os-graph-v1";

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

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "note"}-${Date.now().toString(36)}`;
}

type EditorMode = "create" | "edit" | null;

type NodeDraft = {
  name: string;
  description: string;
  kind: NodeKind;
  group: string;
  color: string;
};

const emptyDraft: NodeDraft = {
  name: "",
  description: "",
  kind: "note",
  group: "INNER",
  color: "#f0b325",
};

export default function HomePage() {
  const [nodes, setNodes] = useState<KnowledgeNode[]>(graphData.nodes);
  const [links, setLinks] = useState<KnowledgeLink[]>(graphData.links);
  const [query, setQuery] = useState("");
  const [command, setCommand] = useState("");
  const [activeSpace, setActiveSpace] = useState("Все");
  const [depth, setDepth] = useState(3);
  const [cardOpen, setCardOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkRelation, setLinkRelation] = useState("связано с");
  const [draft, setDraft] = useState<NodeDraft>(emptyDraft);
  const [enabledKinds, setEnabledKinds] = useState<Set<NodeKind>>(() => new Set(kinds));
  const [selectedNodeId, setSelectedNodeId] = useState(graphData.nodes[0].id);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { nodes?: KnowledgeNode[]; links?: KnowledgeLink[] };
      if (saved.nodes?.length) {
        setNodes(saved.nodes);
        setLinks(saved.links ?? []);
        setSelectedNodeId(saved.nodes[0].id);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ nodes, links }));
  }, [nodes, links]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes[0];

  const depthIds = useMemo(
    () => getDepthIds(selectedNode?.id ?? "", depth, links),
    [depth, links, selectedNode?.id],
  );

  const filteredGraph = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visibleNodes = nodes.filter((node) => {
      const matchesSpace = activeSpace === "Все" || node.group === activeSpace;
      const matchesKind = enabledKinds.has(node.kind);
      const matchesQuery =
        !normalizedQuery ||
        node.name.toLowerCase().includes(normalizedQuery) ||
        node.description.toLowerCase().includes(normalizedQuery);
      const matchesDepth = !selectedNode || depthIds.has(node.id);

      return matchesSpace && matchesKind && matchesQuery && matchesDepth;
    });

    const visibleIds = new Set(visibleNodes.map((node) => node.id));
    const visibleLinks = links.filter((link) => {
      const source = endpointId(link.source as string | { id?: string });
      const target = endpointId(link.target as string | { id?: string });
      return visibleIds.has(source) && visibleIds.has(target);
    });

    return { nodes: visibleNodes, links: visibleLinks };
  }, [activeSpace, depthIds, enabledKinds, links, nodes, query, selectedNode]);

  const relatedNodes = useMemo(() => {
    if (!selectedNode) return [];
    const ids = new Set<string>();
    links.forEach((link) => {
      const source = endpointId(link.source as string | { id?: string });
      const target = endpointId(link.target as string | { id?: string });
      if (source === selectedNode.id) ids.add(target);
      if (target === selectedNode.id) ids.add(source);
    });
    return nodes.filter((node) => ids.has(node.id));
  }, [links, nodes, selectedNode]);

  const counts = useMemo(
    () => kinds.map((kind) => [kind, nodes.filter((node) => node.kind === kind).length] as const),
    [nodes],
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
    setSelectedNodeId(node.id);
    setCardOpen(true);
  };

  const openCreate = () => {
    setDraft({ ...emptyDraft, group: activeSpace === "Все" ? "INNER" : activeSpace });
    setEditorMode("create");
  };

  const openEdit = () => {
    if (!selectedNode) return;
    setDraft({
      name: selectedNode.name,
      description: selectedNode.description,
      kind: selectedNode.kind,
      group: selectedNode.group,
      color: selectedNode.color,
    });
    setEditorMode("edit");
  };

  const saveNode = () => {
    const name = draft.name.trim();
    const description = draft.description.trim();
    if (!name || !description) return;

    if (editorMode === "edit" && selectedNode) {
      setNodes((current) =>
        current.map((node) =>
          node.id === selectedNode.id ? { ...node, ...draft, name, description } : node,
        ),
      );
    } else {
      const node: KnowledgeNode = {
        id: slugify(name),
        name,
        description,
        kind: draft.kind,
        group: draft.group,
        color: draft.color,
        val: draft.kind === "project" ? 13 : 8,
      };
      setNodes((current) => [...current, node]);
      if (selectedNode) {
        setLinks((current) => [
          ...current,
          { source: selectedNode.id, target: node.id, relation: "создано из" },
        ]);
      }
      setSelectedNodeId(node.id);
      setCardOpen(true);
    }

    setEditorMode(null);
  };

  const addLink = () => {
    if (!selectedNode || !linkTargetId || linkTargetId === selectedNode.id) return;
    const exists = links.some((link) => {
      const source = endpointId(link.source as string | { id?: string });
      const target = endpointId(link.target as string | { id?: string });
      return (
        (source === selectedNode.id && target === linkTargetId) ||
        (source === linkTargetId && target === selectedNode.id)
      );
    });
    if (!exists) {
      setLinks((current) => [
        ...current,
        { source: selectedNode.id, target: linkTargetId, relation: linkRelation.trim() || "связано с" },
      ]);
    }
    setLinkModalOpen(false);
    setLinkTargetId("");
    setLinkRelation("связано с");
  };

  const resetData = () => {
    setNodes(graphData.nodes);
    setLinks(graphData.links);
    setSelectedNodeId(graphData.nodes[0].id);
    setCardOpen(false);
    window.localStorage.removeItem(storageKey);
  };

  if (!selectedNode) return null;

  return (
    <main className="os-shell">
      <aside className="sidebar panel">
        <div className="brand">LUTOWAY OS <span>/ alpha</span></div>
        <button type="button" className="create-node-button" onClick={openCreate}>+ Новая заметка</button>
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
            <button key={space} type="button" className={activeSpace === space ? "active" : undefined} onClick={() => setActiveSpace(space)}>
              <span className="dot" />{space}
            </button>
          ))}
        </div>

        <div className="section-title">Глубина связей</div>
        <div className="depth-switcher">
          {[1, 2, 3].map((value) => (
            <button key={value} type="button" className={depth === value ? "active" : undefined} onClick={() => setDepth(value)}>{value}</button>
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
          <KnowledgeGraphView data={filteredGraph} selectedNodeId={selectedNode.id} onSelectNode={selectNode} />
        ) : (
          <div className="empty-state">
            <span>Нет подходящих узлов</span>
            <button type="button" onClick={() => { setQuery(""); setActiveSpace("Все"); setEnabledKinds(new Set(kinds)); setDepth(3); }}>Сбросить фильтры</button>
          </div>
        )}

        <div className="stage-badge">
          <span className="pulse" />
          {filteredGraph.nodes.length} узлов · {filteredGraph.links.length} связей · глубина {depth}
        </div>

        {cardOpen && (
          <aside className="node-card" aria-live="polite">
            <button className="node-card-close" type="button" onClick={() => setCardOpen(false)} aria-label="Закрыть карточку">×</button>
            <div className="node-card-kicker"><span style={{ backgroundColor: selectedNode.color }} />{kindLabels[selectedNode.kind]}</div>
            <h2>{selectedNode.name}</h2>
            <p>{selectedNode.description}</p>
            <dl>
              <div><dt>Пространство</dt><dd>{selectedNode.group}</dd></div>
              <div><dt>Связей</dt><dd>{relatedNodes.length}</dd></div>
              <div><dt>Глубина</dt><dd>{depth}</dd></div>
            </dl>
            <div className="node-card-section">Связанные узлы</div>
            <div className="related-list">
              {relatedNodes.length ? relatedNodes.map((node) => (
                <button key={node.id} type="button" onClick={() => selectNode(node)}><span style={{ backgroundColor: node.color }} />{node.name}</button>
              )) : <span className="muted-copy">Связей пока нет</span>}
            </div>
            <div className="node-card-actions">
              <button type="button" onClick={() => setCardOpen(true)}>Открыть</button>
              <button type="button" onClick={openEdit}>Редактировать</button>
              <button type="button" onClick={() => setLinkModalOpen(true)}>Добавить связь</button>
            </div>
          </aside>
        )}

        <form className="command" onSubmit={(event) => { event.preventDefault(); if (!command.trim()) return; setQuery(command.trim()); setCommand(""); }}>
          <input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Найди всё, что связано с INNER..." aria-label="Команда для LUTOWAY OS" />
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

        <div className="jarvis"><div className="jarvis-ring ring-one" /><div className="jarvis-ring ring-two" /><div className="jarvis-core">L·U·T·O</div></div>
        <div className="status">GRAPH ONLINE</div>
        <p className="right-note">Все созданные заметки и связи сохраняются в этом браузере.</p>
        <button type="button" className="reset-data" onClick={resetData}>Сбросить тестовые данные</button>
      </aside>

      {editorMode && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditorMode(null); }}>
          <section className="editor-modal" role="dialog" aria-modal="true" aria-label={editorMode === "create" ? "Новая заметка" : "Редактирование узла"}>
            <div className="modal-heading">
              <div><span>{editorMode === "create" ? "Новый узел" : "Редактирование"}</span><h2>{editorMode === "create" ? "Добавить в память" : selectedNode.name}</h2></div>
              <button type="button" onClick={() => setEditorMode(null)}>×</button>
            </div>
            <label>Название<input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Например: План запуска INNER" autoFocus /></label>
            <label>Описание<textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Что нужно сохранить в памяти?" rows={5} /></label>
            <div className="form-grid">
              <label>Тип<select value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as NodeKind }))}>{kinds.map((kind) => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}</select></label>
              <label>Пространство<select value={draft.group} onChange={(event) => setDraft((current) => ({ ...current, group: event.target.value }))}>{editableSpaces.map((space) => <option key={space}>{space}</option>)}</select></label>
            </div>
            <label>Цвет<input type="color" value={draft.color} onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))} /></label>
            <div className="modal-actions"><button type="button" onClick={() => setEditorMode(null)}>Отмена</button><button type="button" className="primary" onClick={saveNode} disabled={!draft.name.trim() || !draft.description.trim()}>Сохранить</button></div>
          </section>
        </div>
      )}

      {linkModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLinkModalOpen(false); }}>
          <section className="editor-modal compact-modal" role="dialog" aria-modal="true" aria-label="Добавить связь">
            <div className="modal-heading"><div><span>Связь</span><h2>{selectedNode.name}</h2></div><button type="button" onClick={() => setLinkModalOpen(false)}>×</button></div>
            <label>Связать с<select value={linkTargetId} onChange={(event) => setLinkTargetId(event.target.value)}><option value="">Выбери узел</option>{nodes.filter((node) => node.id !== selectedNode.id).map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label>
            <label>Тип связи<input value={linkRelation} onChange={(event) => setLinkRelation(event.target.value)} placeholder="Например: зависит от" /></label>
            <div className="modal-actions"><button type="button" onClick={() => setLinkModalOpen(false)}>Отмена</button><button type="button" className="primary" onClick={addLink} disabled={!linkTargetId}>Добавить связь</button></div>
          </section>
        </div>
      )}
    </main>
  );
}
