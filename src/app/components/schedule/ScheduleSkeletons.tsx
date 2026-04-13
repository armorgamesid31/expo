import { Skeleton } from '../ui/skeleton';

export function CalendarSkeleton() {
  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-8 w-full rounded-lg" />
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="glass-card p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
