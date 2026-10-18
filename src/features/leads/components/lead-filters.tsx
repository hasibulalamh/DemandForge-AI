"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useState } from "react";

import { Button, Input, Select } from "@/components/ui/primitives";

export function LeadFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/leads?${next.toString()}`);
  };

  const hasFilters = ["q", "pipeline", "analysis", "sort", "minScore"].some((key) => params.get(key));

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        update("q", q.trim());
      }}
    >
      <div className="min-w-48 flex-1">
        <label htmlFor="lead-search" className="sr-only">
          Search leads
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            id="lead-search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search titles, summaries, post text…"
            className="pl-9"
          />
        </div>
      </div>

      <Select
        aria-label="Filter by pipeline status"
        value={params.get("pipeline") ?? ""}
        onChange={(event) => update("pipeline", event.target.value)}
        className="w-44"
      >
        <option value="">All pipeline states</option>
        <option value="new">New</option>
        <option value="shortlisted">Shortlisted</option>
        <option value="demo_generated">Demo generated</option>
        <option value="deployed">Deployed</option>
        <option value="contacted">Contacted</option>
        <option value="replied">Replied</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
        <option value="rejected">Rejected</option>
        <option value="archived">Archived</option>
      </Select>

      <Select
        aria-label="Filter by analysis status"
        value={params.get("analysis") ?? ""}
        onChange={(event) => update("analysis", event.target.value)}
        className="w-40"
      >
        <option value="">All analysis states</option>
        <option value="pending">Pending</option>
        <option value="queued">Queued</option>
        <option value="analyzing">Analyzing</option>
        <option value="analyzed">Analyzed</option>
        <option value="failed">Failed</option>
      </Select>

      <Select
        aria-label="Sort leads"
        value={params.get("sort") ?? "newest"}
        onChange={(event) => update("sort", event.target.value)}
        className="w-36"
      >
        <option value="newest">Newest</option>
        <option value="score">Highest score</option>
        <option value="oldest">Oldest</option>
      </Select>

      <Button type="submit" variant="secondary">
        Search
      </Button>

      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setQ("");
            router.push("/leads");
          }}
        >
          <X className="size-4" aria-hidden="true" />
          Clear
        </Button>
      ) : null}
    </form>
  );
}
