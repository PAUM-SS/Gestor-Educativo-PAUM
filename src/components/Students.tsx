/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent, FormEvent, MouseEvent, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  UploadCloud,
  RefreshCw,
  MoreVertical, 
  Mail, 
  GraduationCap,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  ExternalLink,
  Plus,
  Loader2,
  CircleCheckBig,
  Trash2,
  UserPlus,
  X,
  AlertTriangle
} from 'lucide-react';
import InfoPanel from '@/src/components/InstructionInfo';
import { motion, AnimatePresence } from 'motion/react';
import { studentService } from '../services/studentService';
import { Student } from '../types';
import { MOCK_MODULES } from '../constants';

export default function Students() {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: '',
    enrollmentId: '',
    email: '',
    semester: 1,
    cohort: '2026-Otoño',
    status: 'activo',
    gpa: 8.0,
    tutor: 'Dr. Pendiente',
    attendance: 100,
    alert: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStudents = async () => {
    const loadedStudents = await studentService.getStudents();
    setStudents(loadedStudents);
  };

  useEffect(() => {
    void loadStudents();
  }, []);

  const atRiskStudents = students.filter(student =>
    student.alert || (student.status as string) === 'en_riesgo'
  );
  const studentsWithoutAlerts = students.filter(student =>
    !student.alert && (student.status as string) !== 'en_riesgo'
  );
  const healthyRate = students.length > 0
    ? Math.round((studentsWithoutAlerts.length / students.length) * 100)
    : 0;
  const averageGpa = students.length > 0
    ? students.reduce((sum, student) => sum + student.gpa, 0) / students.length
    : 0;

  const formatTutorLabel = (tutor: string) => {
    const parts = tutor.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).join(' ') || tutor;
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.enrollmentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSync = async () => {
    setIsSyncing(true);
    await loadStudents();
    setIsSyncing(false);
  };

  const handleKardexClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadState('uploading');
      
      const formData = new FormData();
      formData.append('kardex', file);

      try {
        const response = await fetch('/api/students/upload-kardex', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const result = await response.json();
          // Update the list with the new or updated student
          if (result.action === 'created') {
            setStudents(prev => [result.student, ...prev]);
          } else if (result.action === 'updated') {
            setStudents(prev => prev.map(s => s.id === result.student.id ? result.student : s));
          }
          setUploadState('success');
        } else {
          setUploadState('idle');
          const errBody = await response.json().catch(() => null);
          const message = errBody?.error || 'No se pudo procesar el Kardex.';
          const origin = window.location.origin;
          const debugTextUrl = errBody?.debug?.textUrl ? new URL(errBody.debug.textUrl, origin).toString() : '';
          const debugPdfUrl = errBody?.debug?.pdfUrl ? new URL(errBody.debug.pdfUrl, origin).toString() : '';
          const debugOcrUrl = errBody?.debug?.ocrImageUrl ? new URL(errBody.debug.ocrImageUrl, origin).toString() : '';
          const debugText = debugTextUrl ? `\n\nDebug (texto extraído): ${debugTextUrl}` : '';
          const debugPdf = debugPdfUrl ? `\nDebug (PDF guardado): ${debugPdfUrl}` : '';
          const debugOcr = debugOcrUrl ? `\nDebug (imagen OCR): ${debugOcrUrl}` : '';
          alert(`${message}${debugText}${debugPdf}${debugOcr}`);
        }
      } catch(error) {
        console.error(error);
        setUploadState('idle');
        alert('Error de conexión al procesar el Kardex.');
      }

      setTimeout(() => setUploadState('idle'), 4000);
    }
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddStudent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAdding(true);
    const newId = `stu-${Date.now()}`;
    const studentToCreate = {
      ...newStudent,
      id: newId,
      alert: (newStudent.gpa ?? 0) < 8
    } as Student;
    
    try {
      const added = await studentService.addStudent(studentToCreate);
      if (added) {
        setStudents(prev => [added, ...prev]);
        setShowAddModal(false);
        // Reset form
        setNewStudent({
          name: '', enrollmentId: '', email: '', semester: 1,
          cohort: '2026-Otoño', status: 'activo', gpa: 8.0,
          tutor: 'Dr. Pendiente', attendance: 100, alert: false
        });
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (e: MouseEvent<HTMLButtonElement>, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`¿Estás completamente seguro de dar de BAJA a ${name}? Esta acción eliminará su expediente de la base de datos de manera permanente.`)) {
      try {
        const success = await studentService.deleteStudent(id);
        if (success) {
          setStudents(prev => prev.filter(s => s.id !== id));
        }
      } catch(err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Roster de Alumnos</h2>
          <p className="text-slate-500 mt-1">Gestión de expedientes, promedios e historial académico (Kardex).</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf"
          />
          <button 
            onClick={handleSync}
            disabled={isSyncing || uploadState !== 'idle'}
            className="flex items-center gap-2 bg-white text-gb-secondary border border-slate-200 px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={18} className={isSyncing ? "animate-spin text-gb-primary" : "text-gb-primary"} />
            {isSyncing ? "Recargando base..." : "Recargar Base Local"}
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-sm"
          >
            <UserPlus size={18} />
            Registrar Alumno
          </button>
          <button 
            onClick={handleKardexClick}
            disabled={uploadState !== 'idle'}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-80 ${
              uploadState === 'success' ? 'bg-emerald-500 text-white' : 'bg-gb-primary text-white hover:bg-gb-primary/90 shadow-gb-primary/20'
            }`}
          >
            {uploadState === 'uploading' ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Validando Kardex...
              </>
            ) : uploadState === 'success' ? (
              <>
                <CircleCheckBig size={18} />
                ¡Expediente Actualizado!
              </>
            ) : (
              <>
                <UploadCloud size={18} />
                Subir Kardex Manual
              </>
            )}
          </button>
        </div>
      </header>

      <InfoPanel 
        title="Gestión y Sincronización" 
        content="Los datos como Promedio (GPA), Materias Aprobadas, Semestre Oficial y Cohorte se extraen del Cardex Simple (Historial Académico) de la Dirección de Administración Escolar (SIIA BUAP). La sincronización 'Sincronizar SIIA BUAP' actualiza a las y los alumnos automáticamente. Si un alumno no aparece, puede forzarse su ingreso escaneando su PDF con la herramienta 'Subir Kardex Manual'."
      />

      {/* Tool Bar */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, apellidos o matrícula..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all font-medium text-sm text-slate-700"
          />
        </div>
        <button className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold text-sm hover:bg-slate-50 flex gap-2 items-center">
          <Filter size={18} />
          Filtros
        </button>
      </div>

      {/* Students Table */}
      <div className="geometric-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="table-header-gb">
                <th className="px-5 py-4">Nombre Completo / Matrícula</th>
                <th className="px-4 py-4">Cohorte / Tutor Asignado</th>
                <th className="px-4 py-4 text-center">Estatus</th>
                <th className="px-4 py-4 text-center">Semestre</th>
                <th className="px-4 py-4 text-center">Promedio</th>
                <th className="px-4 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="table-row-gb group cursor-pointer" onClick={() => setSelectedStudent(student)}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-gb-secondary font-bold text-xs relative shrink-0 border border-slate-200 group-hover:border-gb-primary/30 transition-colors">
                        {student.name.charAt(0)}
                        {student.alert && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white animate-pulse" title="Riesgo Académico" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gb-secondary text-sm truncate">{student.name}</p>
                        <div className="flex gap-2 items-center mt-0.5">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono bg-slate-100 px-1.5 py-0.5 rounded">{student.enrollmentId}</p>
                          <p className="text-[10px] text-slate-400 truncate">{student.email}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[11px] font-bold text-gb-secondary bg-blue-50 text-blue-700 w-fit px-2 py-0.5 rounded-md mb-1">{student.cohort}</p>
                    <p className="text-[10px] text-slate-500 uppercase truncate max-w-[150px]" title={student.tutor}>Tutor: {formatTutorLabel(student.tutor)}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                      student.status === 'activo' ? 'bg-[#E8F4FD] text-gb-primary' :
                      (student.status as string) === 'en_riesgo' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                      student.status === 'en_rotacion' ? 'bg-purple-50 text-purple-600' :
                      student.status === 'práctica_profesional' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      student.status === 'servicio_social' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {student.status.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-600 font-bold">
                    {student.semester}º
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const isGpaUnknown = Boolean(student.kardex) && student.kardex?.extracted?.gpa === undefined;
                      const className = isGpaUnknown
                        ? 'bg-slate-50 text-slate-500 border border-slate-200'
                        : student.gpa >= 9.0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : student.gpa >= 8.0
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100';

                      return (
                        <div className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold ${className}`}>
                          {isGpaUnknown ? 'N/D' : student.gpa.toFixed(2)}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={(e) => handleDelete(e, student.id, student.name)}
                      className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-colors border border-rose-100 hover:border-rose-500"
                      title="Dar de Baja (Eliminar Expediente)"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStudents.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Search size={32} />
            </div>
            <p className="text-slate-500 font-medium">No encontramos alumnos con ese criterio.</p>
          </div>
        )}
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
          <div className="flex items-center gap-3 text-emerald-700 mb-2">
            <CheckCircle size={20} />
            <span className="font-display font-bold">Sin adeudos</span>
          </div>
          <p className="text-2xl font-display font-bold text-emerald-900">
            {students.length > 0 ? Math.round((students.filter(s => s.status === 'activo').length / students.length) * 100) : 0}%
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Expedientes al corriente</p>
        </div>
        <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100 relative overflow-hidden">
          <div className="flex items-center gap-3 text-amber-700 mb-2 relative z-10">
            <Clock size={20} />
            <span className="font-display font-bold">En riesgo</span>
          </div>
          <p className="text-2xl font-display font-bold text-amber-900 relative z-10">
            {students.filter(s => s.gpa < 8.0).length}
          </p>
          <p className="text-xs text-amber-600 font-medium mt-1 relative z-10">Alumnos con promedio inferior a 8.0</p>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Clock size={100} />
          </div>
        </div>
        <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100 relative overflow-hidden">
          <div className="flex items-center gap-3 text-blue-700 mb-2 relative z-10">
            <GraduationCap size={20} />
            <span className="font-display font-bold">Promedio Generacional</span>
          </div>
          <p className="text-2xl font-display font-bold text-blue-900 relative z-10">
            {students.length > 0 ? (students.reduce((acc, s) => acc + s.gpa, 0) / students.length).toFixed(2) : '0.00'}
          </p>
          <p className="text-xs text-blue-600 font-medium mt-1 relative z-10">Corte al semestre actual</p>
          <div className="absolute -right-2 -bottom-2 opacity-10">
            <GraduationCap size={100} />
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="bg-gb-secondary p-6 text-white text-center relative">
                <h3 className="text-xl font-bold font-display">Alta de Nuevo Alumno</h3>
                <p className="text-white/60 text-xs mt-1 uppercase tracking-widest font-black">Creación de Expediente</p>
              </div>

              <form onSubmit={handleAddStudent} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">Nombre Completo</label>
                    <input 
                      required type="text" placeholder="Ej. Ana García López"
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none"
                      value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">Matrícula</label>
                      <input 
                        required type="text" placeholder="202600000"
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none"
                        value={newStudent.enrollmentId} onChange={e => setNewStudent({...newStudent, enrollmentId: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">Correo Institucional</label>
                      <input 
                        required type="email" placeholder="alumno@correo.buap.mx"
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none"
                        value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">Semestre</label>
                      <input 
                        required type="number" min="1" max="12"
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none"
                        value={newStudent.semester} onChange={e => setNewStudent({...newStudent, semester: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">Promedio Inicio</label>
                      <input 
                        required type="number" step="0.1" min="0" max="10"
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none"
                        value={newStudent.gpa} onChange={e => setNewStudent({...newStudent, gpa: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">Cohorte</label>
                      <input 
                        required type="text"
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none"
                        value={newStudent.cohort} onChange={e => setNewStudent({...newStudent, cohort: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 h-12 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                  <button disabled={isAdding} className={`flex-[2] h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isAdding ? 'bg-slate-100 text-slate-400' : 'bg-gb-primary text-white hover:bg-gb-primary/90'}`}>
                    {isAdding ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
                    Guardar Alta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* MODAL DEL ALUMNO */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-display font-bold text-slate-800">Ficha Técnica del Alumno</h2>
              <button onClick={() => setSelectedStudent(null)} className="btn-icon text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="flex gap-6 items-start mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl shrink-0">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedStudent.name}</h3>
                  <p className="text-slate-500 font-mono">{selectedStudent.enrollmentId} • {selectedStudent.email}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">Semestre: {selectedStudent.semester}</span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">Cohorte: {selectedStudent.cohort}</span>
                    {selectedStudent.kardex?.extracted?.studentStatusLabel && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">
                        Tipo: {selectedStudent.kardex.extracted.studentStatusLabel}
                      </span>
                    )}
                    {selectedStudent.kardex?.extracted?.progressPercent !== undefined && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">
                        Avance: {selectedStudent.kardex.extracted.progressPercent}%
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded text-xs font-bold ${selectedStudent.alert ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {selectedStudent.alert ? 'RIESGO POR PERMANENCIA / REPROBADAS' : 'AL CORRIENTE'}
                    </span>
                  </div>
                  {selectedStudent.kardex?.parsedAt && (
                    <p className="text-[11px] text-slate-400 mt-2">
                      Kardex procesado: {new Date(selectedStudent.kardex.parsedAt).toLocaleString()}
                    </p>
                  )}
                  {selectedStudent.kardex && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedStudent.kardex.sourcePdfUrl && (
                        <a
                          href={selectedStudent.kardex.sourcePdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          <ExternalLink size={14} /> Ver PDF
                        </a>
                      )}
                      {selectedStudent.kardex.sourceOcrImageUrl && (
                        <a
                          href={selectedStudent.kardex.sourceOcrImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          <ExternalLink size={14} /> Ver imagen OCR
                        </a>
                      )}
                      {selectedStudent.kardex.sourceTextUrl && (
                        <a
                          href={selectedStudent.kardex.sourceTextUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          <FileText size={14} /> Ver texto extraído ({selectedStudent.kardex.extractedTextLength})
                        </a>
                      )}
                    </div>
                  )}
                  {selectedStudent.alert && selectedStudent.kardex?.riskReasons?.length ? (
                    <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-800">
                      <div className="font-bold mb-1 flex items-center gap-2">
                        <AlertTriangle size={14} /> Motivos de riesgo
                      </div>
                      {selectedStudent.kardex.riskReasons.map((reason, idx) => (
                        <div key={idx}>• {reason}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-500"/> Materias detectadas en Kardex
                </h4>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 grid grid-cols-2 gap-2 text-sm text-emerald-900">
                  {(() => {
                    const modules = selectedStudent.kardex?.matchedModuleIds?.length
                      ? MOCK_MODULES.filter(m => selectedStudent.kardex!.matchedModuleIds.includes(m.id))
                      : MOCK_MODULES.filter(m => (m.semester !== 'Servicio' ? (m.semester as number) < selectedStudent.semester : false));

                    if (modules.length === 0) {
                      return (
                        <div className="text-slate-500 italic text-xs col-span-2">
                          Sin materias detectadas en el Kardex (o aún en primer semestre).
                        </div>
                      );
                    }

                    return modules.map(m => (
                      <div key={m.id}>• {m.title}</div>
                    ));
                  })()}
                </div>

                <h4 className="font-bold text-slate-800 flex items-center gap-2 mt-4">
                  <Clock size={18} className="text-amber-500"/> Materias no detectadas / pendientes
                </h4>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 grid grid-cols-2 gap-2 text-sm text-amber-900">
                  {(() => {
                    const modules = selectedStudent.kardex?.missingModuleIds?.length
                      ? MOCK_MODULES.filter(m => selectedStudent.kardex!.missingModuleIds.includes(m.id))
                      : MOCK_MODULES.filter(m => (m.semester === 'Servicio' || (m.semester as number) >= selectedStudent.semester));

                    return modules.map(m => (
                      <div key={m.id}>• {m.title}</div>
                    ));
                  })()}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-colors"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

