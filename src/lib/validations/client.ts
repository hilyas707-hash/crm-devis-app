import { z } from "zod";

export const clientSchema = z.object({
  type: z.enum(["COMPANY", "INDIVIDUAL"]).default("COMPANY"),
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("Belgique"),
  vatNumber: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["PROSPECT", "ACTIVE", "INACTIVE"]).default("PROSPECT"),
});

export const contactSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  position: z.string().optional(),
  notes: z.string().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
