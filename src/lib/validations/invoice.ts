import { z } from "zod";

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "La description est requise"),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  vatRate: z.number().min(0).max(100).default(21),
  discount: z.number().min(0).max(100).default(0),
  total: z.number().default(0),
  sortOrder: z.number().default(0),
  productId: z.string().optional(),
});

export const invoiceSchema = z.object({
  title: z.string().optional(),
  clientId: z.string().min(1, "Le client est requis"),
  quoteId: z.string().optional(),
  issueDate: z.string().min(1, "La date est requise"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  conditions: z.string().optional(),
  discount: z.number().min(0).default(0),
  discountType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  items: z.array(invoiceItemSchema).min(1, "Au moins un article est requis"),
});

export const paymentSchema = z.object({
  amount: z.number().positive("Le montant doit être positif"),
  method: z.enum(["VIREMENT", "CHEQUE", "ESPECES", "CARTE", "AUTRE"]).default("VIREMENT"),
  reference: z.string().optional(),
  date: z.string().min(1, "La date est requise"),
  notes: z.string().optional(),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
