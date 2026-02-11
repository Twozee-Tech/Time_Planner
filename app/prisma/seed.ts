import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@amplitiv.com" },
    update: {},
    create: {
      name: "Administrator",
      email: "admin@amplitiv.com",
      hashedPassword,
      role: "ADMIN",
    },
  });

  // Create sections
  const serwis = await prisma.section.upsert({
    where: { name: "Serwis" },
    update: {},
    create: { name: "Serwis", sortOrder: 1 },
  });
  const dev = await prisma.section.upsert({
    where: { name: "Dev" },
    update: {},
    create: { name: "Dev", sortOrder: 2 },
  });
  const testerzy = await prisma.section.upsert({
    where: { name: "Testerzy" },
    update: {},
    create: { name: "Testerzy", sortOrder: 3 },
  });

  // Create people (from ludzie.csv)
  const people = [
    { firstName: "Karol", lastName: "Dobosz", sectionId: dev.id, sortOrder: 1 },
    { firstName: "Magdalena", lastName: "Pawłowska", sectionId: testerzy.id, sortOrder: 1 },
    { firstName: "Grzegorz", lastName: "Jasiński", sectionId: dev.id, sortOrder: 2 },
    { firstName: "Marcin", lastName: "Buchcik", sectionId: serwis.id, sortOrder: 1 },
    { firstName: "Marcin", lastName: "Miotk", sectionId: dev.id, sortOrder: 3 },
    { firstName: "Adrian", lastName: "Idzik", sectionId: serwis.id, sortOrder: 2 },
    { firstName: "Maksymilian", lastName: "Złotnicki", sectionId: dev.id, sortOrder: 4 },
    { firstName: "Piotr", lastName: "Papros", sectionId: dev.id, sortOrder: 5 },
    { firstName: "Artur", lastName: "Siębor", sectionId: serwis.id, sortOrder: 3 },
    { firstName: "Franciszek", lastName: "Domański", sectionId: dev.id, sortOrder: 6 },
    { firstName: "Anna", lastName: "Sudyk-Kocór", sectionId: testerzy.id, sortOrder: 2 },
    { firstName: "Małgorzata", lastName: "Domaradzka", sectionId: dev.id, sortOrder: 7 },
    { firstName: "Damian", lastName: "Stokaluk", sectionId: serwis.id, sortOrder: 4 },
    { firstName: "Daniel", lastName: "Sutkowski", sectionId: dev.id, sortOrder: 8 },
    { firstName: "Łukasz", lastName: "Jodłowski", sectionId: dev.id, sortOrder: 9 },
    { firstName: "Dominik", lastName: "Maciąg", sectionId: dev.id, sortOrder: 10 },
    { firstName: "Adam", lastName: "Lasota", sectionId: dev.id, sortOrder: 11 },
    { firstName: "Mateusz", lastName: "Zawiliński", sectionId: dev.id, sortOrder: 12 },
    { firstName: "Michał", lastName: "Skoczek", sectionId: dev.id, sortOrder: 13 },
    { firstName: "Artur", lastName: "Florczak", sectionId: dev.id, sortOrder: 14 },
    { firstName: "Patryk", lastName: "Wojciechowski", sectionId: dev.id, sortOrder: 15 },
  ];

  for (const person of people) {
    const existing = await prisma.person.findFirst({
      where: { firstName: person.firstName, lastName: person.lastName },
    });
    if (!existing) {
      await prisma.person.create({ data: person });
    }
  }

  // Create projects (from projekty.csv)
  const projects = [
    { projectId: "IDSM4205", name: "Project\\Globitel\\SMS_Platform [IDSM4205]", label: "Globitel SMS" },
    { projectId: "IDSM4502", name: "Projekt\\Amplitiv\\Orange SOR&SMSW&CB [IDSM4502]", label: "Orange SOR" },
    { projectId: "IDSM4566", name: "Support\\HT\\HT SOR SMSW\\2026 [IDSM4566]", label: "HT SOR SMSW" },
    { projectId: "IDSM4567", name: "Support\\T-Mobile\\TMPL SOR SMSW\\2026 [IDSM4567]", label: "TMPL SOR SMSW" },
    { projectId: "IDSM4495", name: "Projekt\\TS\\SOR&BS [IDSM4495]", label: "TS SOR&BS" },
    { projectId: "IDSM4180", name: "Projekt\\Ampltiv\\Deutsche_HSOR [IDSM4180]", label: "Deutsche HSOR" },
    { projectId: "IDSM4410", name: "CRy\\T-mobile\\SORSMSW\\2025_2026 [IDSM4410]", label: "TMPL SOR CR" },
    { projectId: "IDSM4548", name: "Support\\Comfone\\SoR_SMSW\\2026 [IDSM4548]", label: "Comfone SoR" },
    { projectId: "IDSM4572", name: "Support\\O2_CZ_SK\\SOR\\2026 [IDSM4572]", label: "O2 CZ/SK" },
    { projectId: "IDSM4472", name: "Projekt\\Globitel\\SMS_Platform\\Retail [IDSM4472]", label: "Globitel Retail" },
    { projectId: "IDSM4509", name: "Projekt\\Reach\\HT SMSW [IDSM4509]", label: "Reach HT SMSW" },
    { projectId: "IDSM4429", name: "Projekt\\Roaming Service Delivery 2025 [IDSM4429]", label: "RSD" },
    { projectId: "IDSM4253", name: "Projekt\\Al Madar\\SOR_SMSW_CC [IDSM4253]", label: "Al Madar" },
    { projectId: "IDSM4554", name: "Projekt\\OINIS\\SOR_RC [IDSM4554]", label: "OINIS SOR" },
    { projectId: "IDSM4261", name: "Projekt\\DT Support [IDSM4261]", label: "DT Support" },
    { projectId: "IDSM4563", name: "Support\\Orange\\RBT\\2026 [IDSM4563]", label: "Orange RBT" },
    { projectId: "IDSM4573", name: "Support\\Yettel\\SOR_SMSW\\2026 [IDSM4573]", label: "Yettel SOR" },
    { projectId: "IDSM4568", name: "Support\\Telekom-Slovenia\\TS SOR\\2026 [IDSM4568]", label: "TS SOR" },
    { projectId: "IDSM4571", name: "Support\\Nova\\SOR\\2026 [IDSM4571]", label: "Nova SOR" },
    { projectId: "IDSM4501", name: "Support\\TMPL\\RBT\\VM\\2025-2026 [IDSM4501]", label: "TMPL RBT VM" },
    { projectId: "IDSM4569", name: "Support\\DT\\DT-ENT\\2026 [IDSM4569]", label: "DT ENT" },
    { projectId: "IDSM4250", name: "Projekt\\Amplitiv\\Telekom Romania_USSD GW [IDSM4250]", label: "TR USSD GW" },
    { projectId: "IDSM4427", name: "CRy\\Comfone\\SORSMSW\\2025_2026 [IDSM4427]", label: "Comfone CR" },
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { projectId: project.projectId },
      update: {},
      create: project,
    });
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
