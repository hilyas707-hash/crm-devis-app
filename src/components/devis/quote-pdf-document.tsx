import {
  Document, Page, Text, View, Image, StyleSheet, Line, Svg,
} from "@react-pdf/renderer";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon", SENT: "Envoyé", ACCEPTED: "Accepté",
  REJECTED: "Refusé", INVOICED: "Facturé",
};

function fmt(n: number) {
  return `${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f")} €`;
}
function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface QuoteTemplate {
  color: string;
  font: string;
  logo: string | null;
  footer: string | null;
  showBank: boolean;
  headerImage?: string | null;
  footerImage?: string | null;
  attachments?: string | null;
}

export interface QuotePDFData {
  number: string;
  title?: string | null;
  clientRef?: string | null;
  status: string;
  issueDate: Date | string;
  validUntil?: Date | string | null;
  notes?: string | null;
  conditions?: string | null;
  subtotal: number;
  vatAmount: number;
  discount: number;
  discountType?: string;
  total: number;
  items: {
    description: string;
    notes?: string | null;
    quantity: number;
    unit?: string | null;
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

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(tpl: QuoteTemplate) {
  const bold = tpl.font === "Times-Roman" ? "Times-Bold" : tpl.font === "Courier" ? "Courier-Bold" : "Helvetica-Bold";
  const c = tpl.color;
  const hasHeaderImg = !!tpl.headerImage;
  const hasFooterImg = !!tpl.footerImage;

  return StyleSheet.create({
    page: {
      fontFamily: tpl.font, fontSize: 9.5, color: "#1a2035",
      paddingTop: hasHeaderImg ? 0 : 0,
      paddingBottom: hasFooterImg ? 86 : 52,
      paddingHorizontal: 0,
      backgroundColor: "#ffffff",
    },

    // ── Bannière image (overlay) ──
    headerBanner: { position: "relative", height: 120, marginBottom: 0 },
    headerBannerImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", objectFit: "cover" },
    headerBannerDim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.42)" },
    headerBannerContent: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingHorizontal: 36, paddingVertical: 14,
    },
    bannerLogo: { height: 44, maxWidth: 140, objectFit: "contain", marginBottom: 6 },
    bannerCompanyName: { fontSize: 16, fontFamily: bold, color: "#fff" },
    bannerInfo: { fontSize: 8, color: "rgba(255,255,255,0.82)", marginTop: 2 },
    bannerDocType: { fontSize: 28, fontFamily: bold, color: "#fff", textAlign: "right" },
    bannerDocRef: { fontSize: 12, color: "rgba(255,255,255,0.88)", marginTop: 2, textAlign: "right" },
    bannerDocSub: { fontSize: 8.5, color: "rgba(255,255,255,0.70)", marginTop: 3, textAlign: "right" },
    bannerBadge: {
      marginTop: 7, alignSelf: "flex-end",
      backgroundColor: "rgba(255,255,255,0.22)", color: "#fff",
      paddingHorizontal: 10, paddingVertical: 3,
      borderRadius: 3, fontSize: 8.5, fontFamily: bold,
    },

    // ── Entête classique (sans image) ──
    classicHeader: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
      paddingHorizontal: 36, paddingTop: 32, paddingBottom: 20,
      borderBottom: `3px solid ${c}`,
    },
    classicLeft: { flex: 1 },
    classicRight: { alignItems: "flex-end" },
    logoImg: { height: 52, maxWidth: 170, objectFit: "contain", marginBottom: 8 },
    companyName: { fontSize: 14, fontFamily: bold, color: c, marginBottom: 3 },
    companyInfo: { fontSize: 8, color: "#64748b", lineHeight: 1.5 },
    docType: { fontSize: 30, fontFamily: bold, color: c, marginBottom: 4 },
    docRef: { fontSize: 11, color: "#334155", fontFamily: bold, marginBottom: 3 },
    docSub: { fontSize: 8.5, color: "#64748b", marginBottom: 3 },
    statusBadge: {
      alignSelf: "flex-end", marginTop: 4,
      backgroundColor: c + "18", color: c,
      paddingHorizontal: 10, paddingVertical: 3,
      borderRadius: 3, fontSize: 8.5, fontFamily: bold,
    },

    // ── Bande méta (date, validité, réf) sous l'entête ──
    metaBand: {
      flexDirection: "row", gap: 0,
      backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0",
      paddingHorizontal: 36, paddingVertical: 9,
    },
    metaItem: { flex: 1, borderRight: "1px solid #e2e8f0", paddingRight: 14, marginRight: 14 },
    metaItemLast: { flex: 1 },
    metaLabel: { fontSize: 7.5, color: "#94a3b8", fontFamily: bold, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    metaValue: { fontSize: 9.5, color: "#1e293b", fontFamily: bold },

    // ── Blocs adresses (émetteur / destinataire) ──
    addrSection: {
      flexDirection: "row", gap: 0,
      paddingHorizontal: 36, paddingVertical: 18,
      borderBottom: "1px solid #e2e8f0",
    },
    addrFrom: { flex: 1, paddingRight: 20 },
    addrTo: {
      flex: 1.2, paddingLeft: 18, paddingVertical: 10, paddingRight: 14,
      backgroundColor: c + "08",
      borderLeft: `3px solid ${c}`,
      borderRadius: 2,
    },
    addrSectionLabel: {
      fontSize: 7.5, fontFamily: bold, color: c,
      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6,
    },
    addrName: { fontSize: 11, fontFamily: bold, color: "#0f172a", marginBottom: 3 },
    addrLine: { fontSize: 8.5, color: "#475569", lineHeight: 1.55 },

    // ── Contenu principal ──
    body: { paddingHorizontal: 36, paddingTop: 20 },

    // ── Titre de l'offre (objet) ──
    offerTitle: {
      fontSize: 11, fontFamily: bold, color: "#1e293b",
      marginBottom: 16, paddingBottom: 8,
      borderBottom: `1px solid ${c}40`,
    },

    // ── Tableau ──
    tableWrap: { marginBottom: 0 },
    tableHead: {
      flexDirection: "row",
      backgroundColor: c,
      borderRadius: 3,
      paddingVertical: 7, paddingHorizontal: 6,
      marginBottom: 0,
    },
    thText: { fontSize: 7.5, fontFamily: bold, color: "#fff", textTransform: "uppercase", letterSpacing: 0.3 },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 7, paddingHorizontal: 6,
      borderBottom: "0.5px solid #e8edf4",
    },
    tableRowAlt: { backgroundColor: "#f9fbff" },
    tdDesc: { fontSize: 9, color: "#1e293b" },
    tdNotes: { fontSize: 7.5, color: "#64748b", fontStyle: "italic", marginTop: 2, lineHeight: 1.4 },
    tdText: { fontSize: 9, color: "#334155" },
    tdBold: { fontSize: 9, fontFamily: bold, color: "#0f172a" },

    // Colonnes
    cDesc: { flex: 3.2 },
    cQty: { flex: 0.7, textAlign: "right" },
    cUnit: { flex: 0.9, textAlign: "left", paddingLeft: 6 },
    cPrice: { flex: 1.3, textAlign: "right" },
    cVat: { flex: 0.75, textAlign: "right" },
    cDisc: { flex: 0.75, textAlign: "right" },
    cTotal: { flex: 1.4, textAlign: "right" },

    // ── Totaux ──
    totalsOuter: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, marginBottom: 0 },
    totalsBox: { width: 220 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3.5, paddingHorizontal: 8 },
    totalLabel: { fontSize: 8.5, color: "#64748b" },
    totalValue: { fontSize: 8.5, color: "#334155" },
    totalDiscRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3.5, paddingHorizontal: 8 },
    totalFinalBox: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      backgroundColor: c, borderRadius: 4,
      paddingVertical: 9, paddingHorizontal: 10, marginTop: 4,
    },
    totalFinalLabel: { fontSize: 11, fontFamily: bold, color: "#fff" },
    totalFinalValue: { fontSize: 13, fontFamily: bold, color: "#fff" },

    // ── Notes + Conditions ──
    bottomSection: { flexDirection: "row", gap: 12, paddingHorizontal: 36, marginTop: 18 },
    noteBox: {
      flex: 1, backgroundColor: "#f8fafc", borderRadius: 4,
      borderLeft: `3px solid ${c}60`, padding: 10,
    },
    noteLabel: { fontSize: 7.5, fontFamily: bold, color: c, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 },
    noteText: { fontSize: 8, color: "#475569", lineHeight: 1.6 },

    // ── Coordonnées bancaires ──
    bankBox: {
      marginHorizontal: 36, marginTop: 14,
      flexDirection: "row", alignItems: "flex-start", gap: 20,
      backgroundColor: c + "0d", borderRadius: 4, padding: 10,
      border: `0.5px solid ${c}40`,
    },
    bankLabel: { fontSize: 7.5, fontFamily: bold, color: c, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    bankText: { fontSize: 8.5, color: "#1e3a5f" },

    // ── Footer ──
    footer: {
      position: "absolute",
      bottom: hasFooterImg ? 78 : 16,
      left: 36, right: 36,
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingTop: 6, borderTop: "0.5px solid #cbd5e1",
    },
    footerText: { fontSize: 7.5, color: "#94a3b8" },
    footerImg: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      width: "100%", height: 68, objectFit: "cover",
    },

    // ── Pièces jointes ──
    attachPage: { padding: 0 },
    attachImg: { width: "100%", height: "100%", objectFit: "contain" },
    attachLabel: { position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center", fontSize: 8, color: "#94a3b8" },
  });
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function QuotePDFDocument({
  data, template, docType = "DEVIS",
}: {
  data: QuotePDFData;
  template: QuoteTemplate;
  docType?: string;
}) {
  const s = makeStyles(template);
  const bold = template.font === "Times-Roman" ? "Times-Bold" : template.font === "Courier" ? "Courier-Bold" : "Helvetica-Bold";
  const c = template.color;

  const footerLine = template.footer || `${data.company.name}${data.company.vatNumber ? "  —  TVA : " + data.company.vatNumber : ""}`;

  // TVA par taux pour le détail
  const vatByRate = data.items.reduce((acc, item) => {
    const ht = item.quantity * item.unitPrice * (1 - item.discount / 100);
    const k = `${item.vatRate}`;
    acc[k] = (acc[k] || 0) + ht * (item.vatRate / 100);
    return acc;
  }, {} as Record<string, number>);
  const vatEntries = Object.entries(vatByRate).filter(([, v]) => v > 0).sort(([a], [b]) => +a - +b);

  const hasDiscount = data.discount > 0;
  const showDisc = data.items.some((i) => i.discount > 0);

  let attachmentPages: { name: string; data: string }[] = [];
  try { if (template.attachments) attachmentPages = JSON.parse(template.attachments); } catch {}

  return (
    <Document title={`${docType} ${data.number}`} author={data.company.name}>
      <Page size="A4" style={s.page}>

        {/* ══ ENTÊTE ══════════════════════════════════════════════════════════ */}
        {template.headerImage ? (
          /* — Bannière image avec overlay — */
          <View style={s.headerBanner}>
            <Image style={s.headerBannerImg} src={template.headerImage} />
            <View style={s.headerBannerDim} />
            <View style={s.headerBannerContent}>
              <View>
                {template.logo && <Image style={s.bannerLogo} src={template.logo} />}
                <Text style={s.bannerCompanyName}>{data.company.name}</Text>
                {data.company.address && <Text style={s.bannerInfo}>{data.company.address}</Text>}
                {data.company.city && <Text style={s.bannerInfo}>{data.company.postalCode} {data.company.city}</Text>}
                {data.company.phone && <Text style={s.bannerInfo}>Tél : {data.company.phone}</Text>}
                {data.company.vatNumber && <Text style={s.bannerInfo}>TVA : {data.company.vatNumber}</Text>}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.bannerDocType}>{docType}</Text>
                <Text style={s.bannerDocRef}>{data.number}</Text>
                {data.title && <Text style={s.bannerDocSub}>{data.title}</Text>}
                <View style={s.bannerBadge}><Text>{STATUS_LABELS[data.status] || data.status}</Text></View>
              </View>
            </View>
          </View>
        ) : (
          /* — Entête classique sans image — */
          <View style={s.classicHeader}>
            <View style={s.classicLeft}>
              {template.logo && <Image style={s.logoImg} src={template.logo} />}
              <Text style={s.companyName}>{data.company.name}</Text>
              <Text style={s.companyInfo}>
                {[data.company.address, data.company.postalCode && data.company.city ? `${data.company.postalCode} ${data.company.city}` : null]
                  .filter(Boolean).join(" · ")}
              </Text>
              {data.company.phone && <Text style={s.companyInfo}>Tél : {data.company.phone}</Text>}
              {data.company.email && <Text style={s.companyInfo}>{data.company.email}</Text>}
              {data.company.vatNumber && <Text style={s.companyInfo}>N° TVA : {data.company.vatNumber}</Text>}
              {data.company.website && <Text style={s.companyInfo}>{data.company.website}</Text>}
            </View>
            <View style={s.classicRight}>
              <Text style={s.docType}>{docType}</Text>
              <Text style={s.docRef}>{data.number}</Text>
              {data.title && <Text style={s.docSub}>{data.title}</Text>}
              <View style={s.statusBadge}><Text>{STATUS_LABELS[data.status] || data.status}</Text></View>
            </View>
          </View>
        )}

        {/* ══ BANDE MÉTA ══════════════════════════════════════════════════════ */}
        <View style={s.metaBand}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Date d'émission</Text>
            <Text style={s.metaValue}>{fmtDate(data.issueDate)}</Text>
          </View>
          {data.validUntil && (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>Valable jusqu'au</Text>
              <Text style={s.metaValue}>{fmtDate(data.validUntil)}</Text>
            </View>
          )}
          {data.clientRef && (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>Réf. commande client</Text>
              <Text style={s.metaValue}>{data.clientRef}</Text>
            </View>
          )}
          <View style={s.metaItemLast}>
            <Text style={s.metaLabel}>Référence document</Text>
            <Text style={s.metaValue}>{data.number}</Text>
          </View>
        </View>

        {/* ══ ADRESSES ════════════════════════════════════════════════════════ */}
        <View style={s.addrSection}>
          {/* Émetteur */}
          <View style={s.addrFrom}>
            <Text style={s.addrSectionLabel}>De</Text>
            <Text style={s.addrName}>{data.company.name}</Text>
            {data.company.address && <Text style={s.addrLine}>{data.company.address}</Text>}
            {data.company.city && <Text style={s.addrLine}>{data.company.postalCode} {data.company.city}</Text>}
            {data.company.phone && <Text style={s.addrLine}>Tél : {data.company.phone}</Text>}
            {data.company.email && <Text style={s.addrLine}>{data.company.email}</Text>}
            {data.company.vatNumber && <Text style={s.addrLine}>N° TVA : {data.company.vatNumber}</Text>}
          </View>
          {/* Destinataire */}
          <View style={s.addrTo}>
            <Text style={s.addrSectionLabel}>Destinataire</Text>
            <Text style={s.addrName}>{data.client.name}</Text>
            {data.client.address && <Text style={s.addrLine}>{data.client.address}</Text>}
            {data.client.city && <Text style={s.addrLine}>{data.client.postalCode} {data.client.city}</Text>}
            {data.client.email && <Text style={s.addrLine}>{data.client.email}</Text>}
            {data.client.vatNumber && <Text style={s.addrLine}>N° TVA : {data.client.vatNumber}</Text>}
          </View>
        </View>

        {/* ══ CORPS ═══════════════════════════════════════════════════════════ */}
        <View style={s.body}>

          {/* Objet de l'offre */}
          {data.title && (
            <Text style={s.offerTitle}>Objet : {data.title}</Text>
          )}

          {/* ── Tableau des prestations ── */}
          <View style={s.tableWrap}>
            {/* En-tête */}
            <View style={s.tableHead}>
              <Text style={[s.thText, s.cDesc]}>Désignation</Text>
              <Text style={[s.thText, s.cQty]}>Qté</Text>
              <Text style={[s.thText, s.cUnit]}>Unité</Text>
              <Text style={[s.thText, s.cPrice]}>P.U. HT</Text>
              <Text style={[s.thText, s.cVat]}>TVA</Text>
              {showDisc && <Text style={[s.thText, s.cDisc]}>Rem.</Text>}
              <Text style={[s.thText, s.cTotal]}>Total TTC</Text>
            </View>

            {/* Lignes */}
            {data.items.map((item, idx) => (
              <View key={idx} style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
                <View style={s.cDesc}>
                  <Text style={s.tdDesc}>{item.description}</Text>
                  {item.notes ? <Text style={s.tdNotes}>{item.notes}</Text> : null}
                </View>
                <Text style={[s.tdText, s.cQty]}>{item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)}</Text>
                <Text style={[s.tdText, s.cUnit]}>{item.unit || "unité"}</Text>
                <Text style={[s.tdText, s.cPrice]}>{fmt(item.unitPrice)}</Text>
                <Text style={[s.tdText, s.cVat]}>{item.vatRate} %</Text>
                {showDisc && (
                  <Text style={[s.tdText, s.cDisc]}>{item.discount > 0 ? `${item.discount} %` : "—"}</Text>
                )}
                <Text style={[s.tdBold, s.cTotal]}>{fmt(item.total)}</Text>
              </View>
            ))}
          </View>

          {/* ── Totaux ── */}
          <View style={s.totalsOuter}>
            <View style={s.totalsBox}>
              {/* Sous-total HT */}
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Sous-total HT</Text>
                <Text style={s.totalValue}>{fmt(data.subtotal)}</Text>
              </View>
              {/* TVA par taux */}
              {vatEntries.length > 0
                ? vatEntries.map(([rate, amount]) => (
                    <View key={rate} style={s.totalRow}>
                      <Text style={s.totalLabel}>TVA {rate} %</Text>
                      <Text style={s.totalValue}>{fmt(amount)}</Text>
                    </View>
                  ))
                : (
                  <View style={s.totalRow}>
                    <Text style={s.totalLabel}>TVA</Text>
                    <Text style={s.totalValue}>{fmt(data.vatAmount)}</Text>
                  </View>
                )}
              {/* Remise globale */}
              {hasDiscount && (
                <View style={s.totalDiscRow}>
                  <Text style={[s.totalLabel, { color: "#dc2626" }]}>Remise</Text>
                  <Text style={[s.totalValue, { color: "#dc2626" }]}>− {fmt(data.discount)}</Text>
                </View>
              )}
              {/* Total final */}
              <View style={s.totalFinalBox}>
                <Text style={s.totalFinalLabel}>Total TTC</Text>
                <Text style={s.totalFinalValue}>{fmt(data.total)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ══ NOTES + CONDITIONS ══════════════════════════════════════════════ */}
        {(data.notes || data.conditions) && (
          <View style={s.bottomSection}>
            {data.notes && (
              <View style={s.noteBox}>
                <Text style={s.noteLabel}>Notes</Text>
                <Text style={s.noteText}>{data.notes}</Text>
              </View>
            )}
            {data.conditions && (
              <View style={s.noteBox}>
                <Text style={s.noteLabel}>Conditions de vente</Text>
                <Text style={s.noteText}>{data.conditions}</Text>
              </View>
            )}
          </View>
        )}

        {/* ══ COORDONNÉES BANCAIRES ═══════════════════════════════════════════ */}
        {template.showBank && (data.company.iban || data.company.bic) && (
          <View style={s.bankBox}>
            <View>
              <Text style={s.bankLabel}>Coordonnées bancaires</Text>
              {data.company.iban && <Text style={s.bankText}>IBAN : {data.company.iban}</Text>}
              {data.company.bic && <Text style={s.bankText}>BIC / SWIFT : {data.company.bic}</Text>}
            </View>
          </View>
        )}

        {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{footerLine}</Text>
          <Text style={s.footerText}>{docType} · {data.number}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>

        {template.footerImage && (
          <Image style={s.footerImg} src={template.footerImage} fixed />
        )}
      </Page>

      {/* ══ PAGES PIÈCES JOINTES ════════════════════════════════════════════ */}
      {attachmentPages.map((att, i) => (
        <Page key={i} size="A4" style={s.attachPage}>
          <Image style={s.attachImg} src={att.data} />
          <Text style={s.attachLabel}>{att.name}</Text>
        </Page>
      ))}
    </Document>
  );
}
