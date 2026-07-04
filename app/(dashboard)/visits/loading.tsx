import { Skeleton } from "@/components/ui/skeleton";

export default function VisitsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-52" />
      </div>
      <Skeleton className="h-10 w-56" />
      {Array.from({ length: 3 }).map((_, g) => (
        <div key={g} className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
