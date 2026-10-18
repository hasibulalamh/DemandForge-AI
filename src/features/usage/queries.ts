import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface UsageSummary {
  totals: { inputTokens: number; outputTokens: number; estimatedCost: number; calls: number; errors: number };
  byOperation: Array<{
    operation: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
  byModel: Array<{ model: string; calls: number; cost: number }>;
  recent: Array<{
    id: string;
    model: string;
    operation: string;
    input_usage: number;
    output_usage: number;
    estimated_cost: number;
    status: string;
    created_at: string;
  }>;
}

export async function getUsageSummary(): Promise<UsageSummary> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ai_usage")
    .select("id, model, operation, input_usage, output_usage, estimated_cost, status, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) throw new Error("Could not load AI usage.");

  const rows = data ?? [];
  const totals = { inputTokens: 0, outputTokens: 0, estimatedCost: 0, calls: rows.length, errors: 0 };
  const operationMap = new Map<
    string,
    { calls: number; inputTokens: number; outputTokens: number; cost: number }
  >();
  const modelMap = new Map<string, { calls: number; cost: number }>();

  for (const row of rows) {
    totals.inputTokens += row.input_usage;
    totals.outputTokens += row.output_usage;
    totals.estimatedCost += Number(row.estimated_cost);
    if (row.status === "error") totals.errors += 1;

    const operation = operationMap.get(row.operation) ?? {
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
    operation.calls += 1;
    operation.inputTokens += row.input_usage;
    operation.outputTokens += row.output_usage;
    operation.cost += Number(row.estimated_cost);
    operationMap.set(row.operation, operation);

    const model = modelMap.get(row.model) ?? { calls: 0, cost: 0 };
    model.calls += 1;
    model.cost += Number(row.estimated_cost);
    modelMap.set(row.model, model);
  }

  return {
    totals: { ...totals, estimatedCost: Math.round(totals.estimatedCost * 1_000_000) / 1_000_000 },
    byOperation: [...operationMap.entries()].map(([operation, value]) => ({ operation, ...value })),
    byModel: [...modelMap.entries()].map(([model, value]) => ({ model, ...value })),
    recent: rows.slice(0, 20),
  };
}
