import { 
  FileText, 
  MapPin, 
  Calendar, 
  User, 
  CheckSquare, 
  TriangleAlert,
  TrendingUp,
  GraduationCap
} from 'lucide-react';
import { MOCK_STUDENTS, MOCK_ACADEMIC_CALENDAR, MOCK_MINUTES } from '../constants';
import PAUMShield from './PAUMShield';

interface PreviewProps {
  type: string;
  notes?: string;
}

export default function PDFPreview({ type, notes }: PreviewProps) {
  const today = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const getReportTitle = () => {
    switch(type) {
      case 'alumnos': return 'Reporte de Roster Escolar y Seguimiento Académico';
      case 'curriculo': return 'Avance Programático de Plan de Estudios';
      case 'sedes': return 'Informe de Pertinencia y Convenios de Sedes';
      case 'indicadores': return 'Dashboard de Indicadores de Desempeño';
      case 'minutas': return 'Relación de Acuerdos y Minutas de Academia';
      case 'minuta_oficial': return 'Minuta de Academia';
      default: return 'Reporte de Programación Académica y Cumplimiento';
    }
  };

  const minuteData = type === 'minuta_oficial' ? MOCK_MINUTES.find(m => m.id === 'min-1') : null;

  return (
    <div className="bg-slate-200 p-8 min-h-screen flex justify-center overflow-y-auto font-serif">
      {/* Paper Simulation */}
      <div className={`bg-white w-[794px] shadow-2xl p-[60px] flex flex-col text-slate-800 relative ${type === 'minuta_oficial' ? 'min-h-[1600px]' : 'min-h-[1123px]'}`}>
        
        {/* BUAP Watermark (Simulated) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none rotate-[-45deg] select-none">
          <span className="text-[120px] font-black tracking-widest">BUAP FACMED</span>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8 relative z-10">
          <div className="flex gap-6 items-center">
            <div className="w-20 h-20 rounded-full bg-white border border-slate-200 shadow-sm p-2 shrink-0">
              <PAUMShield className="w-full h-full" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-[0.2em] uppercase text-slate-500 mb-1">Benemérita Universidad Autónoma de Puebla</p>
              <h1 className="text-xl font-black uppercase text-slate-900 leading-tight">Facultad de Medicina</h1>
              <p className="text-xs font-bold text-slate-600 mt-1 uppercase tracking-widest">Profesional Asociado en Urgencias Médicas (PAUM)</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="p-2 border border-slate-200 text-[10px] items-end flex flex-col font-mono bg-slate-50 rounded">
              <span>REF: PAUM-RPT-{type.toUpperCase()}-2026</span>
              <span>EXP: 100534457</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-tighter">Generado el: {today}</p>
          </div>
        </div>

        {/* Report Title */}
        <div className="mb-10 relative z-10 text-center">
          <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 uppercase tracking-[0.3em] inline-block mb-4">Documento Oficial</span>
          <h2 className="text-3xl font-black text-slate-900 uppercase leading-none tracking-tight">{getReportTitle()}</h2>
          <div className="w-20 h-1.5 bg-gb-accent mx-auto mt-6" />
        </div>

        {/* Main Content Sections (Dynamic based on Type) */}
        <div className="flex-1 space-y-12 relative z-10 text-sm leading-relaxed">
          
          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-6 flex items-center gap-2">
              <Calendar size={14} /> I. Resumen Ejecutivo de Gestión
            </h3>
            <p className="text-slate-700 italic border-l-4 border-slate-200 pl-6 mb-4">
              El presente informe detalla el estado actual de las actividades académicas correspondientes al periodo <strong>Primavera 2026</strong>. Se han verificado las bitácoras de seguimiento y las tareas administrativas conforme a los acuerdos de la dirección general.
            </p>
          </section>

          {type === 'alumnos' && (
             <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-6 flex items-center gap-2">
                  <User size={14} /> II. Estado del Roster Estudiantil y Kardex
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200">
                      <th className="py-2 text-left pl-2">Matrícula</th>
                      <th className="py-2 text-left">Nombre del Alumno</th>
                      <th className="py-2 text-center">Sem.</th>
                      <th className="py-2 text-center">GPA</th>
                      <th className="py-2 text-right pr-2">Créditos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MOCK_STUDENTS.slice(0, 8).map(s => (
                      <tr key={s.id}>
                        <td className="py-3 pl-2 font-mono text-[10px]">{s.enrollmentId}</td>
                        <td className="py-3 font-bold uppercase">{s.name}</td>
                        <td className="py-3 text-center">{s.semester}°</td>
                        <td className="py-3 text-center font-bold text-slate-600">{s.gpa.toFixed(2)}</td>
                        <td className="py-3 text-right pr-2 uppercase font-black text-[9px] tracking-tighter">
                          {s.status === 'servicio_social' ? '165 / 165' : s.status === 'práctica_profesional' ? '121 / 165' : '71 / 165'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </section>
          )}

          {type === 'curriculo' && (
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-6 flex items-center gap-2">
                <FileText size={14} /> II. Cumplimiento de Metas Curriculares (Meta vs Real)
              </h3>
              <div className="space-y-6">
                <div className="flex justify-between items-end bg-slate-50 p-6 border border-slate-100 rounded">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2 leading-none">Nivel Básico (Acreditación)</p>
                    <div className="w-full h-8 bg-slate-200 rounded overflow-hidden relative">
                      <div className="h-full bg-slate-900 w-[95%]" />
                      <span className="absolute inset-0 flex items-center px-4 font-black text-white text-xs">95.4% de avance</span>
                    </div>
                  </div>
                  <div className="w-32 text-right">
                    <p className="text-xs font-black text-slate-900 leading-none mb-1">68 / 71</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Créditos</p>
                  </div>
                </div>
                <div className="flex justify-between items-end bg-slate-50 p-6 border border-slate-100 rounded">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2 leading-none">Nivel Formativo (Acreditación)</p>
                    <div className="w-full h-8 bg-slate-200 rounded overflow-hidden relative">
                      <div className="h-full bg-gb-accent w-[56%]" />
                      <span className="absolute inset-0 flex items-center px-4 font-black text-slate-900 text-xs">56.1% de avance</span>
                    </div>
                  </div>
                  <div className="w-32 text-right">
                    <p className="text-xs font-black text-slate-900 leading-none mb-1">53 / 94</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Créditos</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {type === 'sedes' && (
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-6 flex items-center gap-2">
                <MapPin size={14} /> II. Gestión de Campos Clínicos y Sedes
              </h3>
              <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="py-2 text-left pl-2">Sede Hospitalaria</th>
                      <th className="py-2 text-center">Cupo</th>
                      <th className="py-2 text-center">Convenio</th>
                      <th className="py-2 text-right pr-2">Estado SSA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 pl-2 font-bold">CRUZ ROJA MEXICANA</td>
                      <td className="py-3 text-center">12</td>
                      <td className="py-3 text-center text-emerald-600 font-bold">VIGENTE</td>
                      <td className="py-3 text-right pr-2 font-mono">1005A-2026</td>
                    </tr>
                    <tr>
                      <td className="py-3 pl-2 font-bold">HOSPITAL GENERAL CHOLULA</td>
                      <td className="py-3 text-center">08</td>
                      <td className="py-3 text-center text-emerald-600 font-bold">VIGENTE</td>
                      <td className="py-3 text-right pr-2 font-mono">2201B-2026</td>
                    </tr>
                    <tr>
                      <td className="py-3 pl-2 font-bold">ISSSTE HOSPITAL REGIONAL</td>
                      <td className="py-3 text-center">05</td>
                      <td className="py-3 text-center text-amber-600 font-bold">RENOVACIÓN</td>
                      <td className="py-3 text-right pr-2 font-mono">PENDIENTE</td>
                    </tr>
                  </tbody>
              </table>
            </section>
          )}

          {type === 'academico' && (
            <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-6 flex items-center gap-2">
                  <CheckSquare size={14} /> II. Cumplimiento de Programación y Sesiones
                </h3>
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="bg-slate-50 p-6 rounded border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2 leading-none">Cumplimiento Docente</p>
                    <p className="text-2xl font-black text-slate-900 underline decoration-gb-primary decoration-4">98.2%</p>
                    <p className="text-[10px] mt-2 text-slate-500 leading-tight">Registros de asistencia y bitácora de seguimiento.</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2 leading-none">Asistencia Grupal Avg.</p>
                    <p className="text-2xl font-black text-slate-900 underline decoration-gb-accent decoration-4">94.5%</p>
                    <p className="text-[10px] mt-2 text-slate-500 leading-tight">Promedio de asistencia de alumnos auditada.</p>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Auditoría de Sesiones Abril 2026</p>
                   <div className="flex justify-between items-center">
                      <div className="text-center">
                        <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">142</p>
                        <p className="text-[8px] font-black text-slate-500 uppercase">Programadas</p>
                      </div>
                      <div className="w-px h-10 bg-slate-200" />
                      <div className="text-center">
                        <p className="text-xl font-black text-emerald-600 uppercase tracking-tighter">138</p>
                        <p className="text-[8px] font-black text-slate-500 uppercase">Impartidas</p>
                      </div>
                      <div className="w-px h-10 bg-slate-200" />
                      <div className="text-center">
                        <p className="text-xl font-black text-red-600 uppercase tracking-tighter">04</p>
                        <p className="text-[8px] font-black text-slate-500 uppercase">Suspendidas</p>
                      </div>
                   </div>
                </div>
            </section>
          )}

          {type === 'indicadores' && (
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-6 flex items-center gap-2">
                <TrendingUp size={14} /> II. Indicadores de Eficiencia Operativa
              </h3>
              <div className="space-y-6">
                 <div className="flex gap-4">
                    <div className="flex-1 bg-slate-50 p-4 rounded border border-slate-100 flex flex-col items-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase">Tiempo Resolutivo</p>
                       <p className="text-xl font-black text-gb-primary">7.2 d</p>
                       <p className="text-[8px] text-slate-500">Promedio de cierre de minutas</p>
                    </div>
                    <div className="flex-1 bg-slate-50 p-4 rounded border border-slate-100 flex flex-col items-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase">Eficiencia en PP/SS</p>
                       <p className="text-xl font-black text-gb-primary">89%</p>
                       <p className="text-[8px] text-slate-500">Cotejo de bitácoras en tiempo</p>
                    </div>
                 </div>
                 <div className="p-4 bg-slate-900 text-white rounded">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-black uppercase tracking-widest">Acreditación Institucional</span>
                       <span className="text-xl font-black text-gb-accent">9.4</span>
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase italic">Calificación proyectada para auditoría CIIES (Corte Abril 2026)</p>
                 </div>
              </div>
            </section>
          )}

          {type === 'minutas' && (
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-6 flex items-center gap-2">
                <FileText size={14} /> II. Bitácora de Acuerdos y Seguimiento
              </h3>
              <div className="space-y-4">
                 {[
                   { ref: 'MIN-001-2026', subject: 'Apertura de Ciclo', status: 'Cerrada' },
                   { ref: 'MIN-004-2026', subject: 'Validación de Sedes', status: 'En Trámite' },
                   { ref: 'MIN-005-2026', subject: 'Comité de Evaluación', status: 'Pendiente' }
                 ].map((m, i) => (
                   <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100">
                      <div>
                        <p className="font-black text-[10px] text-slate-400 uppercase">{m.ref}</p>
                        <p className="font-bold text-slate-900">{m.subject}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                        m.status === 'Cerrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>{m.status}</span>
                   </div>
                 ))}
              </div>
            </section>
          )}

          {type === 'minuta_oficial' && minuteData?.fullData && (
            <div className="space-y-8">
              <section className="border border-slate-900">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-900">
                      <td className="p-2 font-black border-r border-slate-900 w-1/3 uppercase bg-slate-50">Minuta No.:</td>
                      <td className="p-2">{minuteData.fullData.number}</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="p-2 font-black border-r border-slate-900 uppercase bg-slate-50">Sesión:</td>
                      <td className="p-2">{minuteData.subject}</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="p-2 font-black border-r border-slate-900 uppercase bg-slate-50">Fecha:</td>
                      <td className="p-2">10 de febrero de 2026</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="p-2 font-black border-r border-slate-900 uppercase bg-slate-50">Horario:</td>
                      <td className="p-2">{minuteData.fullData.time}</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="p-2 font-black border-r border-slate-900 uppercase bg-slate-50">Modalidad y Sede:</td>
                      <td className="p-2">{minuteData.fullData.modality}</td>
                    </tr>
                    <tr className="border-b border-slate-900">
                      <td className="p-2 font-black border-r border-slate-900 uppercase bg-slate-50">Vigencia:</td>
                      <td className="p-2">{minuteData.fullData.evidenceValidity}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-black border-r border-slate-900 uppercase bg-slate-50">Versión revisada:</td>
                      <td className="p-2">{minuteData.fullData.revisedVersion}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4">I. Orden del día</h3>
                <div className="space-y-1 text-xs">
                  {minuteData.fullData.agenda.map((item, i) => (
                    <p key={i}>{i + 1}) {item}</p>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4">II. Documentos revisados y validados</h3>
                <table className="w-full text-[10px] border border-slate-300">
                  <thead className="bg-slate-50 border-b border-slate-300 font-bold uppercase">
                    <tr>
                      <th className="p-2 text-left border-r border-slate-300">Criterio</th>
                      <th className="p-2 text-left border-r border-slate-300">Documento (título)</th>
                      <th className="p-2 text-center border-r border-slate-300">Versión</th>
                      <th className="p-2 text-right">Emisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {minuteData.fullData.documents.map((doc, i) => (
                      <tr key={i} className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200">{doc.code}</td>
                        <td className="p-2 border-r border-slate-200 italic">{doc.title}</td>
                        <td className="p-2 text-center border-r border-slate-200">{doc.version}</td>
                        <td className="p-2 text-right whitespace-nowrap">{doc.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2">III. Desarrollo</h3>
                <p className="text-xs leading-relaxed text-justify">{minuteData.fullData.development}</p>
              </section>

              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4">IV. Acuerdos</h3>
                <div className="space-y-2 text-xs">
                  {minuteData.fullData.agreements.map((item, i) => (
                    <p key={i}><strong>{i + 1}.</strong> {item}</p>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4">V. Lista de asistencia</h3>
                <table className="w-full text-[10px] border border-slate-300">
                  <thead className="bg-slate-50 border-b border-slate-300 font-bold uppercase leading-none">
                    <tr>
                      <th className="p-2 text-left border-r border-slate-300">Nombre</th>
                      <th className="p-2 text-left border-r border-slate-300">Cargo / Área</th>
                      <th className="p-2 text-center">Firma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {minuteData.fullData.attendance.map((att, i) => (
                      <tr key={i} className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 font-bold">{att.name}</td>
                        <td className="p-2 border-r border-slate-200">{att.role}</td>
                        <td className="p-2 italic text-slate-300 text-center font-serif">Acreditado Digitalmente</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {/* General Notes */}
          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-6 flex items-center gap-2">
              <TriangleAlert size={14} /> Observaciones del Coordinador
            </h3>
            <div className="space-y-4 text-slate-600">
              {notes ? (
                <div className="flex gap-4">
                  <div className="w-1 h-1 rounded-full bg-slate-400 mt-2 shrink-0" />
                  <p className="whitespace-pre-wrap">{notes}</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-4">
                    <div className="w-1 h-1 rounded-full bg-slate-400 mt-2 shrink-0" />
                    <p>Se mantiene un seguimiento estrecho a las bitácoras de la sede <strong>Cruz Roja Mexicana</strong> para garantizar el cumplimiento de las 1300 horas reglamentarias de Servicio Social.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1 h-1 rounded-full bg-slate-400 mt-2 shrink-0" />
                    <p>Las evaluaciones parciales del bloque A en el Hospital Central han sido cargadas al 100% en el sistema SIIA conforme al calendario institucional.</p>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        {/* Footer / Signatures */}
        <div className="mt-20 pt-16 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-20">
            <div className="text-center">
              <div className="h-[2px] bg-slate-400 w-full mb-4" />
              <p className="text-xs font-black uppercase text-slate-900">Dr. Ariel Farit Gutierrez Alexander</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Coordinación de Programa PAUM</p>
            </div>
            <div className="text-center">
              <div className="h-[2px] bg-slate-400 w-full mb-4" />
              <p className="text-xs font-black uppercase text-slate-900">Secretaría Académica</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Facultad de Medicina, BUAP</p>
            </div>
          </div>
          
          <div className="mt-16 flex justify-between items-end border-t border-slate-100 pt-8">
            <div className="flex gap-4 items-center grayscale opacity-50">
               <div className="w-10 h-10 border-2 border-slate-900 rounded-full flex items-center justify-center font-black text-xs">BUAP</div>
               <span className="text-[8px] font-bold uppercase tracking-[0.2em] leading-tight">Excelencia en Educación<br/>Médica 2026</span>
            </div>
            <p className="text-[9px] font-mono text-slate-400 tracking-tighter">ID DOCUMENTO: {Math.random().toString(36).substring(7).toUpperCase()}-MED-2026-FHS</p>
          </div>
        </div>

      </div>
    </div>
  );
}

