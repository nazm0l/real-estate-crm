"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatUSD } from "@/lib/format-usd"

export type CampaignRow = {
  campaignId: string
  name: string
  endDate: string | null
  spend: number
  impressions: number
  resultType: string
  resultCount: number
}

export function CampaignTable({ campaigns }: { campaigns: CampaignRow[] }) {
  if (campaigns.length === 0) return null

  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead className="text-right">Result</TableHead>
            <TableHead className="text-right">Amount spent</TableHead>
            <TableHead className="text-right">Cost per result</TableHead>
            <TableHead className="text-right">Impressions</TableHead>
            <TableHead className="text-right">Ends</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((c) => {
            const costPerResult =
              c.resultCount > 0 ? formatUSD(c.spend / c.resultCount) : "—"
            const ends = c.endDate
              ? new Date(c.endDate).toLocaleDateString("en-BD", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "Ongoing"

            return (
              <TableRow key={c.campaignId}>
                <TableCell className="font-medium max-w-[220px] truncate">
                  {c.name}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <div>{c.resultCount.toLocaleString("en-BD")}</div>
                  <div className="text-xs text-muted-foreground">{c.resultType}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUSD(c.spend)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{costPerResult}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.impressions.toLocaleString("en-BD")}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                  {ends}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
