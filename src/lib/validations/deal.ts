import { z } from "zod";

export const dealSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  clientId: z.string().min(1, "Le client est requis"),
  value: z.number().min(0).default(0),
  stage: z
    .enum(["PROSPECTION", "QUALIFICATION", "PROPOSITION", "NEGOCIATION", "GAGNE", "PERDU"])
    .default("PROSPECTION"),
  probability: z.number().min(0).max(100).default(20),
  expectedAt: z.string().optional(),
  notes: z.string().optional(),
});

export type DealInput = z.infer<typeof dealSchema>;
