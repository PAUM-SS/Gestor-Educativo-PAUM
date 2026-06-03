import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------

export type ReportType = 'academico' | 'alumnos' | 'curriculo' | 'sedes' | 'minuta_oficial' | 'minutas' | 'indicadores';

interface ReportDocumentProps {
  type: ReportType;
  notes?: string;
}

// ------------------------------------------------------------------
// Estilos base
// ------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 50,
    paddingBottom: 65,
    paddingHorizontal: 55,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#1e293b',
    paddingBottom: 18,
    marginBottom: 22,
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 3,
  },
  institutionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  institutionName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#0f172a',
  },
  programLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
  },
  refBox: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 5,
    backgroundColor: '#f8fafc',
    alignItems: 'flex-end',
  },
  refText: {
    fontSize: 7.5,
    fontFamily: 'Courier',
    color: '#475569',
  },
  dateText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  // Título del reporte
  titleSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  officialBadge: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  reportTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  titleAccentLine: {
    width: 60,
    height: 4,
    backgroundColor: '#10b981',
    marginTop: 12,
  },
  // Secciones
  sectionHeader: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#94a3b8',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 5,
    marginBottom: 14,
  },
  sectionBody: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 1.6,
    fontStyle: 'italic',
    borderLeftWidth: 3,
    borderLeftColor: '#e2e8f0',
    paddingLeft: 12,
  },
  section: {
    marginBottom: 28,
  },
  // Placeholder de contenido
  placeholderBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 14,
    marginTop: 8,
  },
  placeholderText: {
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Observaciones
  notesLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#94a3b8',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 5,
    marginBottom: 10,
  },
  notesText: {
    fontSize: 9.5,
    color: '#475569',
    lineHeight: 1.6,
  },
  // Firmas / footer
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 55,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  signatureBlock: {
    alignItems: 'center',
    width: '40%',
  },
  signatureLine: {
    width: '100%',
    height: 1.5,
    backgroundColor: '#94a3b8',
    marginBottom: 6,
  },
  signatureName: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#0f172a',
  },
  signatureRole: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  docId: {
    fontSize: 7,
    fontFamily: 'Courier',
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 14,
  },
});

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const REPORT_TITLES: Record<string, string> = {
  academico: 'Reporte de Programación Académica y Cumplimiento',
  alumnos: 'Reporte de Roster Escolar y Seguimiento Académico',
  curriculo: 'Avance Programático de Plan de Estudios',
  sedes: 'Informe de Pertinencia y Convenios de Sedes',
  indicadores: 'Dashboard de Indicadores de Desempeño',
  minutas: 'Relación de Acuerdos y Minutas de Academia',
  minuta_oficial: 'Minuta de Academia',
};

const SECTION_LABELS: Record<string, string> = {
  academico: 'II. Cumplimiento de Programación y Sesiones',
  alumnos: 'II. Estado del Roster Estudiantil y Kardex',
  curriculo: 'II. Cumplimiento de Metas Curriculares (Meta vs Real)',
  sedes: 'II. Gestión de Campos Clínicos y Sedes',
  indicadores: 'II. Indicadores de Eficiencia Operativa',
  minutas: 'II. Bitácora de Acuerdos y Seguimiento',
  minuta_oficial: 'II. Contenido de la Minuta',
};

function getToday(): string {
  return new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getDocId(type: string): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PAUM-RPT-${type.toUpperCase()}-2026-${rand}`;
}

// ------------------------------------------------------------------
// Componente principal del documento PDF
// ------------------------------------------------------------------

export default function ReportPDFDocument({ type, notes }: ReportDocumentProps) {
  const docId = getDocId(type);
  const today = getToday();
  const title = REPORT_TITLES[type] ?? 'Reporte PAUM';
  const sectionLabel = SECTION_LABELS[type];

  return (
    <Document
      title={title}
      author="Coordinación PAUM – Facultad de Medicina BUAP"
      subject={`Reporte oficial PAUM – ${type}`}
      creator="PAUM Gestor Educativo"
    >
      <Page size="A4" style={styles.page}>

        {/* ── ENCABEZADO ────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.institutionLabel}>Benemérita Universidad Autónoma de Puebla</Text>
            <Text style={styles.institutionName}>Facultad de Medicina</Text>
            <Text style={styles.programLabel}>Profesional Asociado en Urgencias Médicas (PAUM)</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.refBox}>
              <Text style={styles.refText}>REF: PAUM-RPT-{type.toUpperCase()}-2026</Text>
              <Text style={styles.refText}>EXP: 100534457</Text>
            </View>
            <Text style={styles.dateText}>Generado el: {today}</Text>
          </View>
        </View>

        {/* ── TÍTULO ───────────────────────────────────────────── */}
        <View style={styles.titleSection}>
          <Text style={styles.officialBadge}>Documento Oficial</Text>
          <Text style={styles.reportTitle}>{title}</Text>
          <View style={styles.titleAccentLine} />
        </View>

        {/* ── I. Resumen Ejecutivo (común a todos) ─────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>I. Resumen Ejecutivo de Gestión</Text>
          <Text style={styles.sectionBody}>
            El presente informe detalla el estado actual de las actividades académicas correspondientes al periodo Primavera 2026.
            Se han verificado las bitácoras de seguimiento y las tareas administrativas conforme a los acuerdos de la dirección general.
          </Text>
        </View>

        {/* ── II. Sección específica del tipo (placeholder) ────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{sectionLabel}</Text>
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>
              [Contenido detallado del reporte «{type}» en desarrollo.{'\n'}
              El cuerpo completo se integrará en la siguiente fase de implementación.]
            </Text>
          </View>
        </View>

        {/* ── Observaciones del Coordinador ────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.notesLabel}>Observaciones del Coordinador</Text>
          <Text style={styles.notesText}>
            {notes?.trim()
              ? notes
              : 'Se mantiene un seguimiento estrecho a las bitácoras de las sedes para garantizar el cumplimiento reglamentario conforme al calendario institucional.'}
          </Text>
        </View>

        {/* ── Firmas ───────────────────────────────────────────── */}
        <View style={styles.signaturesRow}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Dr. Ariel Farit Gutierrez Alexander</Text>
            <Text style={styles.signatureRole}>Coordinación de Programa PAUM</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>Secretaría Académica</Text>
            <Text style={styles.signatureRole}>Facultad de Medicina, BUAP</Text>
          </View>
        </View>

        <Text style={styles.docId}>ID DOCUMENTO: {docId}</Text>

      </Page>
    </Document>
  );
}
