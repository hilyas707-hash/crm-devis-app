import { z } from "zod";

export const quoteItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "La description est requise"),
  quantity: z.number().positive("La quantité doit être positive"),
  unitPrice: z.number().min(0, "Le prix doit être positif"),
  vatRate: z.number().min(0).max(100).default(21),
  discount: z.number().min(0).max(100).default(0),
  total: z.number().default(0),
  sortOrder: z.number().default(0),
  productId: z.string().optional(),
});

export const quoteSchema = z.object({
  title: z.string().optional(),
  clientId: z.string().min(1, "Le client est requis"),
  issueDate: z.string().min(1, "La date est requise"),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  conditions: z.string().optional(),
  discount: z.number().min(0).default(0),
  discountType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  items: z.array(quoteItemSchema).min(1, "Au moins un article est requis"),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
