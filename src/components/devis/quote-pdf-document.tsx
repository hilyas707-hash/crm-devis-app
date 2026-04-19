import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  INVOICED: "Facturé",
};

function fmt(amount: number) {
  return `${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f")} \u20ac`;
}

function fmtDate(date: string | Date | null | undefined) {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export interface QuoteTemplate {
  color: string;
  font: string;
  logo: string | null;
  footer: string | null;
  showBank: boolean;
}

export interface QuotePDFData {
  number: string;
  title?: string | null;
  status: string;
  issueDate: Date | string;
  validUntil?: Date | string | null;
  notes?: string | null;
  conditions?: string | null;
  subtotal: number;
  vatAmount: number;
  discount: number;
  total: number;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    discount: number;
    total: number;
  }[];
  client: {
    name: string;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    email?: string | null;
    vatNumber?: string | null;
  };
  company: {
    name: string;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    phone?: string | null;
    email?: string | null;
    vatNumber?: string | null;
    iban?: string | null;
    bic?: string | null;
    website?: string | null;
  };
}

function makeStyles(tpl: QuoteTemplate) {
  const boldFont =
    tpl.font === "Times-Roman"
      ? "Times-Bold"
      : tpl.font === "Courier"
      ? "Courier-Bold"
      : "Helvetica-Bold";

  return StyleSheet.create({
    page: { fontFamily: tpl.font, fontSize: 10, color: "#1e293b", padding: 40, paddingBottom: 60 },
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
    logoImg: { height: 48, maxWidth: 160, objectFit: "contain", marginBottom: 6 },
    companyName: { fontSize: 16, fontFamily: boldFont, color: tpl.color },
    companyInfo: { fontSize: 9, color: "#64748b", marginTop: 2 },
    docTitle: { fontSize: 24, fontFamily: boldFont, color: "#1e293b" },
    docNumber: { fontSize: 13, color: tpl.color, marginTop: 3 },
    docSub: { fontSize: 9, color: "#64748b", marginTop: 4 },
    badge: {
      marginTop: 6, alignSelf: "flex-end",
      backgroundColor: tpl.color + "22",
      color: tpl.color,
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 4, fontSize: 9, fontFamily: boldFont,
    },
    infoGrid: { flexDirection: "row", gap: 14, marginBottom: 20 },
    infoBox: {
      flex: 1, backgroundColor: "#f8fafc", borderRadius: 6,
      padding: 12, border: "1px solid #e2e8f0",
    },
    infoLabel: { fontSize: 8, color: "#94a3b8", marginBottom: 3, fontFamily: boldFont, textTransform: "uppercase" },
    infoValue: { fontSize: 10, fontFamily: boldFont },
    infoSub: { fontSize: 9, color: "#64748b", marginTop: 1 },
    tableHeader: {
      flexDirection: "row", backgroundColor: tpl.color,
      color: "#fff", padding: "8 6", borderRadius: 4, marginBottom: 1,
    },
    tableRow: { flexDirection: "row", padding: "7 6", borderBottom: "1px solid #f1f5f9" },
    tableRowEven: { backgroundColor: "#f8fafc" },
    thText: { fontSize: 8, fontFamily: boldFont, color: "#fff" },
    tdText: { fontSize: 9 },
    colDesc: { flex: 3 },
    colQty: { flex: 1, textAlign: "right" },
    colPrice: { flex: 1.5, textAlign: "right" },
    colVat: { flex: 1, textAlign: "right" },
    colDisc: { flex: 1, textAlign: "right" },
    colTotal: { flex: 1.5, textAlign: "right" },
    totalsBox: { alignSelf: "flex-end", width: 230, marginTop: 14 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
    totalLabel: { fontSize: 9, color: "#64748b" },
    totalValue: { fontSize: 9 },
    totalFinalRow: {
      flexDirection: "row", justifyContent: "space-between",
      paddingVertical: 7, borderTop: `2px solid ${tpl.color}`, marginTop: 4,
    },
    totalFinalLabel: { fontSize: 12, fontFamily: boldFont },
    totalFinalValue: { fontSize: 12, fontFamily: boldFont, color: tpl.color },
    notesSection: { marginTop: 20, flexDirection: "row", gap: 12 },
    notesBox: {
      flex: 1, backgroundColor: "#f8fafc", borderRadius: 6,
      padding: 10, border: "1px solid #e2e8f0",
    },
    notesLabel: { fontSize: 8, fontFamily: boldFont, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 },
    notesText: { fontSize: 9, color: "#475569", lineHeight: 1.5 },
    bankBox: { marginTop: 16, backgroundColor: tpl.color + "11", borderRadius: 6, padding: 10, border: `1px solid ${tpl.color}33` },
    bankLabel: { fontSize: 8, fontFamily: boldFont, color: tpl.color, textTransform: "uppercase", marginBottom: 3 },
    bankText: { fontSize: 9, color: "#0c4a6e" },
    footer: {
      position: "absolute", bottom: 20, left: 40, right: 40,
      borderTop: "1px solid #e2e8f0", paddingTop: 7,
      flexDirection: "row", justifyContent: "space-between",
    },
    footerText: { fontSize: 8, color: "#94a3b8" },
  });
}

export function QuotePDFDocument({ data, template, docType = "DEVIS" }: { data: QuotePDFData; template: QuoteTemplate; docType?: string }) {
  const s = makeStyles(template);
  const boldFont =
    template.font === "Times-Roman"
      ? "Times-Bold"
      : template.font === "Courier"
      ? "Courier-Bold"
      : "Helvetica-Bold";

  const footerText =
    template.footer ||
    `${data.company.name}${data.company.vatNumber ? " \u2014 TVA: " + data.company.vatNumber : ""}`;

  return (
    <Document title={`${docType} ${data.number}`} author={data.company.name}>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            {template.logo ? (
              <Image style={s.logoImg} src={template.logo} />
            ) : null}
            <Text style={s.companyName}>{data.company.name}</Text>
            {data.company.address && <Text style={s.companyInfo}>{data.company.address}</Text>}
            {data.company.city && (
              <Text style={s.companyInfo}>{data.company.postalCode} {data.company.city}</Text>
            )}
            {data.company.phone && <Text style={s.companyInfo}>Tél : {data.company.phone}</Text>}
            {data.company.email && <Text style={s.companyInfo}>{data.company.email}</Text>}
            {data.company.vatNumber && <Text style={s.companyInfo}>TVA : {data.company.vatNumber}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTitle}>{docType}</Text>
            <Text style={s.docNumber}>{data.number}</Text>
            {data.title && <Text style={s.docSub}>{data.title}</Text>}
            <View style={s.badge}>
              <Text>{STATUS_LABELS[data.status] || data.status}</Text>
            </View>
          </View>
        </View>

        {/* Info boxes */}
        <View style={s.infoGrid}>
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Client</Text>
            <Text style={s.infoValue}>{data.client.name}</Text>
            {data.client.address && <Text style={s.infoSub}>{data.client.address}</Text>}
            {data.client.city && (
              <Text style={s.infoSub}>{data.client.postalCode} {data.client.city}</Text>
            )}
            {data.client.email && <Text style={s.infoSub}>{data.client.email}</Text>}
            {data.client.vatNumber && <Text style={s.infoSub}>TVA : {data.client.vatNumber}</Text>}
          </View>
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Date d'émission</Text>
            <Text style={s.infoValue}>{fmtDate(data.issueDate)}</Text>
            {data.validUntil && (
              <>
                <Text style={[s.infoLabel, { marginTop: 8 }]}>Valable jusqu'au</Text>
                <Text style={s.infoValue}>{fmtDate(data.validUntil)}</Text>
              </>
            )}
          </View>
        </View>

        {/* Table */}
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.colDesc]}>Description</Text>
          <Text style={[s.thText, s.colQty]}>Qté</Text>
          <Text style={[s.thText, s.colPrice]}>Prix HT</Text>
          <Text style={[s.thText, s.colVat]}>TVA</Text>
          <Text style={[s.thText, s.colDisc]}>Rem.</Text>
          <Text style={[s.thText, s.colTotal]}>Total TTC</Text>
        </View>

        {data.items.map((item, idx) => (
          <View key={idx} style={[s.tableRow, idx % 2 === 1 ? s.tableRowEven : {}]}>
            <Text style={[s.tdText, s.colDesc]}>{item.description}</Text>
            <Text style={[s.tdText, s.colQty]}>{item.quantity}</Text>
            <Text style={[s.tdText, s.colPrice]}>{fmt(item.unitPrice)}</Text>
            <Text style={[s.tdText, s.colVat]}>{item.vatRate}%</Text>
            <Text style={[s.tdText, s.colDisc]}>{item.discount > 0 ? `${item.discount}%` : "\u2014"}</Text>
            <Text style={[s.tdText, s.colTotal, { fontFamily: boldFont }]}>{fmt(item.total)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsBox}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Sous-total HT</Text>
            <Text style={s.totalValue}>{fmt(data.subtotal)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TVA</Text>
            <Text style={s.totalValue}>{fmt(data.vatAmount)}</Text>
          </View>
          {data.discount > 0 && (
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { color: "#dc2626" }]}>Remise</Text>
              <Text style={[s.totalValue, { color: "#dc2626" }]}>-{fmt(data.discount)}</Text>
            </View>
          )}
          <View style={s.totalFinalRow}>
            <Text style={s.totalFinalLabel}>Total TTC</Text>
            <Text style={s.totalFinalValue}>{fmt(data.total)}</Text>
          </View>
        </View>

        {/* Notes / Conditions */}
        {(data.notes || data.conditions) && (
          <View style={s.notesSection}>
            {data.notes && (
              <View style={s.notesBox}>
                <Text style={s.notesLabel}>Notes</Text>
                <Text style={s.notesText}>{data.notes}</Text>
              </View>
            )}
            {data.conditions && (
              <View style={s.notesBox}>
                <Text style={s.notesLabel}>Conditions de vente</Text>
                <Text style={s.notesText}>{data.conditions}</Text>
              </View>
            )}
          </View>
        )}

        {/* Banking info */}
        {template.showBank && (data.company.iban || data.company.bic) && (
          <View style={s.bankBox}>
            <Text style={s.bankLabel}>Coordonnées bancaires</Text>
            {data.company.iban && <Text style={s.bankText}>IBAN : {data.company.iban}</Text>}
            {data.company.bic && <Text style={s.bankText}>BIC : {data.company.bic}</Text>}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{footerText}</Text>
          <Text style={s.footerText}>{docType} {data.number}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
