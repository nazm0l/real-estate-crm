"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PipelineStage } from "@prisma/client";
import { toast } from "sonner";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ArrowRightLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { displayBDPhone } from "@/lib/bd-phone";
import { formatBDT } from "@/lib/format-bdt";
import { STAGE_BADGE, SOURCE_BADGE, SCORE_BADGE, PIPELINE_STAGES } from "./constants";
import { FollowUpBadge } from "./FollowUpBadge";
import type { LeadWithAgent } from "./types";

const SOURCES = ["MANUAL", "WEBSITE", "FACEBOOK", "INSTAGRAM", "REFERRAL"] as const;
const PAGE_SIZES = [10, 20, 50];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function LeadListView({
  leads,
  canEditLead,
  onEdit,
  onStageChange,
  agents = [],
  canAssign = false,
  canBulkStage = false,
  onBulkUpdate,
}: {
  leads: LeadWithAgent[];
  canEditLead: (lead: LeadWithAgent) => boolean;
  onEdit: (lead: LeadWithAgent) => void;
  onStageChange: (lead: LeadWithAgent, newStage: PipelineStage) => Promise<void>;
  agents?: { id: string; name: string }[];
  canAssign?: boolean;
  canBulkStage?: boolean;
  onBulkUpdate?: (
    ids: string[],
    changes: { agentId?: string; pipelineStage?: PipelineStage }
  ) => void;
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  const bulkEnabled = canAssign || canBulkStage;

  const columns: ColumnDef<LeadWithAgent>[] = [
    ...(bulkEnabled
      ? ([
          {
            id: "select",
            header: ({ table }) => (
              <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
                onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)}
                aria-label="Select all"
              />
            ),
            cell: ({ row }) => (
              <span onClick={(e) => e.stopPropagation()} className="flex">
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(checked) => row.toggleSelected(!!checked)}
                  aria-label="Select row"
                />
              </span>
            ),
          },
        ] as ColumnDef<LeadWithAgent>[])
      : []),
    {
      id: "sl",
      header: "SL",
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination;
        const position = table.getRowModel().rows.findIndex((r) => r.id === row.id);
        return <span className="text-muted-foreground">{pageIndex * pageSize + position + 1}</span>;
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Lead
          <ArrowUpDown className="h-3.5 w-3.5" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-accent text-accent-foreground text-xs">
              {initials(row.original.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-sm font-semibold">
              {row.original.name}
              <FollowUpBadge nextFollowUpAt={row.original.nextFollowUpAt} />
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {displayBDPhone(row.original.phone)}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "budget",
      header: "Budget",
      cell: ({ row }) => {
        const parts = [row.original.budgetMin, row.original.budgetMax].filter(
          (v): v is number => v != null
        );
        return parts.length ? (
          <span className="font-medium text-primary">{parts.map((v) => formatBDT(v)).join(" – ")}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "locationArea",
      header: "Location",
      cell: ({ row }) => row.original.locationArea ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "pipelineStage",
      filterFn: "equalsString",
      header: "Stage",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn("text-xs", STAGE_BADGE[row.original.pipelineStage])}>
          {row.original.pipelineStage}
        </Badge>
      ),
    },
    {
      accessorKey: "source",
      filterFn: "equalsString",
      header: "Source",
      cell: ({ row }) => (
        <span className="flex gap-1">
          <Badge variant="outline" className={cn("text-xs", SOURCE_BADGE[row.original.source])}>
            {row.original.source}
          </Badge>
          {row.original.aiScore && (
            <Badge variant="outline" className={cn("text-xs", SCORE_BADGE[row.original.aiScore])}>
              {row.original.aiScore}
            </Badge>
          )}
        </span>
      ),
    },
    {
      id: "agent",
      header: "Agent",
      cell: ({ row }) =>
        row.original.agent?.name ?? <span className="text-muted-foreground">Unassigned</span>,
    },
    {
      id: "followUp",
      accessorFn: (lead) => lead.nextFollowUpAt ?? "",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Follow-up
          <ArrowUpDown className="h-3.5 w-3.5" />
        </button>
      ),
      cell: ({ row }) => {
        const date = row.original.nextFollowUpAt;
        if (!date) return <span className="text-muted-foreground">—</span>;
        const overdue = new Date(date).getTime() < Date.now();
        return (
          <span className={cn("text-sm", overdue && "font-medium text-destructive")}>
            {new Date(date).toLocaleDateString("en-BD", { day: "2-digit", month: "short" })}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => {
        const lead = row.original;
        const editable = canEditLead(lead);
        return (
          <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon-sm"
              title="View"
              onClick={() => router.push(`/leads/${lead.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {editable && (
              <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => onEdit(lead)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {editable && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" title="Change stage">
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  {PIPELINE_STAGES.map((stage) => (
                    <DropdownMenuItem
                      key={stage.value}
                      onClick={() => onStageChange(lead, stage.value)}
                    >
                      {stage.label}
                      {lead.pipelineStage === stage.value && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting, columnFilters, rowSelection },
    enableRowSelection: bulkEnabled,
    getRowId: (lead) => lead.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const rangeStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min(totalRows, (pageIndex + 1) * pageSize);

  const stageFilter = (table.getColumn("pipelineStage")?.getFilterValue() as string) ?? "all";
  const sourceFilter = (table.getColumn("source")?.getFilterValue() as string) ?? "all";

  const selectedIds = Object.keys(rowSelection);

  async function applyBulk(changes: { agentId?: string; pipelineStage?: PipelineStage }) {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    const res = await fetch("/api/leads/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, ...changes }),
    });
    setBulkBusy(false);

    if (!res.ok) {
      toast.error("Could not update the selected leads");
      return;
    }
    const { updated } = await res.json();
    toast.success(`${updated} lead${updated === 1 ? "" : "s"} updated`);
    table.resetRowSelection();
    onBulkUpdate?.(selectedIds, changes);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={stageFilter}
          onValueChange={(v) =>
            table.getColumn("pipelineStage")?.setFilterValue(v === "all" ? undefined : v)
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {PIPELINE_STAGES.map((stage) => (
              <SelectItem key={stage.value} value={stage.value}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sourceFilter}
          onValueChange={(v) =>
            table.getColumn("source")?.setFilterValue(v === "all" ? undefined : v)
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {SOURCES.map((source) => (
              <SelectItem key={source} value={source}>
                {source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-accent/60 px-3 py-2">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          {canAssign && (
            <Select value={null} onValueChange={(v) => v && applyBulk({ agentId: v })}>
              <SelectTrigger className="w-44" size="sm" disabled={bulkBusy}>
                <SelectValue placeholder="Assign to agent…" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canBulkStage && (
            <Select
              value={null}
              onValueChange={(v) => v && applyBulk({ pipelineStage: v as PipelineStage })}
            >
              <SelectTrigger className="w-44" size="sm" disabled={bulkBusy}>
                <SelectValue placeholder="Move to stage…" />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => table.resetRowSelection()}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No leads match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/leads/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Rows per page
            <Select
              value={String(pageSize)}
              onValueChange={(v) => v && table.setPageSize(Number(v))}
            >
              <SelectTrigger className="w-18" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">
            {rangeStart}–{rangeEnd} of {totalRows}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-8 rounded-md bg-primary px-2 py-1 text-center text-sm font-medium text-primary-foreground">
              {pageIndex + 1}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
