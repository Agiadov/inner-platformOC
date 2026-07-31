import type { KnowledgeLink, KnowledgeNode } from "@/lib/graph-data";
import { supabase } from "@/lib/supabase";

export async function loadGraphFromSupabase() {
  if (!supabase) return null;

  const [{ data: nodeRows, error: nodeError }, { data: linkRows, error: linkError }] = await Promise.all([
    supabase.from("knowledge_nodes").select("id,name,kind,description,group_name,val,color").order("created_at"),
    supabase.from("knowledge_links").select("source_id,target_id,relation").order("created_at"),
  ]);

  if (nodeError) throw nodeError;
  if (linkError) throw linkError;

  const nodes: KnowledgeNode[] = (nodeRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    description: row.description,
    group: row.group_name,
    val: row.val,
    color: row.color,
  }));

  const links: KnowledgeLink[] = (linkRows ?? []).map((row) => ({
    source: row.source_id,
    target: row.target_id,
    relation: row.relation,
  }));

  return { nodes, links };
}

export async function upsertNode(node: KnowledgeNode) {
  if (!supabase) return;
  const { error } = await supabase.from("knowledge_nodes").upsert({
    id: node.id,
    name: node.name,
    kind: node.kind,
    description: node.description,
    group_name: node.group,
    val: node.val,
    color: node.color,
  });
  if (error) throw error;
}

export async function insertLink(link: KnowledgeLink) {
  if (!supabase) return;
  const { error } = await supabase.from("knowledge_links").insert({
    source_id: String(link.source),
    target_id: String(link.target),
    relation: link.relation,
  });
  if (error && error.code !== "23505") throw error;
}

export async function seedGraph(nodes: KnowledgeNode[], links: KnowledgeLink[]) {
  if (!supabase) return;
  const { error: nodeError } = await supabase.from("knowledge_nodes").upsert(
    nodes.map((node) => ({
      id: node.id,
      name: node.name,
      kind: node.kind,
      description: node.description,
      group_name: node.group,
      val: node.val,
      color: node.color,
    })),
  );
  if (nodeError) throw nodeError;

  const { error: linkError } = await supabase.from("knowledge_links").upsert(
    links.map((link) => ({
      source_id: String(link.source),
      target_id: String(link.target),
      relation: link.relation,
    })),
    { onConflict: "source_id,target_id" },
  );
  if (linkError) throw linkError;
}
