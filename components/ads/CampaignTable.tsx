"use client"

import { formatDistanceToNow } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatBDT } from "@/lib/format-bdt"

type Campaign = {
  id: string
  name: string
  spendBdt: number
  impressions: number
  clicks: number
  leadsCount: number
  syncedAt: Date
}

export function CampaignTable({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) return null

  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">Impressions</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">CPL</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">Synced</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((c) => {
            const ctr =
              c.impressions > 0
                ? ((c.clicks / c.impressions) * 100).toFixed(2) + "%"
                : "—"
            const cpl =
              c.leadsCount > 0 ? formatBDT(c.spendBdt / c.leadsCount) : "—"
            const synced = formatDistanceToNow(new Date(c.syncedAt), {
              addSuffix: true,
            })
            return (
              <TableRow key={c.id}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {c.name}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBDT(c.spendBdt)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.impressions.toLocaleString("en-BD")}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.clicks.toLocaleString("en-BD")}
                </TableCell>
                <TableCell className="text-right tabular-nums">{ctr}</TableCell>
                <TableCell className="text-right tabular-nums">{cpl}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.leadsCount}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                  {synced}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
