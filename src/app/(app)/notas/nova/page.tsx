import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getRules } from "@/lib/settings";
import { backdateMinDate } from "@/lib/settings-schema";
import { createExpenseAction } from "@/app/actions/expenses";
import { ExpenseForm } from "@/components/ExpenseForm";
import { PageTitle } from "@/components/Bits";

export const metadata = { title: "Nova nota" };

export default async function NewExpense() {
  const u = await requireUser();
  const rules = await getRules();
  const todayIso = new Date().toISOString().slice(0, 10);
  const cards = await db.card.findMany({ where: { holderId: u.id, active: true }, orderBy: { label: "asc" }, select: { id: true, label: true, last4: true } });
  const [categories, costCenters, projects] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.costCenter.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.project.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageTitle title="Lançar nota do cartão" subtitle="Anexe a nota, confira os dados e salve" />
      <ExpenseForm mode="create" action={createExpenseAction} categories={categories} costCenters={costCenters} projects={projects} today={todayIso} cards={cards} rules={{ requireAttachment: rules.requireAttachment, requireCnpj: rules.requireCnpj, requireCostCenter: rules.requireCostCenter, requireProject: rules.requireProject, minDate: backdateMinDate(todayIso, rules.maxBackdateDays) }} />
    </>
  );
}
