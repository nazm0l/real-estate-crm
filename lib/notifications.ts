import { addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { startOfToday } from "@/lib/payment-status";

export type NotificationsPayload = {
  followUps: { items: { id: string; name: string; nextFollowUpAt: string }[]; count: number } | null;
  visits: { items: { id: string; leadId: string; leadName: string; scheduledAt: string; location: string }[]; count: number } | null;
  payments: { items: { id: string; leadId: string; leadName: string; amount: number; dueDate: string }[]; count: number } | null;
  totalCount: number;
};

export async function getNotifications(
  tenantId: string,
  roleId: string
): Promise<NotificationsPayload> {
  const [canViewLeads, canViewVisits, canViewPayments] = await Promise.all([
    hasPermission(roleId, PERMISSIONS.LEADS_VIEW),
    hasPermission(roleId, PERMISSIONS.VISITS_VIEW),
    hasPermission(roleId, PERMISSIONS.PAYMENTS_VIEW),
  ]);

  const now = new Date();
  const todayStart = startOfToday();

  const [followUpsRaw, followUpCount, visitsRaw, visitCount, paymentsRaw, paymentCount] =
    await Promise.all([
      canViewLeads
        ? prisma.lead.findMany({
            // MongoDB matches null on lt filters — exclude explicitly
            where: { tenantId, nextFollowUpAt: { lt: now, not: null } },
            orderBy: { nextFollowUpAt: "asc" },
            take: 5,
            select: { id: true, name: true, nextFollowUpAt: true },
          })
        : null,
      canViewLeads
        ? prisma.lead.count({
            where: { tenantId, nextFollowUpAt: { lt: now, not: null } },
          })
        : 0,
      canViewVisits
        ? prisma.siteVisit.findMany({
            where: {
              tenantId,
              status: "SCHEDULED",
              scheduledAt: { gte: todayStart, lt: addDays(todayStart, 1) },
            },
            orderBy: { scheduledAt: "asc" },
            take: 5,
            select: {
              id: true,
              scheduledAt: true,
              location: true,
              lead: { select: { id: true, name: true } },
            },
          })
        : null,
      canViewVisits
        ? prisma.siteVisit.count({
            where: {
              tenantId,
              status: "SCHEDULED",
              scheduledAt: { gte: todayStart, lt: addDays(todayStart, 1) },
            },
          })
        : 0,
      canViewPayments
        ? prisma.payment.findMany({
            where: { tenantId, status: "PENDING", dueDate: { lt: todayStart } },
            orderBy: { dueDate: "asc" },
            take: 5,
            select: {
              id: true,
              amount: true,
              dueDate: true,
              lead: { select: { id: true, name: true } },
            },
          })
        : null,
      canViewPayments
        ? prisma.payment.count({
            where: { tenantId, status: "PENDING", dueDate: { lt: todayStart } },
          })
        : 0,
    ]);

  const followUps = followUpsRaw
    ? {
        items: followUpsRaw.map((l) => ({
          id: l.id,
          name: l.name,
          nextFollowUpAt: l.nextFollowUpAt!.toISOString(),
        })),
        count: followUpCount,
      }
    : null;

  const visits = visitsRaw
    ? {
        items: visitsRaw.map((v) => ({
          id: v.id,
          leadId: v.lead.id,
          leadName: v.lead.name,
          scheduledAt: v.scheduledAt.toISOString(),
          location: v.location,
        })),
        count: visitCount,
      }
    : null;

  const payments = paymentsRaw
    ? {
        items: paymentsRaw.map((p) => ({
          id: p.id,
          leadId: p.lead.id,
          leadName: p.lead.name,
          amount: p.amount,
          dueDate: p.dueDate.toISOString(),
        })),
        count: paymentCount,
      }
    : null;

  return {
    followUps,
    visits,
    payments,
    totalCount: (followUps?.count ?? 0) + (visits?.count ?? 0) + (payments?.count ?? 0),
  };
}
