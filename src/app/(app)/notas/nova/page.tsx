import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { createExpenseAction } from "@/app/actions/expenses";
import { ExpenseForm } from "@/components/ExpenseForm";
import { PageTitle } from "@/components/Bits";

export const metadata = { title: "Nova nota" };

export default async function NewExpense() {
  await requireUser();
  const [categories, costCenters, projects] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.costCenter.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.project.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageTitle title="Lançar nota do cartão" />
      <ExpenseForm mode="create" action={createExpenseAction} categories={categories} costCenters={costCenters} projects={projects} today={new Date().toISOString().slice(0, 10)} />
    </>
  );
}
