import { db } from "../src/lib/db";
import { createUser, UserInputError } from "../src/lib/users";
import { checkPassword } from "../src/lib/validators";

const CATEGORIES = ["Alimentação", "Combustível", "Hospedagem", "Transporte", "Material de escritório", "Software e assinaturas", "Manutenção", "Viagem", "Outros"];
const SECTORS = ["Administrativo", "Financeiro", "Comercial", "Operações", "Tecnologia"];

async function main() {
  for (const name of CATEGORIES) await db.category.upsert({ where: { name }, create: { name }, update: {} });
  for (const name of SECTORS) await db.sector.upsert({ where: { name }, create: { name }, update: {} });
  await db.costCenter.upsert({ where: { name: "Geral" }, create: { name: "Geral", code: "000" }, update: {} });

  const { SEED_ADMIN_NAME, SEED_ADMIN_CPF, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;
  if (!SEED_ADMIN_CPF || !SEED_ADMIN_PASSWORD || !SEED_ADMIN_EMAIL) {
    console.log("Catálogos criados. Defina SEED_ADMIN_CPF, SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD para criar o administrador.");
    return;
  }
  const pw = checkPassword(SEED_ADMIN_PASSWORD);
  if (!pw.ok) throw new Error(`SEED_ADMIN_PASSWORD fraca: ${pw.problems.join(", ")}`);
  try {
    await createUser({
      name: SEED_ADMIN_NAME || "Administrador",
      cpf: SEED_ADMIN_CPF,
      email: SEED_ADMIN_EMAIL,
      password: SEED_ADMIN_PASSWORD,
      role: "ADMIN",
      mustChangePassword: true,
    });
    console.log("Administrador criado. No primeiro acesso será exigida a troca de senha.");
  } catch (e) {
    if (e instanceof UserInputError) console.log(`Administrador não criado: ${e.message}`);
    else throw e;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
