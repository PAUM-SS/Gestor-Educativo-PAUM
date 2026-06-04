import { PDFViewer } from '@react-pdf/renderer';
import ReportPDFDocument, { ReportType } from './ReportPDFDocument';

interface PreviewProps {
  type: string;
  notes?: string;
}

export default function PDFPreview({ type, notes }: PreviewProps) {
  return (
    <div className="bg-slate-200 p-4 min-h-screen flex justify-center overflow-hidden">
      <PDFViewer className="w-full max-w-[850px] h-[calc(100vh-2rem)] shadow-2xl rounded bg-white">
        <ReportPDFDocument type={type as ReportType} notes={notes} />
      </PDFViewer>
    </div>
  );
}
