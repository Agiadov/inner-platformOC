export type NodeKind = "project" | "note" | "skill" | "tool" | "file";

export type KnowledgeNode = {
  id: string;
  name: string;
  kind: NodeKind;
  description: string;
  group: string;
  val: number;
  color: string;
};

export type KnowledgeLink = {
  source: string;
  target: string;
  relation: string;
};

export type KnowledgeGraph = {
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
};

export const kindLabels: Record<NodeKind, string> = {
  project: "Projects",
  note: "Notes",
  skill: "Skills",
  tool: "Tools",
  file: "Files",
};

export const graphData: KnowledgeGraph = {
  nodes: [
    { id: "lutoway-os", name: "LUTOWAY OS", kind: "project", description: "AI second brain для проектов, решений и знаний.", group: "Система", val: 18, color: "#55f2c0" },
    { id: "inner", name: "INNER", kind: "project", description: "Бренд оригинальных товаров и основной продуктовый кейс.", group: "INNER", val: 17, color: "#f0b325" },
    { id: "content", name: "Контент", kind: "project", description: "Reels, Shorts, сценарии и развитие личного бренда.", group: "Контент", val: 12, color: "#d55aa9" },
    { id: "sites", name: "Сайты", kind: "project", description: "Лендинги, магазины и цифровые продукты.", group: "Сайты", val: 12, color: "#6da8ff" },
    { id: "mini-app", name: "Telegram Mini App", kind: "project", description: "Каталог, заявки и коммуникация внутри Telegram.", group: "INNER", val: 11, color: "#55f2c0" },
    { id: "suppliers", name: "Поставщики", kind: "note", description: "Poizon, Taobao, зарубежные магазины и логистика.", group: "INNER", val: 8, color: "#f0b325" },
    { id: "catalog", name: "Каталог", kind: "note", description: "Товары, категории, варианты цвета и карточки продукта.", group: "INNER", val: 9, color: "#f0b325" },
    { id: "brand-system", name: "Дизайн-система INNER", kind: "skill", description: "Лёд, графит, серебро и акцентный голубой свет.", group: "INNER", val: 10, color: "#9a7dff" },
    { id: "motion", name: "Motion Design", kind: "skill", description: "Shared-element transitions, FLIP, GSAP и Framer Motion.", group: "Сайты", val: 9, color: "#9a7dff" },
    { id: "threejs", name: "Three.js", kind: "tool", description: "3D-сцены, материалы, камера и интерактивные объекты.", group: "AI-инструменты", val: 7, color: "#ff8d3b" },
    { id: "nextjs", name: "Next.js", kind: "tool", description: "Основной frontend-фреймворк LUTOWAY OS.", group: "AI-инструменты", val: 7, color: "#ff8d3b" },
    { id: "openai", name: "OpenAI", kind: "tool", description: "AI-поиск, суммаризация и голосовой ассистент.", group: "AI-инструменты", val: 8, color: "#ff8d3b" },
    { id: "supabase", name: "Supabase", kind: "tool", description: "Хранилище заметок, связей и векторного поиска.", group: "AI-инструменты", val: 7, color: "#ff8d3b" },
    { id: "hero", name: "Hero INNER", kind: "file", description: "Главная композиция с кремовой курткой внутри льда.", group: "INNER", val: 6, color: "#7f9290" },
    { id: "reels", name: "Сценарии Reels", kind: "file", description: "Хуки, сюжеты и CTA для коротких видео.", group: "Контент", val: 6, color: "#7f9290" },
  ],
  links: [
    { source: "lutoway-os", target: "inner", relation: "управляет" },
    { source: "lutoway-os", target: "content", relation: "связывает" },
    { source: "lutoway-os", target: "sites", relation: "связывает" },
    { source: "lutoway-os", target: "openai", relation: "использует" },
    { source: "lutoway-os", target: "supabase", relation: "хранит данные" },
    { source: "inner", target: "mini-app", relation: "включает" },
    { source: "inner", target: "suppliers", relation: "зависит от" },
    { source: "inner", target: "catalog", relation: "содержит" },
    { source: "inner", target: "brand-system", relation: "оформлен через" },
    { source: "inner", target: "hero", relation: "использует" },
    { source: "sites", target: "motion", relation: "усиливаются" },
    { source: "sites", target: "nextjs", relation: "собраны на" },
    { source: "sites", target: "threejs", relation: "визуализируются" },
    { source: "motion", target: "hero", relation: "анимирует" },
    { source: "content", target: "reels", relation: "содержит" },
    { source: "mini-app", target: "catalog", relation: "показывает" },
  ],
};
