import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { canEditExpense } from "@/lib/permissions";
import { ymd } from "@/lib/expenses";
import { updateExpenseAction } from "@/app/actions/expenses";
import { ExpenseForm } from "@/components/ExpenseForm";
import { PageTitle } from "@/components/Bits";

export const metadata = { title: "Editar nota" };

export default async function EditExpense({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(canEditExpense);
  const { id } = await params;
  const e = await db.expense.findFirst({ where: { id, deletedAt: null } });
  if (!e) notFound();
  const [categories, costCenters, projects] = await Promise.all([
    db.category.findMany({ where: { OR: [{ active: true }, { id: e.categoryId }] }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.costCenter.findMany({ where: { OR: [{ active: true }, { id: e.costCenterId ?? "" }] }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.project.findMany({ where: { OR: [{ active: true }, { id: e.projectId ?? "" }] }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageTitle title="Editar nota" />
      <ExpenseForm
        mode="edit"
        action={updateExpenseAction}
        categories={categories}
        costCenters={costCenters}
        projects={projects}
        today={ymd(new Date())}
        initial={{
          id: e.id, date: ymd(e.date), amount: (e.amountCents / 100).toFixed(2).replace(".", ","), supplier: e.supplier, cnpj: e.cnpj ?? "", nfeKey: e.nfeKey ?? "",
          categoryId: e.categoryId, costCenterId: e.costCenterId ?? "", projectId: e.projectId ?? "", paymentMethod: e.paymentMethod, cardLast4: e.cardLast4 ?? "",
          description: e.description, observation: e.observation ?? "",
        }}
      />
    </>
  );
}
