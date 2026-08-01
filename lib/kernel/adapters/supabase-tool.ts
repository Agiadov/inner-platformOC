import { supabase } from "@/lib/supabase";
import type { ToolDefinition } from "@/lib/kernel/tool-hub";

type SelectInput = { table: string; columns?: string; limit?: number; orderBy?: string; ascending?: boolean };
type InsertInput = { table: string; values: Record<string, unknown> | Record<string, unknown>[] };
type UpsertInput = InsertInput & { onConflict?: string };
type DeleteInput = { table: string; column: string; value: unknown };

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

export const supabaseTool: ToolDefinition = {
  id: "supabase",
  name: "Supabase",
  version: "1.0.0",
  capabilities: [
    { id: "select", description: "Read rows from a table" },
    { id: "insert", description: "Insert rows into a table" },
    { id: "upsert", description: "Insert or update rows" },
    { id: "delete", description: "Delete rows by equality filter" },
  ],
  execute: async (capability, input) => {
    const client = requireClient();

    if (capability === "select") {
      const params = input as SelectInput;
      let query = client.from(params.table).select(params.columns ?? "*");
      if (params.orderBy) query = query.order(params.orderBy, { ascending: params.ascending ?? false });
      if (params.limit) query = query.limit(params.limit);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }

    if (capability === "insert") {
      const params = input as InsertInput;
      const { data, error } = await client.from(params.table).insert(params.values).select();
      if (error) throw error;
      return data;
    }

    if (capability === "upsert") {
      const params = input as UpsertInput;
      const { data, error } = await client
        .from(params.table)
        .upsert(params.values, params.onConflict ? { onConflict: params.onConflict } : undefined)
        .select();
      if (error) throw error;
      return data;
    }

    if (capability === "delete") {
      const params = input as DeleteInput;
      const { data, error } = await client.from(params.table).delete().eq(params.column, params.value).select();
      if (error) throw error;
      return data;
    }

    throw new Error(`Unsupported Supabase capability: ${capability}`);
  },
};
