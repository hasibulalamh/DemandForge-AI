/**
 * Unit-test stub for the `server-only` marker package.
 *
 * In the Next.js build the real package fails the client bundle when a
 * server-only module is imported from a Client Component. Vitest runs in a plain
 * Node environment, where the real package throws unconditionally, so it is
 * aliased to this empty module (see vitest.config.ts).
 */
export {};
