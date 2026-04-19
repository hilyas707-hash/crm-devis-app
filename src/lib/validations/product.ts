import { z } from "zod";

export const productSchema = z.object({
  reference: z.string().optional(),
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  unitPrice: z.number().min(0, "Le prix doit être positif"),
  unit: z.string().default("unité"),
  vatRate: z.number().min(0).max(100).default(21),
  category: z.string().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
