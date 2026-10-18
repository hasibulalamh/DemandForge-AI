import "server-only";

import type { Json, TablesInsert } from "@/types/database";
import type { AdminClient } from "@/lib/jobs/context";

export async function recordAudit(
  admin: AdminClient,
  event: {
    userId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, Json | undefined>;
    actorType?: "user" | "worker" | "system";
  },
): Promise<void> {
  const insert: TablesInsert<"audit_events"> = {
    user_id: event.userId,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId ?? null,
    metadata: (event.metadata ?? {}) as Json,
    actor_type: event.actorType ?? "user",
  };

  const { error } = await admin.from("audit_events").insert(insert);
  if (error) {
    console.warn("[audit] could not record event", { action: event.action, code: error.code });
  }
}
