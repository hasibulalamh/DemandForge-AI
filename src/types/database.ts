/**
 * Typed database definitions.
 *
 * These mirror supabase/migrations/*.sql. After changing the schema, regenerate
 * with `supabase gen types typescript --linked > src/types/database.ts` (or keep
 * this file in sync manually) and run `pnpm typecheck`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "owner" | "member";
export type SourceType = "manual" | "chrome_extension" | "meta_api";
export type ConnectionStatus = "manual_only" | "connected" | "disconnected" | "error";
export type BudgetStatus = "unknown" | "unclear" | "stated" | "range";
export type SignalLevel = "unknown" | "low" | "medium" | "high";
export type AnalysisStatus = "pending" | "queued" | "analyzing" | "analyzed" | "failed";
export type PipelineStatus =
  | "new"
  | "shortlisted"
  | "rejected"
  | "demo_generated"
  | "deployed"
  | "contacted"
  | "replied"
  | "won"
  | "lost"
  | "archived";
export type GenerationStatus = "draft" | "queued" | "generating" | "ready" | "failed" | "approved";
export type DeploymentStatus = "not_deployed" | "queued" | "deploying" | "deployed" | "failed";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";
export type JobAttemptStatus = "running" | "succeeded" | "failed";
export type DeploymentProvider = "vercel";
export type DeploymentRunStatus = "queued" | "building" | "ready" | "error" | "canceled";
export type OutreachChannel = "facebook_message" | "email" | "other";
export type OutreachStatus =
  "draft" | "ready" | "sent" | "replied" | "no_response" | "converted" | "archived";
export type AiUsageStatus = "success" | "error";

type TableDefinition = { Row: unknown; Insert: unknown; Update: unknown };

/**
 * postgrest-js requires every table entry to declare `Relationships`. This
 * mapping adds the empty relationship list that hand-written types omit while
 * preserving Row/Insert/Update inference.
 */
type WithRelationships<T extends Record<string, TableDefinition>> = {
  [K in keyof T]: T[K] & { Relationships: [] };
};

// Declared as a type alias (not an interface) so nested Row shapes keep the
// implicit index signature supabase-js requires for its generic constraints.
export type Database = {
  public: {
    Tables: WithRelationships<{
      profiles: {
        Row: {
          id: string;
          display_name: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      sources: {
        Row: {
          id: string;
          user_id: string;
          source_type: SourceType;
          source_name: string;
          source_url: string | null;
          connection_status: ConnectionStatus;
          config: Json;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_type?: SourceType;
          source_name: string;
          source_url?: string | null;
          connection_status?: ConnectionStatus;
          config?: Json;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_type?: SourceType;
          source_name?: string;
          source_url?: string | null;
          connection_status?: ConnectionStatus;
          config?: Json;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      collection_rules: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          keywords: string[];
          excluded_keywords: string[];
          project_categories: string[];
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          keywords?: string[];
          excluded_keywords?: string[];
          project_categories?: string[];
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          keywords?: string[];
          excluded_keywords?: string[];
          project_categories?: string[];
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          user_id: string;
          source_id: string | null;
          external_reference: string | null;
          canonical_url: string | null;
          original_text: string;
          normalized_content_hash: string;
          project_category: string | null;
          project_title: string | null;
          project_summary: string | null;
          required_features: Json;
          suggested_features: Json;
          technology_preferences: Json;
          budget_status: BudgetStatus;
          budget_amount: number | null;
          budget_currency: string | null;
          urgency: SignalLevel;
          hiring_intent: SignalLevel;
          requirements_clarity: number | null;
          lead_score: number | null;
          confidence_score: number | null;
          evidence: Json;
          analysis_status: AnalysisStatus;
          pipeline_status: PipelineStatus;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_id?: string | null;
          external_reference?: string | null;
          canonical_url?: string | null;
          original_text: string;
          normalized_content_hash: string;
          project_category?: string | null;
          project_title?: string | null;
          project_summary?: string | null;
          required_features?: Json;
          suggested_features?: Json;
          technology_preferences?: Json;
          budget_status?: BudgetStatus;
          budget_amount?: number | null;
          budget_currency?: string | null;
          urgency?: SignalLevel;
          hiring_intent?: SignalLevel;
          requirements_clarity?: number | null;
          lead_score?: number | null;
          confidence_score?: number | null;
          evidence?: Json;
          analysis_status?: AnalysisStatus;
          pipeline_status?: PipelineStatus;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_id?: string | null;
          external_reference?: string | null;
          canonical_url?: string | null;
          original_text?: string;
          normalized_content_hash?: string;
          project_category?: string | null;
          project_title?: string | null;
          project_summary?: string | null;
          required_features?: Json;
          suggested_features?: Json;
          technology_preferences?: Json;
          budget_status?: BudgetStatus;
          budget_amount?: number | null;
          budget_currency?: string | null;
          urgency?: SignalLevel;
          hiring_intent?: SignalLevel;
          requirements_clarity?: number | null;
          lead_score?: number | null;
          confidence_score?: number | null;
          evidence?: Json;
          analysis_status?: AnalysisStatus;
          pipeline_status?: PipelineStatus;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      demo_projects: {
        Row: {
          id: string;
          user_id: string;
          lead_id: string;
          title: string;
          slug: string;
          template_name: string;
          generation_status: GenerationStatus;
          artifact_storage_path: string | null;
          preview_url: string | null;
          deployment_status: DeploymentStatus;
          deployment_url: string | null;
          vercel_project_reference: string | null;
          deployment_error: string | null;
          approved_at: string | null;
          deployed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lead_id: string;
          title: string;
          slug: string;
          template_name?: string;
          generation_status?: GenerationStatus;
          artifact_storage_path?: string | null;
          preview_url?: string | null;
          deployment_status?: DeploymentStatus;
          deployment_url?: string | null;
          vercel_project_reference?: string | null;
          deployment_error?: string | null;
          approved_at?: string | null;
          deployed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lead_id?: string;
          title?: string;
          slug?: string;
          template_name?: string;
          generation_status?: GenerationStatus;
          artifact_storage_path?: string | null;
          preview_url?: string | null;
          deployment_status?: DeploymentStatus;
          deployment_url?: string | null;
          vercel_project_reference?: string | null;
          deployment_error?: string | null;
          approved_at?: string | null;
          deployed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      demo_artifacts: {
        Row: {
          id: string;
          demo_id: string;
          files: Json;
          manifest: Json;
          byte_size: number;
          checksum: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          demo_id: string;
          files: Json;
          manifest?: Json;
          byte_size?: number;
          checksum: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          demo_id?: string;
          files?: Json;
          manifest?: Json;
          byte_size?: number;
          checksum?: string;
          created_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          user_id: string;
          job_type: string;
          status: JobStatus;
          payload: Json;
          idempotency_key: string | null;
          attempt_count: number;
          max_attempts: number;
          scheduled_at: string;
          started_at: string | null;
          completed_at: string | null;
          last_error: string | null;
          locked_by: string | null;
          locked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_type: string;
          status?: JobStatus;
          payload?: Json;
          idempotency_key?: string | null;
          attempt_count?: number;
          max_attempts?: number;
          scheduled_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          last_error?: string | null;
          locked_by?: string | null;
          locked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_type?: string;
          status?: JobStatus;
          payload?: Json;
          idempotency_key?: string | null;
          attempt_count?: number;
          max_attempts?: number;
          scheduled_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          last_error?: string | null;
          locked_by?: string | null;
          locked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_attempts: {
        Row: {
          id: string;
          job_id: string;
          attempt: number;
          worker_id: string;
          status: JobAttemptStatus;
          started_at: string;
          finished_at: string | null;
          error: string | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          attempt: number;
          worker_id: string;
          status?: JobAttemptStatus;
          started_at?: string;
          finished_at?: string | null;
          error?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string;
          attempt?: number;
          worker_id?: string;
          status?: JobAttemptStatus;
          started_at?: string;
          finished_at?: string | null;
          error?: string | null;
        };
      };
      deployments: {
        Row: {
          id: string;
          user_id: string;
          demo_project_id: string;
          provider: DeploymentProvider;
          vercel_deployment_id: string | null;
          vercel_project_reference: string | null;
          status: DeploymentRunStatus;
          url: string | null;
          error_message: string | null;
          requested_by: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          demo_project_id: string;
          provider?: DeploymentProvider;
          vercel_deployment_id?: string | null;
          vercel_project_reference?: string | null;
          status?: DeploymentRunStatus;
          url?: string | null;
          error_message?: string | null;
          requested_by?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          demo_project_id?: string;
          provider?: DeploymentProvider;
          vercel_deployment_id?: string | null;
          vercel_project_reference?: string | null;
          status?: DeploymentRunStatus;
          url?: string | null;
          error_message?: string | null;
          requested_by?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      outreach_records: {
        Row: {
          id: string;
          user_id: string;
          lead_id: string;
          demo_project_id: string | null;
          channel: OutreachChannel;
          draft_content: string;
          status: OutreachStatus;
          sent_at: string | null;
          response_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lead_id: string;
          demo_project_id?: string | null;
          channel?: OutreachChannel;
          draft_content: string;
          status?: OutreachStatus;
          sent_at?: string | null;
          response_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lead_id?: string;
          demo_project_id?: string | null;
          channel?: OutreachChannel;
          draft_content?: string;
          status?: OutreachStatus;
          sent_at?: string | null;
          response_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_usage: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          model: string;
          operation: string;
          input_usage: number;
          output_usage: number;
          estimated_cost: number;
          status: AiUsageStatus;
          error_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider?: string;
          model: string;
          operation: string;
          input_usage?: number;
          output_usage?: number;
          estimated_cost?: number;
          status?: AiUsageStatus;
          error_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          model?: string;
          operation?: string;
          input_usage?: number;
          output_usage?: number;
          estimated_cost?: number;
          status?: AiUsageStatus;
          error_code?: string | null;
          created_at?: string;
        };
      };
      audit_events: {
        Row: {
          id: string;
          user_id: string;
          actor_type: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_type?: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          actor_type?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      api_tokens: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          token_hash: string;
          token_prefix: string;
          last_used_at: string | null;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          token_hash: string;
          token_prefix: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          token_hash?: string;
          token_prefix?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    }>;
    Views: { [_ in never]: never };
    Functions: {
      claim_jobs: {
        Args: {
          p_worker_id: string;
          p_limit?: number;
          p_job_types?: string[] | null;
          p_lock_seconds?: number;
        };
        Returns: Database["public"]["Tables"]["jobs"]["Row"][];
      };
      recover_stale_jobs: {
        Args: { p_lock_seconds?: number };
        Returns: number;
      };
      is_workspace_initialized: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      claim_initial_owner: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      register_owner_setup_claim: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      source_type: SourceType;
      connection_status: ConnectionStatus;
      budget_status: BudgetStatus;
      signal_level: SignalLevel;
      analysis_status: AnalysisStatus;
      pipeline_status: PipelineStatus;
      generation_status: GenerationStatus;
      deployment_status: DeploymentStatus;
      job_status: JobStatus;
      job_attempt_status: JobAttemptStatus;
      deployment_provider: DeploymentProvider;
      deployment_run_status: DeploymentRunStatus;
      outreach_channel: OutreachChannel;
      outreach_status: OutreachStatus;
      ai_usage_status: AiUsageStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
