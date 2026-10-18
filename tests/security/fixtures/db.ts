type User = { id: string; email: string };
type Scope = "no-db" | "real-db";

export function createProfiles(a: User, b: User, _scope: Scope) {
  void _scope;
  return {
    rows: [
      { id: a.id, display_name: "A", role: "owner" },
      { id: b.id, display_name: "B", role: "member" },
    ],
  };
}

export function createSources(a: User, _b: User, _scope: Scope) {
  void _b;
  void _scope;
  return {
    rows: [{ id: "s1", user_id: a.id, source_name: "A source", source_type: "manual" }],
  };
}

export function createCollectionRules(a: User, _b: User, _scope: Scope) {
  void _b;
  void _scope;
  return {
    rows: [
      {
        id: "r1",
        user_id: a.id,
        name: "A rule",
        keywords: [],
        excluded_keywords: [],
        project_categories: [],
        is_enabled: true,
      },
    ],
  };
}

export function createLeads(a: User, _b: User, _scope: Scope) {
  void _b;
  void _scope;
  return {
    rows: [
      {
        id: "l1",
        user_id: a.id,
        canonical_url: "https://example.com/x",
        original_text: "text",
        normalized_content_hash: "h",
        project_category: "web",
        project_title: "t",
        project_summary: "s",
        required_features: [],
        suggested_features: [],
        technology_preferences: [],
        budget_status: "unknown",
        budget_amount: null,
        budget_currency: null,
        urgency: "low",
        hiring_intent: "unknown",
        lead_score: 0,
        confidence_score: 0,
        analysis_status: "imported",
        pipeline_status: "new",
        published_at: null,
      },
    ],
  };
}

export function createDemos(a: User, _b: User, _scope: Scope) {
  void _b;
  void _scope;
  return {
    rows: [
      {
        id: "d1",
        user_id: a.id,
        lead_id: "l1",
        title: "Demo",
        slug: "demo",
        template_name: "portfolio",
        generation_status: "ready",
        artifact_storage_path: "artifacts/d1",
        preview_url: null,
        deployment_status: "not_started",
        deployment_url: null,
        vercel_project_reference: null,
        deployment_error: null,
        approved_at: null,
        deployed_at: null,
      },
      { id: "art1", user_id: a.id, demo_id: "d1", files: {}, manifest: {}, byte_size: 0, checksum: "x" },
    ],
  };
}

export function createArtifacts(a: User, b: User, _scope: Scope) {
  void a;
  void b;
  void _scope;
  return { rows: [] };
}

export function createJobs(a: User, _b: User, _scope: Scope) {
  void _b;
  void _scope;
  return {
    rows: [
      {
        id: "j1",
        user_id: a.id,
        job_type: "analyze_lead",
        status: "queued",
        payload: {},
        attempt_count: 0,
        max_attempts: 3,
        scheduled_at: null,
        started_at: null,
        completed_at: null,
        last_error: null,
      },
    ],
  };
}

export function createAttempts(a: User, _b: User, _scope: Scope) {
  void a;
  void _b;
  void _scope;
  return { rows: [] };
}

export function createDeployments(a: User, _b: User, _scope: Scope) {
  void _b;
  void _scope;
  return {
    rows: [
      { id: "dep1", user_id: a.id, demo_project_id: "d1", status: "pending", url: null, error_message: null },
    ],
  };
}

export function createOutreach(a: User, _b: User, _scope: Scope) {
  void _b;
  void _scope;
  return {
    rows: [{ id: "o1", user_id: a.id, lead_id: "l1", channel: "email", draft_content: "d", status: "draft" }],
  };
}

export function createUsage(a: User, _b: User, _scope: Scope) {
  void _b;
  void _scope;
  return {
    rows: [
      {
        id: "u1",
        user_id: a.id,
        provider: "gemini",
        model: "gemini-2.5-flash",
        operation: "analyze",
        input_usage: 0,
        output_usage: 0,
        estimated_cost: 0,
        status: "success",
      },
    ],
  };
}

export function createAuditEvents(a: User, _b: User, _scope: Scope) {
  void _b;
  void _scope;
  return {
    rows: [
      {
        id: "ae1",
        user_id: a.id,
        actor_type: "user",
        action: "demo_approve",
        entity_type: "demo",
        entity_id: "d1",
        metadata: {},
      },
    ],
  };
}

export function clearAll(_scope: Scope) {
  void _scope;
}
