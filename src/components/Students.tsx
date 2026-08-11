import { useState, useRef, ChangeEvent, FormEvent, MouseEvent, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  UploadCloud,
  GraduationCap,
  CheckCircle,
  Clock,
  FileText,
  ExternalLink,
  Loader2,
  CircleCheckBig,
  Trash2,
  UserPlus,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  BookOpen,
  BookCheck,
  BookX,
} from 'lucide-react';
import InfoPanel from '@/src/components/InstructionInfo';
import { motion, AnimatePresence } from 'motion/react';
import { studentService } from '../services/studentService';
import { useApiError } from '../hooks/useApiError';
import { useToast } from '../context/ToastContext';
import { Student } from '@/shared/types';
import { MOCK_MODULES } from '@/shared/constants';
import { ConfirmModal } from './ConfirmModal';
import { Button } from './utils/Buttons';
import { PanelFooter } from './utils/PanelFooter';
import { FilterPanel, FilterConfig } from './utils/FilterPanel';

// ─── Tipos para ordenamiento ────────────────────────────────────────────────
type SortKey = 'name' | 'cohort' | 'status' | 'semester' | 'gpa' | null;
type SortDir = 'asc' | 'desc';

// ─── Tipos para filtros ──────────────────────────────────────────────────────
interface ActiveFilters {
  cohort: string;
  tutor: string;
  status: string;
  semester: string;
  gpaMin: string;
  gpaMax: string;
}

const DEFAULT_FILTERS: ActiveFilters = {
  cohort: '',
  tutor: '',
  status: '',
  semester: '',
  gpaMin: '',
  gpaMax: '',
};

// ─── Utilidad: parsear cohorte → valor numérico para ordenar ────────────────
const SEASON_ORDER: Record<string, number> = {
  primavera: 0,
  verano: 1,
  otoño: 2,
  invierno: 3,
};

function cohortToNumber(cohort: string): number {
  const [yearStr, season = ''] = cohort.split('-');
  const year = parseInt(yearStr, 10) || 0;
  const seasonVal = SEASON_ORDER[season.toLowerCase()] ?? 0;
  return year * 10 + seasonVal;
}

// ─── Componente de icono de ordenamiento ────────────────────────────────────
function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== column) return <ChevronsUpDown size={14} className="opacity-40" />;
  return sortDir === 'asc'
    ? <ChevronUp size={14} className="text-gb-primary" />
    : <ChevronDown size={14} className="text-gb-primary" />;
}

export default function Students() {
  const { showToast } = useToast();

  // Un hook por tipo de operación para tener loading states independientes
  const { loading: isLoadingStudents, execute: executeLoad } = useApiError(true);
  const { loading: isAdding, execute: executeAdd } = useApiError();
  const { loading: isDeleting, execute: executeDelete } = useApiError();
  const { loading: isImporting, execute: executeImport } = useApiError();
  const { loading: isExporting, execute: executeExport } = useApiError();

  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Estado para el modal de confirmación de borrado
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  // ─── Estado edición de ficha de alumno ───────────────────────────────────
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [editStudentDraft, setEditStudentDraft] = useState<Partial<Student>>({});
  const { loading: isUpdating, execute: executeUpdate } = useApiError();

  // ─── Estado filtros y panel ───────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(DEFAULT_FILTERS);

  // ─── Estado ordenamiento ──────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: '', enrollmentId: '', email: '', semester: 1,
    cohort: '2026-Otoño', status: 'activo', gpa: 8.0,
    tutor: 'Dr. Pendiente', attendance: 100, alert: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const loadStudents = async () => {
    const result = await executeLoad(
      () => studentService.getStudents(),
      'No se pudo cargar el listado de alumnos. Verifica tu conexión.'
    );
    if (result) setStudents(result);
  };

  useEffect(() => {
    void loadStudents();
  }, []);

  // --- Métricas derivadas ---
  const studentsWithoutAlerts = students.filter(s => !s.alert && (s.status as string) !== 'en_riesgo');
  const averageGpa = students.length > 0
    ? students.reduce((sum, s) => sum + s.gpa, 0) / students.length
    : 0;

  const formatTutorLabel = (tutor: string) => {
    const parts = tutor.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).join(' ') || tutor;
  };

  // ─── Valores únicos para los selects de filtro ───────────────────────────
  const uniqueCohorts = useMemo(() =>
    [...new Set(students.map(s => s.cohort))].sort((a, b) => cohortToNumber(a) - cohortToNumber(b)),
    [students]
  );
  const uniqueTutors = useMemo(() =>
    [...new Set(students.map(s => s.tutor))].sort(),
    [students]
  );
  const uniqueStatuses = useMemo(() =>
    [...new Set(students.map(s => s.status as string))].sort(),
    [students]
  );
  const uniqueSemesters = useMemo(() =>
    [...new Set(students.map(s => s.semester))].sort((a, b) => a - b),
    [students]
  );

  // ─── Cantidad de filtros activos ─────────────────────────────────────────
  const activeFilterCount = Object.values(activeFilters).filter(v => v !== '').length;

  // ─── Pipeline: búsqueda → filtros → ordenamiento ─────────────────────────
  const processedStudents = useMemo(() => {
    let result = students;

    // 1. Búsqueda por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.enrollmentId.toLowerCase().includes(term)
      );
    }

    // 2. Filtros avanzados
    if (activeFilters.cohort) result = result.filter(s => s.cohort === activeFilters.cohort);
    if (activeFilters.tutor) result = result.filter(s => s.tutor === activeFilters.tutor);
    if (activeFilters.status) result = result.filter(s => (s.status as string) === activeFilters.status);
    if (activeFilters.semester) result = result.filter(s => s.semester === Number(activeFilters.semester));
    if (activeFilters.gpaMin !== '') result = result.filter(s => s.gpa >= Number(activeFilters.gpaMin));
    if (activeFilters.gpaMax !== '') result = result.filter(s => s.gpa <= Number(activeFilters.gpaMax));

    // 3. Ordenamiento
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'name':
            cmp = a.name.localeCompare(b.name, 'es');
            break;
          case 'cohort':
            cmp = cohortToNumber(a.cohort) - cohortToNumber(b.cohort);
            break;
          case 'status':
            cmp = (a.status as string).localeCompare(b.status as string, 'es');
            break;
          case 'semester':
            cmp = a.semester - b.semester;
            break;
          case 'gpa':
            cmp = a.gpa - b.gpa;
            break;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [students, searchTerm, activeFilters, sortKey, sortDir]);

  // ─── Toggle ordenamiento por columna ────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // ─── Abrir/cerrar panel de filtros ──────────────────────────────────────
  const handleToggleFilters = () => {
    setShowFilters(prev => !prev);
  };

  const handleApplyFilters = (newFilters: Record<string, any>) => {
    setActiveFilters(newFilters as ActiveFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setActiveFilters(DEFAULT_FILTERS);
    setShowFilters(false);
  };

  // ─── Edición de ficha de alumno ──────────────────────────────────────────
  const handleStartEdit = () => {
    if (!selectedStudent) return;
    setEditStudentDraft({ ...selectedStudent });
    setIsEditingStudent(true);
  };

  const handleCancelEdit = () => {
    setIsEditingStudent(false);
    setEditStudentDraft({});
  };

  const handleSaveStudentEdit = async () => {
    if (!selectedStudent) return;
    const updated = await executeUpdate(
      () => studentService.updateStudent(selectedStudent.id, editStudentDraft),
      'No se pudo actualizar el expediente. Intenta de nuevo.'
    );
    if (updated) {
      setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
      setSelectedStudent(updated);
      setIsEditingStudent(false);
      setEditStudentDraft({});
      showToast('Expediente actualizado correctamente.', 'success');
    }
  };

  const handleKardexClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadState('uploading');
    const formData = new FormData();
    formData.append('kardex', file);

    try {
      const response = await fetch('/api/students/upload-kardex', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.action === 'created') {
          setStudents(prev => [result.student, ...prev]);
        } else if (result.action === 'updated') {
          setStudents(prev => prev.map(s => s.id === result.student.id ? result.student : s));
        }
        setUploadState('success');
        showToast('Kardex procesado y expediente actualizado.', 'success');
      } else {
        setUploadState('idle');
        const errBody = await response.json().catch(() => null);
        const message = errBody?.error || 'No se pudo procesar el Kardex.';

        showToast(message, 'error');
      }
    } catch {
      setUploadState('idle');
      showToast('Error de conexión al procesar el Kardex.', 'error');
    }

    setTimeout(() => setUploadState('idle'), 4000);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddStudent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const studentToCreate = {
      ...newStudent,
      id: `stu-${Date.now()}`,
      alert: (newStudent.gpa ?? 0) < 8,
    } as Student;

    const added = await executeAdd(
      () => studentService.addStudent(studentToCreate),
      'No se pudo registrar el alumno. Intenta de nuevo.'
    );

    if (added) {
      setStudents(prev => [added, ...prev]);
      showToast(`${added.name} registrado correctamente.`, 'success');
      setShowAddModal(false);
      setNewStudent({
        name: '', enrollmentId: '', email: '', semester: 1,
        cohort: '2026-Otoño', status: 'activo', gpa: 8.0,
        tutor: 'Dr. Pendiente', attendance: 100, alert: false,
      });
    }
  };

  // Abre el modal de confirmación en lugar de window.confirm()
  const handleDeleteClick = (e: MouseEvent<HTMLButtonElement>, id: string, name: string) => {
    e.stopPropagation();
    setConfirmDelete({ id, name });
  };

  // Se llama cuando el usuario confirma en el modal
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const { id, name } = confirmDelete;
    setConfirmDelete(null);

    const success = await executeDelete(
      () => studentService.deleteStudent(id),
      `No se pudo dar de baja a ${name}. Intenta de nuevo.`
    );

    if (success) {
      setStudents(prev => prev.filter(s => s.id !== id));
      showToast(`Expediente de ${name} eliminado.`, 'success');
    }
  };

  const handleCloseDetails = () => {
    setSelectedStudent(null);
    handleCancelEdit();
  }

  const handleImportDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const result = await executeImport(
      () => studentService.importStudents(file),
      'No se pudo importar la base de datos de alumnos.'
    );
    if (result) {
      showToast(`${result.created} alumnos importados, ${result.updated} actualizados.`, 'success');
      void loadStudents();
    }
  };


  const handleExport = async () => {
    const result = await executeExport(
      () => studentService.exportStudents(),
      'No se pudo exportar la base de datos de alumnos.'
    );
    if (result) {
      const url = window.URL.createObjectURL(result);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'alumnos.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Exportación exitosa', 'success');
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
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf" />
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.json,.xlsx,application/json,text/csv"
            className="hidden"
            onChange={handleImportDatabase}
          />
          <Button
            buttonConfig='import'
            onClick={() => importInputRef.current?.click()}
            loading={isImporting}
          />
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
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-80 ${uploadState === 'success' ? 'bg-emerald-500 text-white' : 'bg-gb-primary text-white hover:bg-gb-primary/90 shadow-gb-primary/20'
              }`}
          >
            {uploadState === 'uploading' ? (
              <><Loader2 size={18} className="animate-spin" />Validando Kardex...</>
            ) : uploadState === 'success' ? (
              <><CircleCheckBig size={18} />¡Expediente Actualizado!</>
            ) : (
              <><UploadCloud size={18} />Subir Kardex Manual</>
            )}
          </button>
        </div>
      </header>

      <InfoPanel
        title="Gestión y Sincronización"
        content="Los datos como Promedio (GPA), Materias Aprobadas, Semestre Oficial y Cohorte se extraen del Cardex Simple (Historial Académico) de la Dirección de Administración Escolar (SIIA BUAP). Si un alumno no aparece, puede forzarse su ingreso escaneando su PDF con la herramienta 'Subir Kardex Manual'."
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
        {/* Botón de Filtros con badge de filtros activos */}
        <button
          onClick={handleToggleFilters}
          className={`relative px-5 py-3 border rounded-2xl font-bold text-sm flex gap-2 items-center transition-all ${showFilters || activeFilterCount > 0
            ? 'bg-gb-primary/10 border-gb-primary/40 text-gb-primary hover:bg-gb-primary/15'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
        >
          <Filter size={18} />
          Filtros
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gb-primary text-white text-[10px] font-black rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Panel de Filtros*/}
      <FilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={[
          {
            id: 'cohort',
            label: 'Cohorte',
            type: 'select',
            options: uniqueCohorts.map(c => ({ value: c, label: c }))
          },
          {
            id: 'tutor',
            label: 'Tutor',
            type: 'select',
            options: uniqueTutors.map(t => ({ value: t, label: formatTutorLabel(t) }))
          },
          {
            id: 'status',
            label: 'Estatus',
            type: 'select',
            options: uniqueStatuses.map(s => ({ value: s, label: s.replaceAll('_', ' ') }))
          },
          {
            id: 'semester',
            label: 'Semestre',
            type: 'select',
            options: uniqueSemesters.map(s => ({ value: String(s), label: `${s}º Semestre` }))
          },
          {
            id: 'gpaMin',
            label: 'Promedio mín.',
            type: 'number',
            min: 0,
            max: 10,
            step: 0.1,
            placeholder: '0.0'
          },
          {
            id: 'gpaMax',
            label: 'Promedio máx.',
            type: 'number',
            min: 0,
            max: 10,
            step: 0.1,
            placeholder: '10.0'
          }
        ]}
        activeFilters={activeFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        totalResults={students.length}
        filteredResults={processedStudents.length}
      />



      {/* Students Table */}
      <div className="geometric-card overflow-hidden">
        {isLoadingStudents ? (
          // Estado de carga inicial — skeleton en lugar de tabla vacía
          <div className="p-12 text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-3 text-gb-primary" />
            <p className="text-sm font-medium text-slate-400">Cargando alumnos...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="table-header-gb">
                  <th className="px-5 py-4">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 font-bold hover:text-gb-primary transition-colors">
                      Nombre Completo / Matrícula
                      <SortIcon column="name" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-4">
                    <button onClick={() => handleSort('cohort')} className="flex items-center gap-1.5 font-bold hover:text-gb-primary transition-colors">
                      Cohorte / Tutor Asignado
                      <SortIcon column="cohort" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <button onClick={() => handleSort('status')} className="flex items-center gap-1.5 font-bold hover:text-gb-primary transition-colors mx-auto">
                      Estatus
                      <SortIcon column="status" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <button onClick={() => handleSort('semester')} className="flex items-center gap-1.5 font-bold hover:text-gb-primary transition-colors mx-auto">
                      Semestre
                      <SortIcon column="semester" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <button onClick={() => handleSort('gpa')} className="flex items-center gap-1.5 font-bold hover:text-gb-primary transition-colors mx-auto">
                      Promedio
                      <SortIcon column="gpa" sortKey={sortKey} sortDir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedStudents.map((student) => (
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
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${student.status === 'activo' ? 'bg-[#E8F4FD] text-gb-primary' :
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
                          : student.gpa >= 9.0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : student.gpa >= 8.0 ? 'bg-blue-50 text-blue-700 border border-blue-100'
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
                        onClick={(e) => handleDeleteClick(e, student.id, student.name)}
                        disabled={isDeleting}
                        className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-colors border border-rose-100 hover:border-rose-500 disabled:opacity-50"
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
        )}

        {!isLoadingStudents && processedStudents.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Search size={32} />
            </div>
            <p className="text-slate-500 font-medium">No encontramos alumnos con ese criterio.</p>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="mt-3 text-sm text-gb-primary font-bold hover:underline"
              >
                Limpiar filtros
              </button>
            )}
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
          <div className="absolute -right-4 -bottom-4 opacity-10"><Clock size={100} /></div>
        </div>
        <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100 relative overflow-hidden">
          <div className="flex items-center gap-3 text-blue-700 mb-2 relative z-10">
            <GraduationCap size={20} />
            <span className="font-display font-bold">Promedio Generacional</span>
          </div>
          <p className="text-2xl font-display font-bold text-blue-900 relative z-10">
            {averageGpa > 0 ? averageGpa.toFixed(2) : '0.00'}
          </p>
          <p className="text-xs text-blue-600 font-medium mt-1 relative z-10">Corte al semestre actual</p>
          <div className="absolute -right-2 -bottom-2 opacity-10"><GraduationCap size={100} /></div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          buttonConfig="export"
          onClick={handleExport}
          loading={isExporting}
          label="Exportar Alumnos"
        />
      </div>

      {/* Modal: Confirmar eliminación */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmModal
            message={
              <>
                ¿Estás seguro de dar de baja a <strong>{confirmDelete.name}</strong>? Esta acción eliminará su expediente de manera permanente.
              </>
            }
            onConfirm={handleDeleteConfirm}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>

      {/* Modal: Agregar alumno */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="bg-gb-secondary p-6 text-white text-center">
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
                      value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">Matrícula</label>
                      <input
                        required type="text" placeholder="202600000"
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none"
                        value={newStudent.enrollmentId} onChange={e => setNewStudent({ ...newStudent, enrollmentId: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">Correo Institucional</label>
                      <input
                        required type="email" placeholder="alumno@correo.buap.mx"
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none"
                        value={newStudent.email} onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">Semestre</label>
                      <input
                        required type="number" min="1" max="12"
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none"
                        value={newStudent.semester} onChange={e => setNewStudent({ ...newStudent, semester: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">Promedio Inicio</label>
                      <input
                        required type="number" step="0.1" min="0" max="10"
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none"
                        value={newStudent.gpa} onChange={e => setNewStudent({ ...newStudent, gpa: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">Cohorte</label>
                      <input
                        required type="text"
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none"
                        value={newStudent.cohort} onChange={e => setNewStudent({ ...newStudent, cohort: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button
                    type="button" onClick={() => setShowAddModal(false)}
                    className="flex-1 h-12 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={isAdding}
                    className={`flex-[2] h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isAdding ? 'bg-slate-100 text-slate-400' : 'bg-gb-primary text-white hover:bg-gb-primary/90'}`}
                  >
                    {isAdding ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
                    Guardar Alta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Ficha del alumno */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">

            {/* ── Header ── */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-display font-bold text-slate-800">Ficha Técnica del Alumno</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5 uppercase tracking-widest">
                  {isEditingStudent ? 'Modo Edición' : 'Expediente Académico'}
                </p>
              </div>
              <Button
                buttonConfig="closeIcon"
                onClick={handleCloseDetails}
              />
            </div>

            {/* ── Body ── */}
            <div className="p-6 overflow-y-auto space-y-6">

              {/* ── Sección: Datos del alumno ── */}
              <div className="flex gap-5 items-start">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-2xl shrink-0 border border-blue-100">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  {/* Nombre + badge de estado en misma línea */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {isEditingStudent ? (
                      <input
                        value={editStudentDraft.name ?? ''}
                        onChange={e => setEditStudentDraft(d => ({ ...d, name: e.target.value }))}
                        className="flex-1 min-w-0 text-xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none"
                      />
                    ) : (
                      <h3 className="text-2xl font-bold text-slate-900 truncate">{selectedStudent.name}</h3>
                    )}
                    <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedStudent.alert ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                      {selectedStudent.alert ? 'En riesgo' : 'Al corriente'}
                    </span>
                  </div>

                  {/* Matrícula + email */}
                  <p className="text-slate-500 font-mono text-sm mt-0.5">
                    {selectedStudent.enrollmentId}
                    {isEditingStudent ? (
                      <input
                        type="email"
                        value={editStudentDraft.email ?? ''}
                        onChange={e => setEditStudentDraft(d => ({ ...d, email: e.target.value }))}
                        className="ml-2 text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none font-sans"
                      />
                    ) : (
                      <span className="ml-2">• {selectedStudent.email}</span>
                    )}
                  </p>

                  {/* Chips: Cohorte, Semestre, Tipo, Avance */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {/* Cohorte primero */}
                    {isEditingStudent ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Cohorte</span>
                        <input
                          value={editStudentDraft.cohort ?? ''}
                          onChange={e => setEditStudentDraft(d => ({ ...d, cohort: e.target.value }))}
                          className="w-32 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 focus:ring-2 focus:ring-gb-primary/20 outline-none"
                        />
                      </div>
                    ) : (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold">
                        Cohorte: {selectedStudent.cohort}
                      </span>
                    )}
                    {/* Semestre */}
                    {isEditingStudent ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Semestre</span>
                        <input
                          type="number" min="1" max="12"
                          value={editStudentDraft.semester ?? 1}
                          onChange={e => setEditStudentDraft(d => ({ ...d, semester: Number(e.target.value) }))}
                          className="w-16 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 focus:ring-2 focus:ring-gb-primary/20 outline-none"
                        />
                      </div>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                        {selectedStudent.semester}º Semestre
                      </span>
                    )}
                    {selectedStudent.kardex?.extracted?.studentStatusLabel && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                        Tipo: {selectedStudent.kardex.extracted.studentStatusLabel}
                      </span>
                    )}
                    {selectedStudent.kardex?.extracted?.progressPercent !== undefined && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                        Avance: {selectedStudent.kardex.extracted.progressPercent}%
                      </span>
                    )}
                  </div>

                  {/* Campos editables: Estatus, Tutor, GPA, Asistencia */}
                  {isEditingStudent && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Estatus</label>
                        <select
                          value={editStudentDraft.status ?? 'activo'}
                          onChange={e => setEditStudentDraft(d => ({ ...d, status: e.target.value as Student['status'] }))}
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none"
                        >
                          <option value="activo">Activo</option>
                          <option value="egresado">Egresado</option>
                          <option value="baja">Baja</option>
                          <option value="en_riesgo">En Riesgo</option>
                          <option value="en_rotacion">En Rotación</option>
                          <option value="servicio_social">Servicio Social</option>
                          <option value="práctica_profesional">Práctica Profesional</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Tutor Asignado</label>
                        <input
                          value={editStudentDraft.tutor ?? ''}
                          onChange={e => setEditStudentDraft(d => ({ ...d, tutor: e.target.value }))}
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Promedio (GPA)</label>
                        <input
                          type="number" step="0.01" min="0" max="10"
                          value={editStudentDraft.gpa ?? 0}
                          onChange={e => setEditStudentDraft(d => ({ ...d, gpa: Number(e.target.value) }))}
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Asistencia (%)</label>
                        <input
                          type="number" step="1" min="0" max="100"
                          value={editStudentDraft.attendance ?? 100}
                          onChange={e => setEditStudentDraft(d => ({ ...d, attendance: Number(e.target.value) }))}
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Info de kardex y motivos de riesgo (solo en modo vista) */}
                  {!isEditingStudent && (
                    <>
                      {selectedStudent.kardex?.parsedAt && (
                        <p className="text-[11px] text-slate-400 mt-2">
                          Kardex procesado: {new Date(selectedStudent.kardex.parsedAt).toLocaleString()}
                        </p>
                      )}
                      {selectedStudent.kardex && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedStudent.kardex.sourcePdfUrl && (
                            <a href={selectedStudent.kardex.sourcePdfUrl} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
                              <ExternalLink size={13} /> Ver PDF
                            </a>
                          )}
                          {selectedStudent.kardex.sourceOcrImageUrl && (
                            <a href={selectedStudent.kardex.sourceOcrImageUrl} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
                              <ExternalLink size={13} /> Ver imagen OCR
                            </a>
                          )}
                          {selectedStudent.kardex.sourceTextUrl && (
                            <a href={selectedStudent.kardex.sourceTextUrl} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
                              <FileText size={13} /> Ver texto extraído ({selectedStudent.kardex.extractedTextLength})
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
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* ── Sección: Materias en curso ── */}
              <div>
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <BookOpen size={17} className="text-gb-primary" />
                  Materias en curso
                </h4>
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-2.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">NRC</th>
                        <th className="px-4 py-2.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Materia</th>
                        <th className="px-4 py-2.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Docente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-xs text-slate-400 italic">
                          Sin inscripciones activas registradas. Esta sección se actualizará automáticamente cuando se vincule el calendario de materias al alumno.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Sección: Materias cursadas ── */}
              <div>
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <BookCheck size={17} className="text-emerald-500" />
                  Materias cursadas
                </h4>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  {(() => {
                    const modules = selectedStudent.kardex?.matchedModuleIds?.length
                      ? MOCK_MODULES.filter(m => selectedStudent.kardex!.matchedModuleIds.includes(m.id))
                      : MOCK_MODULES.filter(m => (m.semester !== 'Servicio' ? (m.semester as number) < selectedStudent.semester : false));
                    if (modules.length === 0) {
                      return <p className="text-slate-400 italic text-xs">Sin materias detectadas en el Kardex (o aún en primer semestre).</p>;
                    }
                    return (
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-emerald-900">
                        {modules.map(m => (
                          <li key={m.id} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                            <span>{m.title}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              </div>

              {/* ── Sección: Materias pendientes ── */}
              <div>
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <BookX size={17} className="text-amber-500" />
                  Materias pendientes
                </h4>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  {(() => {
                    const modules = selectedStudent.kardex?.missingModuleIds?.length
                      ? MOCK_MODULES.filter(m => selectedStudent.kardex!.missingModuleIds.includes(m.id))
                      : MOCK_MODULES.filter(m => (m.semester === 'Servicio' || (m.semester as number) >= selectedStudent.semester));
                    if (modules.length === 0) {
                      return <p className="text-slate-400 italic text-xs">No hay materias pendientes registradas.</p>;
                    }
                    return (
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-amber-900">
                        {modules.map(m => (
                          <li key={m.id} className="flex items-start gap-1.5">
                            <span className="text-amber-400 mt-0.5 shrink-0">○</span>
                            <span>{m.title}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              </div>

            </div>

            {/* ── Footer con Editar / Eliminar / Cerrar ── */}
            <PanelFooter
              isEditing={isEditingStudent}
              onEdit={handleStartEdit}
              onDelete={() => {
                setSelectedStudent(null);
                handleCancelEdit();
                setConfirmDelete({ id: selectedStudent.id, name: selectedStudent.name });
              }}
              deleteLabel="Dar de baja"
              onSave={handleSaveStudentEdit}
              isSaving={isUpdating}
              onCancel={handleCancelEdit}
              onClose={() => { setSelectedStudent(null); handleCancelEdit(); }}
            />

          </div>
        </div>
      )}
    </div>
  );
}
