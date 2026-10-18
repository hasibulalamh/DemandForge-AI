import { beforeEach, describe, expect, it } from "vitest";

import { importLead, matchCollectionRule } from "@/features/leads/import";
import type { AdminClient } from "@/lib/jobs/context";
import { computeContentHash } from "@/lib/security/hash";
import { createFakeAdmin, type FakeAdmin } from "./fakes/admin";

const USER = "11111111-1111-4111-8111-111111111111";
const SOURCE = "22222222-2222-4222-8222-222222222222";

const postText =
  "Looking for a developer to build a 5 page website for my dental clinic with online appointment booking.";

function setup() {
  const fake = createFakeAdmin({
    leads: [],
    sources: [{ id: SOURCE, user_id: USER, source_name: "Groups" }],
    audit_events: [],
  }) as FakeAdmin;
  return { fake, admin: fake as unknown as AdminClient };
}

describe("importLead", () => {
  let context: ReturnType<typeof setup>;

  beforeEach(() => {
    context = setup();
  });

  it("inserts a new lead with a normalized hash and audit event", async () => {
    const result = await importLead(context.admin, USER, {
      originalText: postText,
      canonicalUrl: "https://www.facebook.com/groups/example/posts/1?fbclid=abc",
      sourceId: SOURCE,
    });

    expect(result.duplicate).toBe(false);
    const inserted = context.fake.__tables.leads[0];
    expect(inserted.user_id).toBe(USER);
    expect(inserted.normalized_content_hash).toBe(computeContentHash(postText));
    expect(inserted.canonical_url).toBe("https://www.facebook.com/groups/example/posts/1");
    expect(inserted.analysis_status).toBe("pending");
    expect(context.fake.__tables.audit_events).toHaveLength(1);
  });

  it("detects a duplicate by normalized content hash", async () => {
    const first = await importLead(context.admin, USER, { originalText: postText });
    const second = await importLead(context.admin, USER, { originalText: `  ${postText}  ` });

    expect(second.duplicate).toBe(true);
    expect(second.leadId).toBe(first.leadId);
    expect(context.fake.__tables.leads).toHaveLength(1);
  });

  it("detects a duplicate by canonical URL even when the text differs", async () => {
    const url = "https://www.facebook.com/groups/example/posts/42?utm_source=x";
    await importLead(context.admin, USER, { originalText: postText, canonicalUrl: url });
    const second = await importLead(context.admin, USER, {
      originalText: `${postText} Updated with extra detail about timelines.`,
      canonicalUrl: "https://www.facebook.com/groups/example/posts/42",
    });

    expect(second.duplicate).toBe(true);
    expect(context.fake.__tables.leads).toHaveLength(1);
  });

  it("keeps the same text from another user separate", async () => {
    await importLead(context.admin, USER, { originalText: postText });
    const other = await importLead(context.admin, "99999999-9999-4999-8999-999999999999", {
      originalText: postText,
    });
    expect(other.duplicate).toBe(false);
    expect(context.fake.__tables.leads).toHaveLength(2);
  });

  it("rejects a source owned by someone else", async () => {
    await expect(
      importLead(context.admin, "99999999-9999-4999-8999-999999999999", {
        originalText: postText,
        sourceId: SOURCE,
      }),
    ).rejects.toThrow(/does not belong/);
  });

  it("marks extension imports in the evidence payload", async () => {
    await importLead(context.admin, USER, {
      originalText: postText,
      externalReference: "extension-popup",
    });
    const evidence = context.fake.__tables.leads[0].evidence as Record<string, unknown>;
    expect(evidence.importChannel).toBe("extension");
  });

  it("never trusts a caller-supplied user id in place of the authenticated one", async () => {
    // Cast through unknown: the API surface has no user_id field at all.
    const forged = {
      originalText: `${postText} (variant for user scoping check)`,
      user_id: "99999999-9999-4999-8999-999999999999",
    } as unknown as Parameters<typeof importLead>[2];

    await importLead(context.admin, USER, forged);
    expect(context.fake.__tables.leads[0].user_id).toBe(USER);
  });
});

describe("matchCollectionRule", () => {
  const noFreeRule = {
    name: "No free work",
    keywords: ["website"],
    excluded_keywords: ["free"],
    is_enabled: true,
  };
  const websitesRule = {
    name: "Websites",
    keywords: ["website", "landing page"],
    excluded_keywords: [],
    is_enabled: true,
  };
  const disabledRule = {
    name: "Disabled",
    keywords: ["website"],
    excluded_keywords: [],
    is_enabled: false,
  };

  it("returns the first enabled rule whose keywords match", () => {
    expect(matchCollectionRule(postText, [noFreeRule, websitesRule])).toBe("No free work");
  });

  it("skips a rule when an excluded keyword is present", () => {
    expect(matchCollectionRule("Free website needed", [noFreeRule])).toBeNull();
    expect(matchCollectionRule("Free website needed", [noFreeRule, websitesRule])).toBe("Websites");
  });

  it("ignores disabled rules", () => {
    expect(matchCollectionRule(postText, [disabledRule])).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(matchCollectionRule("Selling a used bicycle", [noFreeRule, websitesRule])).toBeNull();
  });
});
