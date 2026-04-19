import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const password = await bcrypt.hash("password123", 12);

  const company = await prisma.company.create({
    data: {
      name: "Ma Société SPRL",
      email: "contact@masociete.be",
      phone: "+32 2 000 00 00",
      address: "Rue de la Loi 1",
      city: "Bruxelles",
      postalCode: "1000",
      country: "Belgique",
      vatNumber: "BE 0000.000.000",
      iban: "BE00 0000 0000 0000",
      bic: "GEBABEBB",
      quotePrefix: "DEV",
      invoicePrefix: "FAC",
      nextQuoteNumber: 2,
      nextInvoiceNumber: 1,
    },
  });

  await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@masociete.be",
      password,
      role: "ADMIN",
      companyId: company.id,
    },
  });

  const client1 = await prisma.client.create({
    data: {
      type: "COMPANY",
      name: "Tech Solutions SA",
      email: "info@techsolutions.be",
      phone: "+32 2 111 11 11",
      address: "Avenue Louise 100",
      city: "Bruxelles",
      postalCode: "1050",
      country: "Belgique",
      vatNumber: "BE 0123.456.789",
      status: "ACTIVE",
      companyId: company.id,
    },
  });

  await prisma.client.create({
    data: {
      type: "COMPANY",
      name: "Dupont & Associés",
      email: "contact@dupont.be",
      phone: "+32 4 222 22 22",
      city: "Liège",
      postalCode: "4000",
      status: "PROSPECT",
      companyId: company.id,
    },
  });

  await prisma.product.create({
    data: {
      reference: "DEV-001",
      name: "Développement web",
      description: "Développement de site web ou application",
      unitPrice: 85,
      unit: "heure",
      vatRate: 21,
      category: "Services",
      companyId: company.id,
    },
  });

  await prisma.product.create({
    data: {
      reference: "CONS-001",
      name: "Consultation",
      unitPrice: 120,
      unit: "heure",
      vatRate: 21,
      category: "Services",
      companyId: company.id,
    },
  });

  const defaultTemplate = await prisma.quoteTemplate.create({
    data: {
      name: "Template Standard",
      isDefault: true,
      color: "#2563eb",
      font: "Helvetica",
      showBank: true,
      autoConditions: false,
      vatRates: "6,12,21",
      paymentMethods: "VIREMENT,CHEQUE,CARTE,ESPECES",
      units: "heure,jour,unité,forfait,m²,kg,litre,mois",
      categories: "Services,Produits,Logiciels,Matériaux,Autres",
      validityDays: 30,
      currency: "EUR",
      language: "fr-BE",
      companyId: company.id,
    },
  });

  await prisma.quote.create({
    data: {
      number: "DEV-001",
      status: "ACCEPTED",
      title: "Refonte site web",
      clientId: client1.id,
      companyId: company.id,
      templateId: defaultTemplate.id,
      issueDate: new Date("2026-03-01"),
      validUntil: new Date("2026-04-01"),
      subtotal: 4250,
      vatAmount: 892.5,
      total: 5142.5,
      items: {
        create: [
          { description: "Développement front-end", quantity: 40, unitPrice: 85, vatRate: 21, discount: 0, total: 4114, sortOrder: 0 },
          { description: "Développement back-end", quantity: 10, unitPrice: 85, vatRate: 21, discount: 0, total: 1028.5, sortOrder: 1 },
        ],
      },
    },
  });

  await prisma.deal.create({
    data: {
      title: "Nouveau projet e-commerce",
      clientId: client1.id,
      value: 12000,
      stage: "PROPOSITION",
      probability: 60,
      notes: "Client intéressé, en attente de validation budget",
    },
  });

  console.log("✅ Seed terminé !");
  console.log("📧 admin@masociete.be / password123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
