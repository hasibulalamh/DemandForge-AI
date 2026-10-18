import "server-only";

import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database";

export type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export interface JobContext {
  job: Tables<"jobs">;
  admin: AdminClient;
  workerId: string;
}

export type JobHandler = (context: JobContext) => Promise<void>;
