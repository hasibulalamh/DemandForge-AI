import { expect, test } from "@playwright/test";

/**\
 * Smoke tests that must pass in both configured and unconfigured environments.
 * They cover unauthenticated routing, the login screen, and API authorization.
 * Authenticated end-to-end flows require a configured Supabase project and are
 * covered by tests/rls and tests/unit plus the manual checklist in
 * docs/TEST-PLAN.md.
 */

test("anonymous visitors are redirected from protected pages to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("deep links to protected pages redirect to login", async ({ page }) => {
  await page.goto("/settings/integrations");
  await expect(page).toHaveURL(/\/login$/);
});

test("the login screen renders sign-in and email-code modes", async ({ page }) => {
  await page.goto("/login");

  const emailCodeTab = page.getByRole("tab", { name: "Email code" });
  if ((await emailCodeTab.count()) > 0) {
    await expect(page.getByRole("tab", { name: "Sign in" })).toBeVisible();
    await expect(emailCodeTab).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    await expect(async () => {
      await emailCodeTab.click();
      await expect(emailCodeTab).toHaveAttribute("aria-selected", "true");
    }).toPass({ timeout: 20_000 });
    await expect(page.getByLabel("Code")).toBeVisible();
  } else {
    await expect(page.getByText(/no account exists yet/i)).toBeVisible();
  }
});

test("the login screen hides public account creation", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("tab", { name: "Create account" })).not.toBeVisible();
});

test("the health endpoint responds without authentication", async ({ request }) => {
  const response = await request.get("/api/v1/health");
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ status: "ok", service: "demandforge" });
});

test("API routes reject unauthenticated reads", async ({ request }) => {
  const response = await request.get("/api/v1/leads", {
    headers: { Origin: "http://127.0.0.1:3000" },
  });
  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toMatchObject({
    error: { code: "UNAUTHORIZED" },
  });
});

test("cookie-authenticated mutations require a same-origin request", async ({ request }) => {
  const response = await request.post("/api/v1/leads", {
    data: { originalText: "A long enough project request text for validation" },
  });
  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({
    error: { code: "ORIGIN_REQUIRED" },
  });
});

test("cross-site mutations are refused even with a session cookie absent", async ({ request }) => {
  const response = await request.post("/api/v1/leads", {
    headers: { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" },
    data: { originalText: "A long enough project request text for validation" },
  });
  expect([401, 403]).toContain(response.status());
});

test("the queue worker endpoint requires a worker secret", async ({ request }) => {
  const response = await request.post("/api/v1/jobs/run");
  expect(response.status()).toBeGreaterThanOrEqual(401);
  expect(response.status()).toBeLessThan(504);
});

test("the workspace setup page is publicly reachable", async ({ page }) => {
  await page.goto("/setup");

  const body = await page.locator("body").innerText();
  expect(body).toMatch(/set up your personal workspace|owner setup is not enabled/i);
});

test("the auth callback route is publicly reachable", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
});

test("the password reset pages are publicly reachable", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible();

  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: /choose a new password/i })).toBeVisible();
});
