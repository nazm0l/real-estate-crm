import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AgentRow = {
  agentId: string;
  name: string;
  assigned: number;
  booked: number;
  conversion: number;
};

export function AgentPerformanceTable({ agents }: { agents: AgentRow[] }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <p className="border-b border-border p-5 pb-4 text-sm font-medium text-foreground">
        Agent performance
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Leads assigned</TableHead>
              <TableHead className="text-right">Booked</TableHead>
              <TableHead className="text-right">Conversion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No leads assigned to agents yet.
                </TableCell>
              </TableRow>
            ) : (
              agents.map((a) => (
                <TableRow key={a.agentId}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-right">{a.assigned}</TableCell>
                  <TableCell className="text-right">{a.booked}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        a.conversion >= 20
                          ? "font-medium text-teal-700"
                          : a.conversion > 0
                            ? "font-medium text-amber-600"
                            : "text-muted-foreground"
                      }
                    >
                      {a.conversion}%
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
