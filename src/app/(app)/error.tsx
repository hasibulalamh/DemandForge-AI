"use client";

import { useEffect } from "react";

import { Alert, Button } from "@/components/ui/primitives";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the digest only; never log user content or secrets.
    console.error("[dashboard] render error", { digest: error.digest });
  }, [error.digest]);

  return (
    <div className="mx-auto max-w-xl py-16">
      <Alert tone="red" title="This page could not be loaded">
        <p>
          The workspace hit an unexpected error. Your data was not changed. You can retry, or check that
          Supabase is reachable.
        </p>
        {error.digest ? <p className="font-mono text-xs opacity-70">Reference: {error.digest}</p> : null}
        <div className="mt-4">
          <Button onClick={reset} variant="secondary">
            Try again
          </Button>
        </div>
      </Alert>
    </div>
  );
}
