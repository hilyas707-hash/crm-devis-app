import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `${n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f")} €`;
}
function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric" });
}
function hex(color: string, alpha: number) {
  // Converts hex + alpha 0-1 into CSS rgba string for react-pdf
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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
  introText?: string | null;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const PAD = 40;    // page horizontal padding
const GRAY = "#64748b";
const DARK = "#0f172a";
const BORDER = "#e2e8f0";

// ─── Composant principal ──────────────────────────────────────────────────────

export function QuotePDFDocument({
  data, template, docType = "DEVIS",
}: {
  data: QuotePDFData;
  template: QuoteTemplate;
  docType?: string;
}) {
  const c = template.color || "#2563eb";
  const font = template.font || "Helvetica";
  const bold = font === "Times-Roman" ? "Times-Bold"
    : font === "Courier" ? "Courier-Bold"
    : "Helvetica-Bold";

  const hasHeaderImg = !!template.headerImage;
  const hasFooterImg = !!template.footerImage;
  const footerLine = template.footer
    || [data.company.name, data.company.vatNumber ? `TVA ${data.company.vatNumber}` : null].filter(Boolean).join("  ·  ");

  const vatByRate = data.items.reduce((acc, item) => {
    const ht = item.quantity * item.unitPrice * (1 - item.discount / 100);
    const k = `${item.vatRate}`;
    acc[k] = (acc[k] || 0) + ht * (item.vatRate / 100);
    return acc;
  }, {} as Record<string, number>);
  const vatEntries = Object.entries(vatByRate).filter(([, v]) => v > 0).sort(([a], [b]) => +a - +b);
  const showDisc = data.items.some((i) => i.discount > 0);

  let attachmentPages: { name: string; data: string }[] = [];
  try { if (template.attachments) attachmentPages = JSON.parse(template.attachments); } catch {}

  // ── Styles (computed from template) ─────────────────────────────────────────
  const s = StyleSheet.create({
    page: {
      fontFamily: font,
      fontSize: 9.5,
      color: DARK,
      backgroundColor: "#ffffff",
      paddingTop: hasHeaderImg ? 0 : PAD,
      paddingBottom: hasFooterImg ? 80 : 56,
      paddingHorizontal: PAD,
    },

    // ── Header image (full-bleed) ──────────────────────────────────────────────
    bannerWrap: {
      // Negative margin to escape page padding → full bleed
      marginHorizontal: -PAD,
      marginTop: 0,
      height: 136,
      position: "relative",
    },
    bannerImg: {
      position: "absolute", top: 0, left: 0,
      width: "100%", height: "100%",
      objectFit: "cover",
    },
    bannerOverlay: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.46)",
    },
    bannerContent: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingHorizontal: PAD, paddingVertical: 18,
    },
    bannerLogoImg: { maxHeight: 40, maxWidth: 130, objectFit: "contain", marginBottom: 6 },
    bannerCompany: { fontSize: 15, fontFamily: bold, color: "#fff" },
    bannerCompanySub: { fontSize: 8, color: "rgba(255,255,255,0.78)", marginTop: 2 },
    bannerDocType: { fontSize: 30, fontFamily: bold, color: "#fff", textAlign: "right" },
    bannerDocNum: { fontSize: 11, color: "rgba(255,255,255,0.92)", textAlign: "right", marginTop: 4, fontFamily: bold },
    bannerDocSub: { fontSize: 8.5, color: "rgba(255,255,255,0.72)", textAlign: "right", marginTop: 3 },

    // ── Compact continuation header (page 2+) ─────────────────────────────────
    contHeaderWrap: {
      position: "absolute",
      top: 0, left: 0, right: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: PAD,
      paddingVertical: 8,
      backgroundColor: c,
      height: 36,
    },
    contHeaderLeft: { fontSize: 8.5, fontFamily: bold, color: "#fff" },
    contHeaderRight: { fontSize: 8, color: "rgba(255,255,255,0.85)" },

    // ── Classic header (no image) ──────────────────────────────────────────────
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingBottom: 18,
    },
    headerLeft: { flex: 1, paddingRight: 20 },
    headerRight: { alignItems: "flex-end" },
    logoImg: { maxHeight: 54, maxWidth: 160, objectFit: "contain", marginBottom: 8 },
    hCompanyName: { fontSize: 13, fontFamily: bold, color: c, marginBottom: 3 },
    hCompanySub: { fontSize: 8, color: GRAY, lineHeight: 1.55 },
    hDocType: { fontSize: 30, fontFamily: bold, color: c, marginBottom: 4, textAlign: "right" },
    hDocNum: { fontSize: 11, fontFamily: bold, color: DARK, textAlign: "right", marginBottom: 2 },
    hDocTitle: { fontSize: 8.5, color: GRAY, textAlign: "right", marginBottom: 2 },
    hDocDate: { fontSize: 8.5, color: GRAY, textAlign: "right", lineHeight: 1.6 },

    // ── Accent divider ─────────────────────────────────────────────────────────
    divider: {
      height: 2,
      backgroundColor: c,
      marginBottom: 20,
    },
    dividerThin: {
      height: 1,
      backgroundColor: BORDER,
      marginVertical: 16,
    },

    // ── Info bar (date, validity, client ref) ──────────────────────────────────
    infoBar: {
      flexDirection: "row",
      backgroundColor: "#f8fafc",
      borderRadius: 4,
      border: `1px solid ${BORDER}`,
      paddingVertical: 8,
      paddingHorizontal: 14,
      marginBottom: 18,
    },
    infoItem: {
      flex: 1,
      paddingRight: 12,
      borderRight: `1px solid ${BORDER}`,
      marginRight: 12,
    },
    infoItemLast: { flex: 1 },
    infoLabel: { fontSize: 7, color: "#94a3b8", fontFamily: bold, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
    infoValue: { fontSize: 9, fontFamily: bold, color: DARK },

    // ── Addresses ─────────────────────────────────────────────────────────────
    addrRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 18,
    },
    addrFromBox: {
      flex: 1,
    },
    addrToBox: {
      flex: 1.1,
      borderLeft: `3px solid ${c}`,
      backgroundColor: hex(c, 0.04),
      paddingLeft: 12,
      paddingVertical: 10,
      paddingRight: 10,
      borderRadius: 2,
    },
    addrLabel: {
      fontSize: 7.5, fontFamily: bold, color: c,
      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6,
    },
    addrName: { fontSize: 10.5, fontFamily: bold, color: DARK, marginBottom: 3 },
    addrLine: { fontSize: 8.5, color: "#475569", lineHeight: 1.6 },

    // ── Intro text (before table) ─────────────────────────────────────────────
    introBox: {
      marginBottom: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: "#f8fafc",
      borderRadius: 3,
      borderLeft: `3px solid ${c}`,
    },
    introText: { fontSize: 9, color: "#334155", lineHeight: 1.65 },

    // ── Offer title ───────────────────────────────────────────────────────────
    offerTitle: {
      fontSize: 10.5,
      fontFamily: bold,
      color: DARK,
      marginBottom: 14,
      paddingBottom: 8,
      borderBottom: `1px solid ${hex(c, 0.25)}`,
    },

    // ── Table ─────────────────────────────────────────────────────────────────
    thead: {
      flexDirection: "row",
      backgroundColor: c,
      borderRadius: 3,
      paddingVertical: 7,
      paddingHorizontal: 8,
    },
    th: {
      fontSize: 7.5, fontFamily: bold, color: "#fff",
      textTransform: "uppercase", letterSpacing: 0.4,
    },
    trow: {
      flexDirection: "row",
      paddingVertical: 7,
      paddingHorizontal: 8,
      borderBottom: `1px solid #f0f4f8`,
    },
    trowAlt: { backgroundColor: "#f9fbff" },
    tdMain: { fontSize: 9, color: DARK },
    tdSub: { fontSize: 7.5, color: GRAY, fontStyle: "italic", marginTop: 2, lineHeight: 1.4 },
    tdNum: { fontSize: 9, color: "#334155" },
    tdBold: { fontSize: 9, fontFamily: bold, color: DARK },

    // col widths
    cDesc:  { flex: 3.4 },
    cQty:   { flex: 0.65, textAlign: "right" },
    cUnit:  { flex: 0.9,  paddingLeft: 5 },
    cPrice: { flex: 1.35, textAlign: "right" },
    cVat:   { flex: 0.7,  textAlign: "right" },
    cDisc:  { flex: 0.7,  textAlign: "right" },
    cTotal: { flex: 1.4,  textAlign: "right" },

    // ── Totals ────────────────────────────────────────────────────────────────
    totalsSection: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 8,
      marginBottom: 0,
    },
    totalsCard: {
      width: 218,
      border: `1px solid ${BORDER}`,
      borderRadius: 4,
      overflow: "hidden",
    },
    totRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderBottom: `1px solid ${BORDER}`,
    },
    totRowLast: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    totLabel: { fontSize: 8.5, color: GRAY },
    totValue: { fontSize: 8.5, color: "#334155" },
    totDiscLabel: { fontSize: 8.5, color: "#dc2626" },
    totDiscValue: { fontSize: 8.5, color: "#dc2626" },
    totalFinal: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: c,
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    totalFinalLabel: { fontSize: 10, fontFamily: bold, color: "#fff" },
    totalFinalValue: { fontSize: 13, fontFamily: bold, color: "#fff" },

    // ── Notes / Conditions (empilées, pleine largeur) ─────────────────────────
    noteBlock: { marginTop: 16 },
    noteBox: {
      marginBottom: 8,
      borderLeft: `2px solid ${hex(c, 0.35)}`,
      paddingLeft: 10,
      paddingVertical: 6,
    },
    noteLabel: {
      fontSize: 7, fontFamily: bold, color: c,
      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3,
    },
    noteText: { fontSize: 8, color: "#475569", lineHeight: 1.6 },

    // ── Bloc banque + conditions + signature (toujours ensemble) ─────────────
    condSigBlock: { marginTop: 16 },

    // ── Signature ─────────────────────────────────────────────────────────────
    sigSection: {
      flexDirection: "row",
      gap: 14,
      marginTop: 16,
    },
    sigBox: {
      flex: 1,
      border: `1px solid ${BORDER}`,
      borderRadius: 4,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 14,
      minHeight: 72,
    },
    sigLabel: {
      fontSize: 7.5, fontFamily: bold, color: c,
      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
    },
    sigSub: { fontSize: 7, color: GRAY, marginBottom: 22 },
    sigLine: { borderBottom: `1px solid ${BORDER}` },
    sigLineLabel: { fontSize: 7, color: "#94a3b8", marginTop: 4 },

    // ── Bank ──────────────────────────────────────────────────────────────────
    bankBox: {
      flexDirection: "row",
      gap: 24,
      backgroundColor: hex(c, 0.05),
      border: `1px solid ${hex(c, 0.2)}`,
      borderRadius: 4,
      padding: 10,
    },
    bankLabel: {
      fontSize: 7.5, fontFamily: bold, color: c,
      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
    },
    bankText: { fontSize: 8.5, color: "#1e3a5f" },

    // ── Footer ────────────────────────────────────────────────────────────────
    footer: {
      position: "absolute",
      bottom: hasFooterImg ? 74 : 18,
      left: PAD, right: PAD,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 6,
      borderTop: `1px solid ${BORDER}`,
    },
    footerText: { fontSize: 7.5, color: "#94a3b8" },
    footerImg: {
      position: "absolute", bottom: 0, left: -PAD, right: -PAD,
      width: "130%", height: 65, objectFit: "cover",
    },

    // ── Attachment pages ──────────────────────────────────────────────────────
    attachPage: { padding: 0 },
    attachImg: { width: "100%", height: "100%", objectFit: "contain" },
    attachCaption: {
      position: "absolute", bottom: 10, left: 0, right: 0,
      textAlign: "center", fontSize: 8, color: "#94a3b8",
    },
  });

  // ── Info bar items ─────────────────────────────────────────────────────────
  const infoItems: { label: string; value: string }[] = [
    { label: "Référence", value: data.number },
    { label: "Date d'émission", value: fmtDate(data.issueDate) },
    ...(data.validUntil ? [{ label: "Valable jusqu'au", value: fmtDate(data.validUntil) }] : []),
    ...(data.clientRef ? [{ label: "Réf. client", value: data.clientRef }] : []),
  ];

  return (
    <Document title={`${docType} ${data.number}`} author={data.company.name}>
      <Page size="A4" style={s.page}>

        {/* ══ COMPACT HEADER — page 2+ seulement ═════════════════════════════ */}
        <View
          fixed
          render={({ pageNumber }) => pageNumber > 1 ? (
            <View style={s.contHeaderWrap}>
              <Text style={s.contHeaderLeft}>{data.company.name}</Text>
              <Text style={s.contHeaderRight}>{docType} · {data.number}{data.title ? ` — ${data.title}` : ""}</Text>
            </View>
          ) : null}
        />

        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}

        {hasHeaderImg ? (
          /* ── Banner image version ── */
          <View style={s.bannerWrap}>
            <Image style={s.bannerImg} src={template.headerImage!} />
            <View style={s.bannerOverlay} />
            <View style={s.bannerContent}>
              <View>
                {template.logo && <Image style={s.bannerLogoImg} src={template.logo} />}
                <Text style={s.bannerCompany}>{data.company.name}</Text>
                {data.company.address && <Text style={s.bannerCompanySub}>{data.company.address}</Text>}
                {(data.company.postalCode || data.company.city) && (
                  <Text style={s.bannerCompanySub}>{data.company.postalCode} {data.company.city}</Text>
                )}
                {data.company.phone && <Text style={s.bannerCompanySub}>Tél : {data.company.phone}</Text>}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.bannerDocType}>{docType}</Text>
                <Text style={s.bannerDocNum}>{data.number}</Text>
                {data.title && <Text style={s.bannerDocSub}>{data.title}</Text>}
              </View>
            </View>
          </View>
        ) : (
          /* ── Classic header ── */
          <>
            <View style={s.headerRow}>
              <View style={s.headerLeft}>
                {template.logo
                  ? <Image style={s.logoImg} src={template.logo} />
                  : <Text style={s.hCompanyName}>{data.company.name}</Text>
                }
                {template.logo && <Text style={s.hCompanyName}>{data.company.name}</Text>}
                {data.company.address && <Text style={s.hCompanySub}>{data.company.address}</Text>}
                {(data.company.postalCode || data.company.city) && (
                  <Text style={s.hCompanySub}>{data.company.postalCode} {data.company.city}</Text>
                )}
                {data.company.phone && <Text style={s.hCompanySub}>Tél : {data.company.phone}</Text>}
                {data.company.email && <Text style={s.hCompanySub}>{data.company.email}</Text>}
                {data.company.vatNumber && <Text style={s.hCompanySub}>TVA : {data.company.vatNumber}</Text>}
                {data.company.website && <Text style={s.hCompanySub}>{data.company.website}</Text>}
              </View>
              <View style={s.headerRight}>
                <Text style={s.hDocType}>{docType}</Text>
                <Text style={s.hDocNum}>{data.number}</Text>
                {data.title && <Text style={s.hDocTitle}>{data.title}</Text>}
                <Text style={s.hDocDate}>Émis le {fmtDate(data.issueDate)}</Text>
                {data.validUntil && (
                  <Text style={s.hDocDate}>Valable jusqu&apos;au {fmtDate(data.validUntil)}</Text>
                )}
                {data.clientRef && (
                  <Text style={s.hDocDate}>Réf. client : {data.clientRef}</Text>
                )}
              </View>
            </View>
            <View style={s.divider} />
          </>
        )}

        {/* ══ INFO BAR (only when banner image, since dates are in header otherwise) ══ */}
        {hasHeaderImg && (
          <View style={[s.infoBar, { marginTop: 16 }]}>
            {infoItems.map((item, i) => (
              <View key={i} style={i < infoItems.length - 1 ? s.infoItem : s.infoItemLast}>
                <Text style={s.infoLabel}>{item.label}</Text>
                <Text style={s.infoValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ══ ADDRESSES ═══════════════════════════════════════════════════════ */}
        <View style={s.addrRow}>
          {/* Sender (only show in banner mode, classic header already shows company) */}
          {hasHeaderImg ? (
            <View style={s.addrFromBox}>
              <Text style={s.addrLabel}>Émetteur</Text>
              <Text style={s.addrName}>{data.company.name}</Text>
              {data.company.address && <Text style={s.addrLine}>{data.company.address}</Text>}
              {(data.company.postalCode || data.company.city) && (
                <Text style={s.addrLine}>{data.company.postalCode} {data.company.city}</Text>
              )}
              {data.company.phone && <Text style={s.addrLine}>Tél : {data.company.phone}</Text>}
              {data.company.email && <Text style={s.addrLine}>{data.company.email}</Text>}
              {data.company.vatNumber && <Text style={s.addrLine}>TVA : {data.company.vatNumber}</Text>}
            </View>
          ) : (
            <View style={s.addrFromBox} />
          )}

          {/* Client */}
          <View style={s.addrToBox}>
            <Text style={s.addrLabel}>Facturé à</Text>
            <Text style={s.addrName}>{data.client.name}</Text>
            {data.client.address && <Text style={s.addrLine}>{data.client.address}</Text>}
            {(data.client.postalCode || data.client.city) && (
              <Text style={s.addrLine}>{data.client.postalCode} {data.client.city}</Text>
            )}
            {data.client.email && <Text style={s.addrLine}>{data.client.email}</Text>}
            {data.client.vatNumber && <Text style={s.addrLine}>TVA : {data.client.vatNumber}</Text>}
          </View>
        </View>

        {/* ══ OFFER TITLE ═════════════════════════════════════════════════════ */}
        {data.title && (
          <Text style={s.offerTitle}>Objet : {data.title}</Text>
        )}

        {/* ══ INTRO TEXT ══════════════════════════════════════════════════════ */}
        {data.introText && (
          <View style={s.introBox}>
            <Text style={s.introText}>{data.introText}</Text>
          </View>
        )}

        {/* ══ TABLE ═══════════════════════════════════════════════════════════
             Règle 1 : en-tête + 1re ligne = bloc inséparable
             Règle 2 : chaque ligne intermédiaire = wrap={false}
             Règle 3 : dernière ligne + totaux = bloc inséparable        ══ */}

        {data.items.length > 0 && (() => {
          const renderRow = (item: typeof data.items[0], idx: number) => (
            <View style={[s.trow, idx % 2 === 1 ? s.trowAlt : {}]}>
              <View style={s.cDesc}>
                <Text style={s.tdMain}>{item.description}</Text>
                {item.notes ? <Text style={s.tdSub}>{item.notes}</Text> : null}
              </View>
              <Text style={[s.tdNum, s.cQty]}>
                {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)}
              </Text>
              <Text style={[s.tdNum, s.cUnit]}>{item.unit || "unité"}</Text>
              <Text style={[s.tdNum, s.cPrice]}>{fmt(item.unitPrice)}</Text>
              <Text style={[s.tdNum, s.cVat]}>{item.vatRate} %</Text>
              {showDisc && (
                <Text style={[s.tdNum, s.cDisc]}>
                  {item.discount > 0 ? `${item.discount} %` : "—"}
                </Text>
              )}
              <Text style={[s.tdBold, s.cTotal]}>{fmt(item.total)}</Text>
            </View>
          );

          const thead = (
            <View style={s.thead}>
              <Text style={[s.th, s.cDesc]}>Désignation</Text>
              <Text style={[s.th, s.cQty]}>Qté</Text>
              <Text style={[s.th, s.cUnit]}>Unité</Text>
              <Text style={[s.th, s.cPrice]}>Prix HT</Text>
              <Text style={[s.th, s.cVat]}>TVA</Text>
              {showDisc && <Text style={[s.th, s.cDisc]}>Rem.</Text>}
              <Text style={[s.th, s.cTotal]}>Total TTC</Text>
            </View>
          );

          const totalsCard = (
            <View style={s.totalsSection}>
              <View style={s.totalsCard}>
                <View style={s.totRow}>
                  <Text style={s.totLabel}>Sous-total HT</Text>
                  <Text style={s.totValue}>{fmt(data.subtotal)}</Text>
                </View>
                {vatEntries.length > 0
                  ? vatEntries.map(([rate, amount]) => (
                    <View key={rate} style={s.totRow}>
                      <Text style={s.totLabel}>TVA {rate} %</Text>
                      <Text style={s.totValue}>{fmt(amount)}</Text>
                    </View>
                  ))
                  : (
                    <View style={s.totRow}>
                      <Text style={s.totLabel}>TVA</Text>
                      <Text style={s.totValue}>{fmt(data.vatAmount)}</Text>
                    </View>
                  )
                }
                {data.discount > 0 && (
                  <View style={s.totRowLast}>
                    <Text style={s.totDiscLabel}>Remise</Text>
                    <Text style={s.totDiscValue}>− {fmt(data.discount)}</Text>
                  </View>
                )}
                <View style={s.totalFinal}>
                  <Text style={s.totalFinalLabel}>Total TTC</Text>
                  <Text style={s.totalFinalValue}>{fmt(data.total)}</Text>
                </View>
              </View>
            </View>
          );

          if (data.items.length === 1) {
            // Une seule ligne : tout ensemble
            return (
              <View wrap={false}>
                {thead}
                {renderRow(data.items[0], 0)}
                {totalsCard}
              </View>
            );
          }

          return (
            <>
              {/* En-tête + 1re ligne : inséparables */}
              <View wrap={false}>
                {thead}
                {renderRow(data.items[0], 0)}
              </View>

              {/* Lignes intermédiaires : chacune inséparable */}
              {data.items.slice(1, -1).map((item, i) => (
                <View key={i + 1} wrap={false}>
                  {renderRow(item, i + 1)}
                </View>
              ))}

              {/* Dernière ligne + totaux : inséparables */}
              <View wrap={false}>
                {renderRow(data.items[data.items.length - 1], data.items.length - 1)}
                {totalsCard}
              </View>
            </>
          );
        })()}

        {/* ══ NOTES ═══════════════════════════════════════════════════════════
             Séparées → peuvent rester sur la page précédente              ══ */}
        {data.notes && (
          <View style={s.noteBlock}>
            <View style={s.noteBox}>
              <Text style={s.noteLabel}>Notes</Text>
              <Text style={s.noteText}>{data.notes}</Text>
            </View>
          </View>
        )}

        {/* ══ BANQUE + CONDITIONS + SIGNATURE ═════════════════════════════════
             Règle absolue : jamais séparés, jamais la signature seule
             Règle absolue : jamais en haut de page sans contexte          ══ */}
        <View wrap={false} style={s.condSigBlock}>
          {template.showBank && (data.company.iban || data.company.bic) && (
            <View style={s.bankBox}>
              <View>
                <Text style={s.bankLabel}>Coordonnées bancaires</Text>
                {data.company.iban && <Text style={s.bankText}>IBAN : {data.company.iban}</Text>}
                {data.company.bic && <Text style={s.bankText}>BIC / SWIFT : {data.company.bic}</Text>}
              </View>
            </View>
          )}

          {data.conditions && (
            <View style={[s.noteBox, { marginTop: 12 }]}>
              <Text style={s.noteLabel}>Conditions de paiement</Text>
              <Text style={s.noteText}>{data.conditions}</Text>
            </View>
          )}

          <View style={s.sigSection}>
            <View style={s.sigBox}>
              <Text style={s.sigLabel}>{data.company.name}</Text>
              <Text style={s.sigSub}>Signature et cachet</Text>
              <View style={s.sigLine} />
              <Text style={s.sigLineLabel}>Date : _____ / _____ / _______</Text>
            </View>
            <View style={s.sigBox}>
              <Text style={s.sigLabel}>Lu et approuvé — {data.client.name}</Text>
              <Text style={s.sigSub}>Bon pour accord — signature précédée de la mention</Text>
              <View style={s.sigLine} />
              <Text style={s.sigLineLabel}>Date : _____ / _____ / _______</Text>
            </View>
          </View>
        </View>

        {/* ══ FOOTER (fixed) ══════════════════════════════════════════════════ */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{footerLine}</Text>
          <Text style={s.footerText}>{docType} · {data.number}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>

        {template.footerImage && (
          <Image style={s.footerImg} src={template.footerImage} fixed />
        )}

      </Page>

      {/* ══ ATTACHMENT PAGES ════════════════════════════════════════════════ */}
      {attachmentPages.map((att, i) => (
        <Page key={i} size="A4" style={s.attachPage}>
          <Image style={s.attachImg} src={att.data} />
          <Text style={s.attachCaption}>{att.name}</Text>
        </Page>
      ))}
    </Document>
  );
}
