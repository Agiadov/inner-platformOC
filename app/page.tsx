"use client";

import { useMemo, useState } from "react";

const categories = [
  "INNER",
  "Контент",
  "Сайты",
  "Telegram Mini App",
  "Поставщики",
  "AI-инструменты",
];

const filters = [
  ["Projects", 8],
  ["Notes", 24],
  ["Skills", 16],
  ["Tools", 12],
  ["Files", 31],
];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [command, setCommand] = useState("");

  const visibleCategories = useMemo(
    () => categories.filter((item) => item.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

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
          {visibleCategories.map((item) => (
            <button key={item} type="button"><span className="dot" />{item}</button>
          ))}
        </div>

        <div className="section-title">Выбранный узел</div>
        <div style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 14 }}>
          <strong>INNER</strong>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
            Бренд, магазин, контент, поставщики и продуктовая система.
          </p>
        </div>
      </aside>

      <section className="stage">
        <div className="orbit one" />
        <div className="orbit two" />
        <div className="node a" />
        <div className="node b" />
        <div className="node c" />
        <div className="node d" />

        <div className="center-copy">
          <div className="hero">
            <div className="hero-kicker">AI second brain</div>
            <h1>LUTOWAY<br />OS</h1>
            <p>
              Единая карта проектов, решений, идей и знаний. На следующем этапе здесь появится живой 3D-граф и AI-поиск по всей базе.
            </p>
          </div>
        </div>

        <form
          className="command"
          onSubmit={(event) => {
            event.preventDefault();
            setCommand("");
          }}
        >
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="Спроси: что сейчас важно для запуска INNER?"
            aria-label="Команда для LUTOWAY OS"
          />
          <button type="submit">Запустить</button>
        </form>
      </section>

      <aside className="rightbar panel">
        <div className="section-title" style={{ marginTop: 0 }}>Фильтр</div>
        <div className="list">
          {filters.map(([label, count]) => (
            <button key={label} type="button">
              <span className="dot" />{label}
              <span style={{ float: "right", color: "var(--muted)" }}>{count}</span>
            </button>
          ))}
        </div>

        <div className="jarvis">
          <div className="jarvis-core">L·U·T·O</div>
        </div>
        <div className="status">READY</div>
      </aside>
    </main>
  );
}
