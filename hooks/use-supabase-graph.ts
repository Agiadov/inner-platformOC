"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { KnowledgeLink, KnowledgeNode } from "@/lib/graph-data";
import { loadGraphFromSupabase, seedGraph } from "@/lib/graph-storage";
import { isSupabaseConfigured } from "@/lib/supabase";

export type SyncStatus = "local" | "loading" | "synced" | "saving" | "error";

type Options = {
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
  setNodes: Dispatch<SetStateAction<KnowledgeNode[]>>;
  setLinks: Dispatch<SetStateAction<KnowledgeLink[]>>;
  onRemoteLoaded?: (nodes: KnowledgeNode[]) => void;
};

export function useSupabaseGraph({ nodes, links, setNodes, setLinks, onRemoteLoaded }: Options) {
  const [status, setStatus] = useState<SyncStatus>(isSupabaseConfigured ? "loading" : "local");
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!isSupabaseConfigured) {
        hydrated.current = true;
        return;
      }

      try {
        const remote = await loadGraphFromSupabase();
        if (!active) return;

        if (remote?.nodes.length) {
          setNodes(remote.nodes);
          setLinks(remote.links);
          onRemoteLoaded?.(remote.nodes);
        } else {
          await seedGraph(nodes, links);
        }

        hydrated.current = true;
        setStatus("synced");
      } catch (error) {
        console.error("Supabase graph load failed", error);
        hydrated.current = true;
        setStatus("error");
      }
    }

    load();
    return () => {
      active = false;
    };
    // Initial hydration must run only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !hydrated.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStatus("saving");

    saveTimer.current = setTimeout(async () => {
      try {
        await seedGraph(nodes, links);
        setStatus("synced");
      } catch (error) {
        console.error("Supabase graph save failed", error);
        setStatus("error");
      }
    }, 650);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [nodes, links]);

  return { status, configured: isSupabaseConfigured };
}
