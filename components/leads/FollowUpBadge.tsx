export function FollowUpBadge({ nextFollowUpAt }: { nextFollowUpAt: string | null }) {
  if (!nextFollowUpAt) return null;
  const isOverdue = new Date(nextFollowUpAt).getTime() < Date.now();
  if (!isOverdue) return null;

  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-500"
      title={`Follow-up overdue since ${new Date(nextFollowUpAt).toLocaleDateString("en-BD")}`}
    />
  );
}
