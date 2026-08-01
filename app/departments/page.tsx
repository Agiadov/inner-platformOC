"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import "./departments.css";

type Agent = {
  id: string;
  name: string;
  description: string;
  capability: string;
  output: string;
  status: "ready" | "beta";
};

type Department = {
  id: string;
  name: string;
  tagline: string;
  color: string;
  footer: string;
  agents: Agent[];
};

const departments: Department[] = [
  {
    id: "developers",
    name: "DEVELOPERS",
    tagline: "От идеи до стабильного релиза.",
    color: "#ff8a5b",
    footer: "YOUR BUILD TEAM",
    agents: [
      { id: "frontend", name: "Frontend Agent", description: "Собирает Next.js-интерфейсы и компоненты.", capability: "React, Next.js, Tailwind, адаптивность", output: "Рабочий интерфейс и список изменённых файлов", status: "ready" },
      { id: "backend", name: "Backend Agent", description: "Проектирует API, данные и серверную логику.", capability: "Supabase, PostgreSQL, API routes", output: "Схема данных, API и правила доступа", status: "beta" },
      { id: "supabase", name: "Supabase Agent", description: "Подключает базу, RLS, Realtime и авторизацию.", capability: "Database, Auth, RLS, Realtime", output: "Миграции и безопасная конфигурация", status: "ready" },
      { id: "testing", name: "QA Agent", description: "Проверяет сценарии, мобильную версию и ошибки.", capability: "Regression, UX checks, browser QA", output: "Отчёт с приоритетами и шагами исправления", status: "ready" },
      { id: "github", name: "GitHub Agent", description: "Ведёт ветки, коммиты и ревью изменений.", capability: "Git, commits, PR review", output: "Чистая история изменений", status: "beta" },
      { id: "deploy", name: "Deploy Agent", description: "Готовит приложение к публикации.", capability: "Vercel, env, build checks", output: "Готовый production deployment", status: "beta" },
    ],
  },
  {
    id: "design",
    name: "DESIGN",
    tagline: "Интерфейс без шаблонного AI-вида.",
    color: "#e56ca8",
    footer: "YOUR DESIGN STUDIO",
    agents: [
      { id: "uiux", name: "UI/UX Agent", description: "Проектирует структуру, состояния и пользовательские пути.", capability: "UX audit, flows, accessibility", output: "UX-концепция и карта экранов", status: "ready" },
      { id: "hero", name: "Hero Builder", description: "Создаёт сильный первый экран под бренд.", capability: "Composition, hierarchy, conversion", output: "Hero-концепция с текстом и поведением", status: "ready" },
      { id: "motion", name: "Motion Agent", description: "Добавляет осмысленные переходы и микроанимации.", capability: "Framer Motion, GSAP, Three.js", output: "Motion-spec и готовые анимации", status: "ready" },
      { id: "brand", name: "Brand Agent", description: "Собирает визуальный язык и дизайн-систему.", capability: "Tokens, typography, art direction", output: "Система цветов, шрифтов и компонентов", status: "beta" },
      { id: "image", name: "Image Director", description: "Формирует визуальные сцены и промпты.", capability: "Art direction, image prompts", output: "Набор согласованных визуалов", status: "ready" },
      { id: "review", name: "Design Reviewer", description: "Находит типичные ошибки вкуса и консистентности.", capability: "Spacing, contrast, hierarchy", output: "Приоритизированный дизайн-аудит", status: "ready" },
    ],
  },
  {
    id: "marketing",
    name: "MARKETING",
    tagline: "Позиционирование, трафик и конверсия.",
    color: "#ff6666",
    footer: "YOUR GROWTH ENGINE",
    agents: [
      { id: "seo", name: "SEO Audit", description: "Проверяет структуру, метаданные и поисковый потенциал.", capability: "Technical SEO, content gaps", output: "SEO-аудит и план исправлений", status: "ready" },
      { id: "offer", name: "Offer Builder", description: "Упаковывает продукт в понятное предложение.", capability: "Positioning, value proposition", output: "Оффер, сегменты и аргументы", status: "ready" },
      { id: "copy", name: "Landing Copy", description: "Пишет текст страницы под реальную аудиторию.", capability: "Headlines, objections, CTA", output: "Готовый текст лендинга", status: "ready" },
      { id: "ads", name: "Ad Creative", description: "Создаёт идеи и варианты рекламных креативов.", capability: "Hooks, angles, variations", output: "Пакет рекламных концепций", status: "ready" },
      { id: "competitors", name: "Competitor Agent", description: "Сравнивает рынок и находит свободные позиции.", capability: "Research, differentiation", output: "Карта конкурентов и возможности", status: "beta" },
      { id: "cro", name: "CRO Agent", description: "Улучшает путь пользователя до заявки или покупки.", capability: "Funnels, friction, experiments", output: "Гипотезы роста конверсии", status: "ready" },
    ],
  },
  {
    id: "social",
    name: "SOCIAL",
    tagline: "Контент-система вместо случайных публикаций.",
    color: "#5f7cff",
    footer: "YOUR CONTENT MACHINE",
    agents: [
      { id: "reels", name: "Reels Scripts", description: "Пишет живые сценарии коротких видео.", capability: "Hooks, retention, CTA", output: "Сценарий с покадровой структурой", status: "ready" },
      { id: "strategy", name: "Content Strategy", description: "Строит рубрики и контент-план под цель.", capability: "Pillars, audience, cadence", output: "Контент-система на месяц", status: "ready" },
      { id: "hooks", name: "Hook Lab", description: "Создаёт и оценивает первые 1–3 секунды.", capability: "Curiosity, conflict, specificity", output: "Набор сильных хуков", status: "ready" },
      { id: "carousel", name: "Carousel Agent", description: "Превращает идею в структуру карусели.", capability: "Story flow, slide copy", output: "Текст и структура всех слайдов", status: "ready" },
      { id: "youtube", name: "Shorts Agent", description: "Адаптирует материал под YouTube Shorts.", capability: "Titles, pacing, packaging", output: "Версия ролика для Shorts", status: "beta" },
      { id: "repurpose", name: "Repurpose Agent", description: "Делает из одного материала несколько форматов.", capability: "Reels, Telegram, posts", output: "Пакет производного контента", status: "ready" },
    ],
  },
  {
    id: "finance",
    name: "FINANCE",
    tagline: "Сначала модель — потом расходы.",
    color: "#45c7a0",
    footer: "YOUR CFO ON CALL",
    agents: [
      { id: "unit", name: "Unit Economics", description: "Считает прибыльность одной продажи.", capability: "CAC, margin, contribution", output: "Юнит-экономика и точки риска", status: "ready" },
      { id: "pricing", name: "Pricing Agent", description: "Помогает выбрать цену и модель монетизации.", capability: "Tiers, value metric, margin", output: "Ценовая архитектура", status: "ready" },
      { id: "profit", name: "Profit Calculator", description: "Моделирует выручку, расходы и прибыль.", capability: "Scenarios, break-even", output: "Три финансовых сценария", status: "ready" },
      { id: "forecast", name: "Sales Forecast", description: "Строит прогноз продаж по вводным.", capability: "Pipeline, conversion, seasonality", output: "Помесячный прогноз", status: "beta" },
      { id: "expenses", name: "Expense Review", description: "Находит лишние и растущие расходы.", capability: "Cost audit, optimization", output: "План сокращения затрат", status: "ready" },
      { id: "margin", name: "Margin Agent", description: "Сравнивает маржу товаров и услуг.", capability: "COGS, logistics, fees", output: "Рейтинг прибыльности", status: "ready" },
    ],
  },
  {
    id: "legal",
    name: "LEGAL",
    tagline: "Читает мелкий шрифт до тебя.",
    color: "#c8c8c8",
    footer: "YOUR LEGAL DESK",
    agents: [
      { id: "contract", name: "Contract Review", description: "Выделяет обязательства, риски и спорные условия.", capability: "Clause review, obligations", output: "Понятное резюме договора", status: "beta" },
      { id: "privacy", name: "Privacy Policy", description: "Готовит структуру политики конфиденциальности.", capability: "Data inventory, disclosures", output: "Черновик политики для проверки юристом", status: "beta" },
      { id: "terms", name: "Terms Agent", description: "Формирует условия использования продукта.", capability: "Terms, limitations, billing", output: "Черновик пользовательских условий", status: "beta" },
      { id: "risk", name: "Risk Check", description: "Показывает юридические зоны риска.", capability: "Risk classification, checklist", output: "Карта рисков и вопросы юристу", status: "beta" },
      { id: "nda", name: "NDA Assistant", description: "Разбирает NDA и взаимные обязательства.", capability: "Confidentiality, exclusions", output: "Резюме и спорные пункты", status: "beta" },
      { id: "compliance", name: "Compliance Check", description: "Создаёт проверочный список требований.", capability: "Policies, records, controls", output: "Чек-лист соответствия", status: "beta" },
    ],
  },
];

const coreTeam = ["frontend", "uiux", "strategy", "offer"];

export default function DepartmentsPage() {
  const [departmentId, setDepartmentId] = useState(departments[0].id);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [team, setTeam] = useState<string[]>(coreTeam);
  const [brief, setBrief] = useState("Сделать сильный лендинг для INNER с премиальным hero и мобильной версией");
  const [runLog, setRunLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const department = departments.find((item) => item.id === departmentId) ?? departments[0];
  const allAgents = useMemo(() => departments.flatMap((item) => item.agents.map((agent) => ({ ...agent, department: item.name, color: item.color }))), []);
  const teamAgents = allAgents.filter((agent) => team.includes(agent.id));

  const toggleTeam = (agentId: string) => {
    setTeam((current) => current.includes(agentId) ? current.filter((id) => id !== agentId) : [...current, agentId]);
  };

  const runTeam = async () => {
    if (!brief.trim() || !teamAgents.length || running) return;
    setRunning(true);
    setRunLog([`Задача принята: ${brief.trim()}`]);
    for (const agent of teamAgents) {
      await new Promise((resolve) => window.setTimeout(resolve, 420));
      setRunLog((current) => [...current, `${agent.name}: подготовил ${agent.output.toLowerCase()}.`]);
    }
    setRunLog((current) => [...current, "Project Manager: собрал результаты в единый план выполнения."]);
    setRunning(false);
    window.localStorage.setItem("lutoway-last-agent-run", JSON.stringify({ brief, team, createdAt: new Date().toISOString() }));
  };

  return (
    <main className="departments-shell" style={{ "--department-color": department.color } as React.CSSProperties}>
      <aside className="departments-sidebar">
        <div className="departments-brand">LUTOWAY OS <span>/ crew</span></div>
        <nav className="departments-main-nav" aria-label="Главная навигация">
          <Link href="/">Brain</Link>
          <Link className="active" href="/departments">Departments</Link>
          <a href="#team">Project team</a>
          <a href="#run">Agent runs</a>
        </nav>
        <div className="departments-label">Отделы</div>
        <div className="department-tabs">
          {departments.map((item, index) => (
            <button key={item.id} type="button" className={item.id === department.id ? "active" : ""} onClick={() => setDepartmentId(item.id)}>
              <span style={{ background: item.color }} />
              <b>{String(index + 1).padStart(2, "0")}</b>
              {item.name}
            </button>
          ))}
        </div>
        <div className="sidebar-foot">{allAgents.length} агентов · {departments.length} отделов</div>
      </aside>

      <section className="department-workspace">
        <header className="department-header">
          <div>
            <div className="department-index">DEPARTMENT {String(departments.indexOf(department) + 1).padStart(2, "0")} / {String(departments.length).padStart(2, "0")}</div>
            <h1>{department.name}</h1>
            <p>{department.tagline}</p>
          </div>
          <div className="online-pill"><span /> CREW ONLINE</div>
        </header>

        <div className="agent-grid">
          {department.agents.map((agent) => {
            const inTeam = team.includes(agent.id);
            return (
              <article key={agent.id} className="agent-card">
                <button className="agent-card-open" type="button" onClick={() => setSelectedAgent(agent)} aria-label={`Открыть ${agent.name}`}>
                  <span className="agent-pixel" aria-hidden="true">▦</span>
                  <h2>{agent.name}</h2>
                  <p>{agent.description}</p>
                  <small>{agent.status === "ready" ? "READY" : "BETA"}</small>
                </button>
                <button className={inTeam ? "team-toggle active" : "team-toggle"} type="button" onClick={() => toggleTeam(agent.id)}>
                  {inTeam ? "В команде" : "+ В команду"}
                </button>
              </article>
            );
          })}
        </div>

        <div className="department-footer-label">{department.footer}</div>

        <section id="team" className="team-builder">
          <div className="team-builder-copy">
            <div className="department-index">PROJECT CREW</div>
            <h2>Собери AI-команду под задачу</h2>
            <p>Пользователь формулирует цель, а система запускает выбранных специалистов по очереди и собирает их результаты.</p>
          </div>
          <div className="team-members">
            {teamAgents.length ? teamAgents.map((agent) => (
              <button key={agent.id} type="button" onClick={() => toggleTeam(agent.id)} style={{ borderColor: agent.color }}>
                <span style={{ background: agent.color }} />{agent.name}<b>×</b>
              </button>
            )) : <p>Добавь хотя бы одного агента из карточек выше.</p>}
          </div>
          <div id="run" className="run-panel">
            <label htmlFor="crew-brief">Задача</label>
            <textarea id="crew-brief" value={brief} onChange={(event) => setBrief(event.target.value)} rows={3} />
            <button type="button" onClick={runTeam} disabled={running || !teamAgents.length || !brief.trim()}>{running ? "Команда работает..." : "Запустить команду"}</button>
          </div>
          {runLog.length > 0 && (
            <div className="run-log" aria-live="polite">
              <div className="run-log-title">LIVE RUN</div>
              {runLog.map((line, index) => <p key={`${line}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span>{line}</p>)}
            </div>
          )}
        </section>
      </section>

      {selectedAgent && (
        <div className="agent-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedAgent(null); }}>
          <section className="agent-modal" role="dialog" aria-modal="true" aria-label={selectedAgent.name}>
            <button className="agent-modal-close" type="button" onClick={() => setSelectedAgent(null)}>×</button>
            <div className="department-index">SPECIALIST PROFILE</div>
            <span className="agent-pixel modal-pixel">▦</span>
            <h2>{selectedAgent.name}</h2>
            <p>{selectedAgent.description}</p>
            <dl>
              <div><dt>Возможности</dt><dd>{selectedAgent.capability}</dd></div>
              <div><dt>Результат</dt><dd>{selectedAgent.output}</dd></div>
              <div><dt>Статус</dt><dd>{selectedAgent.status === "ready" ? "Готов к работе" : "Бета-режим"}</dd></div>
            </dl>
            <button className="modal-team-button" type="button" onClick={() => toggleTeam(selectedAgent.id)}>{team.includes(selectedAgent.id) ? "Убрать из команды" : "Добавить в команду проекта"}</button>
          </section>
        </div>
      )}
    </main>
  );
}
