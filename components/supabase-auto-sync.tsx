"use client";

import { useEffect } from "react";
import { graphData, type KnowledgeGraph } from "@/lib/graph-data";
import { loadGraphFromSupabase, seedGraph } from "@/lib/graph-storage";
import { isSupabaseConfigured } from "@/lib/supabase";

const storageKey = "lutoway-os-graph-v1";
const hydrationKey = "lutoway-os-supabase-hydrated";
const errorKey = "lutoway-os-supabase-error";

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function describeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const candidate = error as SupabaseLikeError;
    return [candidate.code, candidate.message, candidate.details, candidate.hint]
      .filter((part): part is string => Boolean(part))
      .join(" · ");
  }
  return String(error);
}

function publishStatus(status: "connected" | "synced" | "error", message?: string) {
  window.dispatchEvent(
    new CustomEvent("lutoway:supabase-status", {
      detail: { status, message },
    }),
  );
}

export function SupabaseAutoSync() {
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;
    let syncReady = false;
    let lastSnapshot = "";
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    async function hydrate() {
      try {
        const remote = await loadGraphFromSupabase();
        if (!active) return false;

        if (remote?.nodes.length) {
          const snapshot = JSON.stringify(remote);
          const localSnapshot = window.localStorage.getItem(storageKey);
          const alreadyHydrated = window.sessionStorage.getItem(hydrationKey) === "1";

          if (snapshot !== localSnapshot && !alreadyHydrated) {
            window.localStorage.setItem(storageKey, snapshot);
            window.sessionStorage.setItem(hydrationKey, "1");
            window.sessionStorage.removeItem(errorKey);
            publishStatus("connected");
            window.location.reload();
            return true;
          }
          lastSnapshot = localSnapshot ?? snapshot;
        } else {
          const localRaw = window.localStorage.getItem(storageKey);
          const local = localRaw ? (JSON.parse(localRaw) as KnowledgeGraph) : graphData;
          await seedGraph(local.nodes, local.links);
          lastSnapshot = JSON.stringify(local);
        }

        window.sessionStorage.removeItem(errorKey);
        publishStatus("connected");
        return true;
      } catch (error) {
        const message = describeError(error) || "Unknown Supabase error";
        window.sessionStorage.setItem(errorKey, message);
        publishStatus("error", message);
        console.warn(`[LUTOWAY OS] Supabase sync unavailable. Local mode is active. ${message}`);
        return false;
      }
    }

    void hydrate().then((ready) => {
      syncReady = ready;
    });

    const interval = window.setInterval(() => {
      if (!syncReady) return;

      const snapshot = window.localStorage.getItem(storageKey);
      if (!snapshot || snapshot === lastSnapshot) return;
      lastSnapshot = snapshot;

      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try {
          const graph = JSON.parse(snapshot) as KnowledgeGraph;
          await seedGraph(graph.nodes, graph.links);
          publishStatus("synced");
          window.dispatchEvent(new CustomEvent("lutoway:supabase-synced"));
        } catch (error) {
          syncReady = false;
          const message = describeError(error) || "Unknown Supabase error";
          window.sessionStorage.setItem(errorKey, message);
          publishStatus("error", message);
          console.warn(`[LUTOWAY OS] Supabase save unavailable. Local changes were kept. ${message}`);
          window.dispatchEvent(new CustomEvent("lutoway:supabase-error", { detail: { message } }));
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
