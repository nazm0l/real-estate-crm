import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { PaymentsView } from "@/components/payments/PaymentsView";

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await hasPermission(session.user.roleId, PERMISSIONS.PAYMENTS_VIEW))) redirect("/");

  const [payments, canMarkPaid, canDelete] = await Promise.all([
    prisma.payment.findMany({
      where: { tenantId: session.user.tenantId },
      select: {
        id: true,
        type: true,
        amount: true,
        dueDate: true,
        paidDate: true,
        status: true,
        method: true,
        reference: true,
        note: true,
        lead: { select: { id: true, name: true } },
        property: { select: { id: true, title: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    hasPermission(session.user.roleId, PERMISSIONS.PAYMENTS_MARK_PAID),
    hasPermission(session.user.roleId, PERMISSIONS.PAYMENTS_DELETE),
  ]);

  const initialPayments = payments.map((payment) => ({
    ...payment,
    dueDate: payment.dueDate.toISOString(),
    paidDate: payment.paidDate ? payment.paidDate.toISOString() : null,
  }));

  return (
    <PaymentsView initialPayments={initialPayments} canMarkPaid={canMarkPaid} canDelete={canDelete} />
  );
}
