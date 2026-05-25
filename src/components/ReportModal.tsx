import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Send, 
  CircleCheckBig, 
  FileText, 
  Loader2,
  Users,
  Building2,
  ListTodo,
  Printer,
  GraduationCap,
  BookOpen,
  Mail,
  TrendingDown,
  TrendingUp,
  Eye,
  ArrowLeft
} from 'lucide-react';
import PDFPreview from './PDFPreview';
import PAUMShield from './PAUMShield';
import { reportService } from '../services/reportService';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const [reportType, setReportType] = useState('academico');
  const [coordinatorNotes, setCoordinatorNotes] = useState('');
  const [actionState, setActionState] = useState<'idle' | 'preview' | 'printing' | 'sending' | 'success'>('idle');

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setActionState('idle');
        setReportType('academico');
        setCoordinatorNotes('');
      }, 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    setActionState('sending');
    const success = await reportService.sendReport(reportType, coordinatorNotes);
    if (success) {
      setActionState('success');
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setActionState('idle'); // Handle error appropriately
    }
  };

  const handlePrint = () => {
    setActionState('printing');
    // Simulate PDF generation
    setTimeout(() => {
      window.print();
      setActionState('idle');
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={actionState !== 'sending' && actionState !== 'printing' ? onClose : undefined}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100"
        >
          {/* Header */}
          <div className="bg-gb-primary text-white p-6 relative">
            <button 
              onClick={onClose}
              disabled={actionState === 'sending' || actionState === 'printing'}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors disabled:opacity-50"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-full bg-white p-1.5 shadow-sm shrink-0">
                <PAUMShield className="w-full h-full" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">PAUM BUAP</p>
                <h2 className="text-xl font-bold font-display">Generación de Reportes Oficiales</h2>
              </div>
            </div>
            <p className="text-white/80 text-sm">Imprima o envíe a Secretaría Académica los informes sellados del PAUM.</p>
          </div>

          {/* Content */}
          <div className={`${actionState === 'preview' ? 'p-0' : 'p-6'} overflow-hidden`}>
            {actionState === 'success' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                  <CircleCheckBig size={40} className="text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold text-gb-secondary mb-2">¡Reporte Enviado!</h3>
                <p className="text-slate-500 max-w-sm">
                  El reporte ha sido generado y enviado con éxito al correo institucional de la <strong>Secretaría Académica</strong> (academiapaum@buap.mx).
                </p>
                <button 
                  onClick={onClose}
                  className="mt-8 text-gb-primary font-bold text-sm hover:underline"
                >
                  Regresar al panel
                </button>
              </motion.div>
            ) : actionState === 'preview' ? (
              <div className="flex flex-col h-[75vh]">
                <div className="bg-slate-100 p-4 border-b flex justify-between items-center shrink-0">
                  <button 
                    onClick={() => setActionState('idle')}
                    className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase hover:text-gb-primary transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Editar Selección
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-lg font-bold text-xs hover:bg-slate-50 transition-all"
                    >
                      <Printer size={14} /> Imprimir
                    </button>
                    <button 
                      onClick={handleSend}
                      className="flex items-center gap-2 bg-gb-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-gb-primary/90 transition-all shadow-lg shadow-gb-primary/20"
                    >
                      <Send size={14} /> Enviar a Secretaria
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto bg-slate-200">
                  <div className="scale-[0.8] origin-top transform -mb-[25%]">
                    <PDFPreview type={reportType} notes={coordinatorNotes} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Mail size={18} />
                  </div>
                  <p className="text-xs text-blue-800 font-medium">
                    El reporte se enviará automáticamente desde su cuenta institucional a <strong>academiapaum@buap.mx</strong>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gb-secondary mb-3 uppercase tracking-widest">
                    Seleccionar Tipo de Reporte
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-64 overflow-y-auto pr-2 scrollbar-thin">
                    <button 
                      onClick={() => setReportType('academico')}
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                        reportType === 'academico' ? 'border-gb-primary bg-[#E8F4FD]' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className={`p-2 rounded shrink-0 ${reportType === 'academico' ? 'bg-gb-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Users size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gb-secondary text-sm">Programación Académica</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Indicadores RIPPPA, Asistencias y Secciones.</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setReportType('alumnos')}
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                        reportType === 'alumnos' ? 'border-gb-primary bg-[#E8F4FD]' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className={`p-2 rounded shrink-0 ${reportType === 'alumnos' ? 'bg-gb-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <GraduationCap size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gb-secondary text-sm">Roster Escolar y Kardex</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Promedios generales, cohortes y tutorías.</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setReportType('curriculo')}
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                        reportType === 'curriculo' ? 'border-gb-primary bg-[#E8F4FD]' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className={`p-2 rounded shrink-0 ${reportType === 'curriculo' ? 'bg-gb-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <BookOpen size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gb-secondary text-sm">Plan de Estudios</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Control de programas académicos y bloques.</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setReportType('sedes')}
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                        reportType === 'sedes' ? 'border-gb-primary bg-[#E8F4FD]' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className={`p-2 rounded shrink-0 ${reportType === 'sedes' ? 'bg-gb-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Building2 size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gb-secondary text-sm">Pertinencia de Sedes</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Evaluación de convenios y capacidades.</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setReportType('minuta_oficial')}
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                        reportType === 'minuta_oficial' ? 'border-gb-primary bg-[#E8F4FD]' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className={`p-2 rounded shrink-0 ${reportType === 'minuta_oficial' ? 'bg-gb-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <ListTodo size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gb-secondary text-sm">Minuta de Academia</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Validación de evidencias y acuerdos.</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gb-secondary mb-2 uppercase tracking-widest">
                    Observaciones del Coordinador
                  </label>
                  <textarea 
                    value={coordinatorNotes}
                    onChange={(e) => setCoordinatorNotes(e.target.value)}
                    placeholder="Ingrese observaciones, acuerdos adicionales o notas de seguimiento para este reporte oficial..."
                    className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all font-medium text-sm text-slate-700 resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center px-2">
                  <button 
                    onClick={onClose}
                    className="font-bold text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Cerrar
                  </button>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setActionState('preview')}
                      className="flex items-center gap-2 bg-white text-gb-primary border border-gb-primary/30 px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-gb-primary/5 transition-all active:scale-95 shadow-sm"
                    >
                      <Eye size={18} />
                      Previsualizar Reporte
                    </button>
                    <button 
                      onClick={handleSend}
                      className="flex items-center gap-2 bg-gb-primary text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-gb-primary/90 transition-all active:scale-95 shadow-lg shadow-gb-primary/20"
                    >
                      <Send size={18} />
                      Enviar Directo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

