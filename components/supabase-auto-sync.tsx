"use client";

import { useEffect } from "react";
import { graphData, type KnowledgeGraph } from "@/lib/graph-data";
import { loadGraphFromSupabase, seedGraph } from "@/lib/graph-storage";
import { isSupabaseConfigured } from "@/lib/supabase";

const storageKey = "lutoway-os-graph-v1";
const hydrationKey = "lutoway-os-supabase-hydrated";

export function SupabaseAutoSync() {
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;
    let lastSnapshot = "";
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    async function hydrate() {
      try {
        const remote = await loadGraphFromSupabase();
        if (!active) return;

        if (remote?.nodes.length) {
          const snapshot = JSON.stringify(remote);
          const localSnapshot = window.localStorage.getItem(storageKey);
          const alreadyHydrated = window.sessionStorage.getItem(hydrationKey) === "1";

          if (snapshot !== localSnapshot && !alreadyHydrated) {
            window.localStorage.setItem(storageKey, snapshot);
            window.sessionStorage.setItem(hydrationKey, "1");
            window.location.reload();
            return;
          }
          lastSnapshot = localSnapshot ?? snapshot;
        } else {
          const localRaw = window.localStorage.getItem(storageKey);
          const local = localRaw ? (JSON.parse(localRaw) as KnowledgeGraph) : graphData;
          await seedGraph(local.nodes, local.links);
          lastSnapshot = JSON.stringify(local);
        }
      } catch (error) {
        console.error("Supabase hydration failed", error);
      }
    }

    hydrate();

    const interval = window.setInterval(() => {
      const snapshot = window.localStorage.getItem(storageKey);
      if (!snapshot || snapshot === lastSnapshot) return;
      lastSnapshot = snapshot;

      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try {
          const graph = JSON.parse(snapshot) as KnowledgeGraph;
          await seedGraph(graph.nodes, graph.links);
          window.dispatchEvent(new CustomEvent("lutoway:supabase-synced"));
        } catch (error) {
          console.error("Supabase save failed", error);
          window.dispatchEvent(new CustomEvent("lutoway:supabase-error"));
        }
      }, 500);
    }, 900);

    return () => {
      active = false;
      window.clearInterval(interval);
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, []);

  return null;
}
