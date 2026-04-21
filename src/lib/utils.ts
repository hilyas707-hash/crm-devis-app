import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateInput(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

export function calculateItemTotal(
  quantity: number,
  unitPrice: number,
  discount: number,
  vatRate: number
): { subtotal: number; vatAmount: number; total: number } {
  const subtotal = quantity * unitPrice * (1 - discount / 100);
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;
  return { subtotal, vatAmount, total };
}

export function calculateDocumentTotals(
  items: { quantity: number; unitPrice: number; discount: number; vatRate: number; type?: string }[],
  documentDiscount: number,
  documentDiscountType: "PERCENT" | "FIXED"
): { subtotal: number; vatAmount: number; discount: number; total: number } {
  const lines = items.filter((i) => !i.type || i.type === "LINE");
  const subtotal = lines.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (1 - item.discount / 100),
    0
  );
  const vatAmount = lines.reduce((sum, item) => {
    const base = item.quantity * item.unitPrice * (1 - item.discount / 100);
    return sum + base * (item.vatRate / 100);
  }, 0);

  const discountAmount =
    documentDiscountType === "PERCENT"
      ? (subtotal * documentDiscount) / 100
      : documentDiscount;

  const total = subtotal + vatAmount - discountAmount;
  return { subtotal, vatAmount, discount: discountAmount, total };
}

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  INVOICED: "Facturé",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  PARTIAL: "Partiel",
  PAID: "Payé",
  OVERDUE: "En retard",
};

export const DEAL_STAGE_LABELS: Record<string, string> = {
  PROSPECTION: "Prospection",
  QUALIFICATION: "Qualification",
  PROPOSITION: "Proposition",
  NEGOCIATION: "Négociation",
  GAGNE: "Gagné",
  PERDU: "Perdu",
};

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  PROSPECT: "Prospect",
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CALL: "Appel",
  EMAIL: "Email",
  MEETING: "Réunion",
  TASK: "Tâche",
  NOTE: "Note",
};
