import { Card, Skeleton, TableSkeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2 border-b border-zinc-200 pb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-32" />
          </Card>
        ))}
      </div>
      <Card>
        <div className="border-b border-zinc-100 px-5 py-4">
          <Skeleton className="h-4 w-32" />
        </div>
        <TableSkeleton rows={6} />
      </Card>
    </div>
  );
}
