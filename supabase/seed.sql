-- Local development seed.
-- Run AFTER creating your account (the first account becomes the owner):
--   psql "$SUPABASE_DB_URL" -f supabase/seed.sql
-- or: supabase db reset (which requires an existing auth user to attach data to).
--
-- Data is attached to the first profile that exists. If no account exists yet,
-- this file is a no-op with a notice. Never run this against production.

do $$
declare
  owner_id uuid;
  sample_source uuid := '11111111-1111-4111-8111-111111111111';
  sample_lead uuid := '22222222-2222-4222-8222-222222222222';
  sample_lead_two uuid := '33333333-3333-4333-8333-333333333333';
  sample_demo uuid := '44444444-4444-4444-8444-444444444444';
begin
  select id into owner_id from public.profiles order by created_at asc limit 1;

  if owner_id is null then
    raise notice 'No profile found. Create an account first, then re-run supabase/seed.sql.';
    return;
  end if;

  insert into public.sources (id, user_id, source_type, source_name, source_url, connection_status, config)
  values (
    sample_source, owner_id, 'manual', 'Web development groups (manual)', null, 'manual_only',
    '{"note":"Manual import of posts the user is authorised to view."}'::jsonb
  )
  on conflict (id) do nothing;

  insert into public.collection_rules (user_id, name, keywords, excluded_keywords, project_categories)
  values (
    owner_id,
    'Website and web app requests',
    array['website', 'web app', 'landing page', 'next.js', 'react', 'laravel', 'shopify'],
    array['hiring me', 'free', 'student'],
    array['web_development', 'ecommerce']
  )
  on conflict do nothing;

  insert into public.leads (
    id, user_id, source_id, canonical_url, original_text, normalized_content_hash,
    project_category, project_title, project_summary,
    required_features, suggested_features, technology_preferences,
    budget_status, budget_amount, budget_currency, urgency, hiring_intent,
    requirements_clarity, lead_score, confidence_score, evidence, analysis_status, pipeline_status
  )
  values
  (
    sample_lead,
    owner_id,
    sample_source,
    'https://www.facebook.com/groups/example/posts/1001',
    'Looking for a developer to build a 5 page website for my dental clinic. Need online appointment booking, services pages and contact form. Budget around $1200, need it in 3 weeks. Please DM if interested.',
    repeat('a', 64),
    'healthcare',
    'Dental clinic website with appointment booking',
    'Small clinic needs a five page marketing site with an appointment request flow and contact form.',
    '[{"name":"Online appointment request","evidence":"Need online appointment booking"},{"name":"Services pages","evidence":"services pages"},{"name":"Contact form","evidence":"contact form"}]'::jsonb,
    '[{"name":"Google Maps embed","reason":"Local clinic visitors often need directions"}]'::jsonb,
    '["WordPress or plain HTML"]'::jsonb,
    'stated', 1200, 'USD', 'high', 'high',
    80, 84, 82,
    '{"scoreBreakdown":{"hiringIntent":25,"requirementsClarity":12,"budget":15,"urgency":10,"features":12,"techSpecificity":4,"confidence":8},"quotes":["Budget around $1200","need it in 3 weeks"]}'::jsonb,
    'analyzed', 'shortlisted'
  ),
  (
    sample_lead_two,
    owner_id,
    sample_source,
    'https://www.facebook.com/groups/example/posts/1002',
    'Need help with a Shopify store. Custom theme tweaks and product upload. Not sure about budget yet.',
    repeat('b', 64),
    'ecommerce',
    'Shopify theme customisation',
    'Existing Shopify merchant wants theme changes and product upload support. Budget not stated.',
    '[{"name":"Shopify theme customisation","evidence":"Custom theme tweaks"},{"name":"Product upload","evidence":"product upload"}]'::jsonb,
    '[{"name":"Speed audit","reason":"Theme work often benefits from performance improvements"}]'::jsonb,
    '["Shopify","Liquid"]'::jsonb,
    'unknown', null, null, 'unknown', 'medium',
    45, 52, 61,
    '{"scoreBreakdown":{"hiringIntent":15,"requirementsClarity":7,"budget":0,"urgency":0,"features":8,"techSpecificity":8,"confidence":7},"quotes":["Not sure about budget yet"]}'::jsonb,
    'analyzed', 'new'
  )
  on conflict (user_id, normalized_content_hash) do nothing;

  insert into public.demo_projects (
    id, user_id, lead_id, title, slug, template_name, generation_status,
    artifact_storage_path, preview_url, deployment_status, approved_at
  )
  values (
    sample_demo, owner_id, sample_lead,
    'Bright Smile Dental - concept site', 'bright-smile-dental', 'local-service',
    'approved', 'db://demo_artifacts/' || sample_demo, '/demos/' || sample_demo,
    'not_deployed', now()
  )
  on conflict (user_id, slug) do nothing;

  insert into public.outreach_records (user_id, lead_id, demo_project_id, channel, draft_content, status)
  values (
    owner_id, sample_lead, sample_demo, 'facebook_message',
    'Hi! I saw your post about the dental clinic website. I put together a quick concept of the appointment flow — happy to share it if useful.',
    'draft'
  )
  on conflict do nothing;
end;
$$;
