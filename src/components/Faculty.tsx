import { useEffect, useMemo, useRef, useState, FormEvent, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserCheck,
  ShieldCheck,
  Stethoscope,
  FileText,
  Search,
  Plus,
  ArrowUpRight,
  X,
  Upload,
  Trash2,
  Save,
  History,
  Mail,
  Phone,
  CalendarDays,
  Briefcase,
  CircleAlert,
  CircleCheckBig,
  Clock,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { FacultyMember } from '../types';
import { facultyService } from '../services/facultyService';
import { useApiError } from '../hooks/useApiError';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from './ConfirmModal';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type NewFacultyForm = {
  name: string;
  id: string;
  category: FacultyMember['category'];
  dedication: FacultyMember['dedication'];
  adscription: string;
};

type EditableFacultyForm = {
  name: string;
  category: FacultyMember['category'];
  level: FacultyMember['level'];
  dedication: FacultyMember['dedication'];
  adscription: string;
  email: string;
  phone: string;
  seniority: number;
  hireDate: string;
  annualEvaluation: number;
  cedula: boolean;
  medicalExam: boolean;
  inductionCourse: boolean;
  weeklySchedule: string[];
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const DEFAULT_NEW_FACULTY: NewFacultyForm = {
  name: '',
  id: '',
  category: 'Profesor de Asignatura',
  dedication: 'Hora Clase',
  adscription: 'Facultad de Medicina'
};

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEditableFacultyForm(member: FacultyMember): EditableFacultyForm {
  return {
    name: member.name,
    category: member.category,
    level: member.level,
    dedication: member.dedication,
    adscription: member.adscription,
    email: member.email || '',
    phone: member.phone || '',
    seniority: member.seniority,
    hireDate: member.hireDate || '',
    annualEvaluation: member.compliance.annualEvaluation,
    cedula: member.compliance.cedula,
    medicalExam: member.compliance.medicalExam,
    inductionCourse: member.compliance.inductionCourse,
    weeklySchedule: member.weeklySchedule || [],
  };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Faculty() {
  const { showToast } = useToast();

  // Un hook por operación para loading states independientes
  const { loading: isLoadingFaculty, execute: executeLoad } = useApiError(true);
  const { loading: isAdding, execute: executeAdd } = useApiError();
  const { loading: isSaving, execute: executeSave } = useApiError();
  const { loading: isDeleting, execute: executeDelete } = useApiError();
  const { loading: isImporting, execute: executeImport } = useApiError();

  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyMember | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<EditableFacultyForm | null>(null);
  const [newFaculty, setNewFaculty] = useState<NewFacultyForm>(DEFAULT_NEW_FACULTY);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const importInputRef = useRef<HTMLInputElement | null>(null);

  // ─── Carga inicial ──────────────────────────────────────────────────────────

  const loadFaculty = async () => {
    const result = await executeLoad(
      () => facultyService.getFaculty(),
      'No se pudo cargar el listado de docentes. Verifica tu conexión.'
    );
    if (result) setFaculty(result);
  };

  useEffect(() => {
    void loadFaculty();
  }, []);

  // ─── Métricas derivadas ─────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const fullTimeCount = faculty.filter(m => m.dedication === 'Tiempo Completo').length;
    const definitiveCount = faculty.filter(m => m.category !== 'Profesor de Asignatura').length;
    const avgAnnualEvaluation = faculty.length
      ? (faculty.reduce((acc, m) => acc + m.compliance.annualEvaluation, 0) / faculty.length).toFixed(1)
      : '0.0';

    return {
      definitivityRate: faculty.length ? Math.round((definitiveCount / faculty.length) * 100) : 0,
      fullTimeCount,
      avgAnnualEvaluation,
    };
  }, [faculty]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const openFacultyDetails = (member: FacultyMember) => {
    setSelectedFaculty(member);
    setEditedProfile(buildEditableFacultyForm(member));
    setIsEditingProfile(false);
  };

  const closeFacultyDetails = () => {
    setSelectedFaculty(null);
    setEditedProfile(null);
    setIsEditingProfile(false);
  };

  const updateEditedProfile = (updates: Partial<EditableFacultyForm>) => {
    setEditedProfile(prev => prev ? { ...prev, ...updates } : prev);
  };

  // Registrar nuevo docente
  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedId = newFaculty.id.trim();
    const trimmedName = newFaculty.name.trim();

    if (faculty.some(m => m.id === trimmedId)) {
      showToast('Ya existe un académico registrado con ese ID institucional.', 'error');
      return;
    }

    const facultyToCreate: FacultyMember = {
      id: trimmedId,
      name: trimmedName,
      category: newFaculty.category,
      dedication: newFaculty.dedication,
      adscription: newFaculty.adscription.trim() || 'Facultad de Medicina',
      level: newFaculty.category === 'Técnico Académico' ? 'Asistente' : 'Asociado A',
      seniority: 0,
      compliance: { cedula: false, medicalExam: false, inductionCourse: false, annualEvaluation: 0 },
      weeklySchedule: [],
      permissions: []
    };

    const added = await executeAdd(
      () => facultyService.addFaculty(facultyToCreate),
      'No se pudo registrar el académico. Intenta de nuevo.'
    );

    if (added) {
      setFaculty(prev => [added, ...prev]);
      showToast(`${added.name} registrado correctamente.`, 'success');
      setShowRegistration(false);
      setNewFaculty(DEFAULT_NEW_FACULTY);
    }
  };

  // Guardar edición de perfil — extraído del JSX inline
  const handleSaveFaculty = async () => {
    if (!editedProfile || !selectedFaculty) return;

    const updated = await executeSave(
      () => facultyService.updateFaculty(selectedFaculty.id, {
        name: editedProfile.name.trim(),
        category: editedProfile.category,
        level: editedProfile.level,
        dedication: editedProfile.dedication,
        adscription: editedProfile.adscription.trim() || 'Facultad de Medicina',
        email: editedProfile.email.trim() || undefined,
        phone: editedProfile.phone.trim() || undefined,
        seniority: Number(editedProfile.seniority) || 0,
        hireDate: editedProfile.hireDate || undefined,
        weeklySchedule: editedProfile.weeklySchedule,
        compliance: {
          ...selectedFaculty.compliance,
          cedula: editedProfile.cedula,
          medicalExam: editedProfile.medicalExam,
          inductionCourse: editedProfile.inductionCourse,
          annualEvaluation: Math.min(100, Math.max(0, Number(editedProfile.annualEvaluation) || 0)),
        }
      }),
      'No se pudo actualizar el expediente docente. Intenta de nuevo.'
    );

    if (updated) {
      setFaculty(prev => prev.map(f => f.id === updated.id ? updated : f));
      setSelectedFaculty(updated);
      setEditedProfile(buildEditableFacultyForm(updated));
      setIsEditingProfile(false);
      showToast('Expediente actualizado correctamente.', 'success');
    }
  };

  const handleDeleteClick = () => {
    if (!selectedFaculty) return;
    setConfirmDelete({ id: selectedFaculty.id, name: selectedFaculty.name });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const { id, name } = confirmDelete;
    setConfirmDelete(null);

    const success = await executeDelete(
      () => facultyService.deleteFaculty(id),
      `No se pudo dar de baja a ${name}. Intenta de nuevo.`
    );

    if (success) {
      setFaculty(prev => prev.filter(m => m.id !== id));
      closeFacultyDetails();
      showToast(`${name} dado de baja del sistema.`, 'success');
    }
  };

  // Importar base de docentes — corregido: usaba `result` en lugar de `imported`
  const handleImportFaculty = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validFile = file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.csv');
    if (!validFile) {
      showToast('La importación de docentes admite archivos .json o .csv.', 'error');
      return;
    }

    const imported = await executeImport(
      () => facultyService.importFaculty(file),
      'No se pudo importar la base de docentes. Verifica el archivo.'
    );

    if (imported) {
      setFaculty(imported.faculty);

      // Si había un docente seleccionado, refrescar su estado con los datos importados
      if (selectedFaculty) {
        const refreshed = imported.faculty.find(m => m.id === selectedFaculty.id) || null;
        setSelectedFaculty(refreshed);
        setEditedProfile(refreshed ? buildEditableFacultyForm(refreshed) : null);
      }

      showToast(
        `Importación completada: ${imported.created} nuevos, ${imported.updated} actualizados.`,
        'success'
      );
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-gb-text tracking-tight">Gestión del Personal Académico</h2>
          <p className="text-slate-500 mt-1">Cumplimiento según el RIPPPA de la Universidad.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            className="hidden"
            onChange={handleImportFaculty}
          />
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={isImporting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm border transition-all active:scale-95 ${isImporting
              ? 'bg-slate-100 text-slate-400 border-slate-200'
              : 'bg-white text-gb-primary border-gb-primary/20 hover:bg-gb-primary/5'
              }`}
          >
            {isImporting
              ? <><Loader2 size={18} className="animate-spin" />Importando...</>
              : <><Upload size={18} />Importar Base</>
            }
          </button>
          <button
            onClick={() => setShowRegistration(true)}
            className="flex items-center gap-2 bg-gb-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gb-primary/90 transition-all active:scale-95 shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            Registrar Académico
          </button>
        </div>
      </header>

      {/* RIPPPA Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="geometric-card p-6 border-l-4 border-l-gb-accent">
          <div className="flex items-center gap-3 text-gb-accent mb-4">
            <ShieldCheck size={20} />
            <span className="text-[11px] font-bold uppercase tracking-widest">Definitividad</span>
          </div>
          <p className="text-2xl font-bold text-gb-text">{stats.definitivityRate}%</p>
          <p className="text-xs text-slate-500 mt-1">Personal con base definitiva</p>
        </div>
        <div className="geometric-card p-6 border-l-4 border-l-gb-primary">
          <div className="flex items-center gap-3 text-gb-primary mb-4">
            <UserCheck size={20} />
            <span className="text-[11px] font-bold uppercase tracking-widest">Dedicación Mínima</span>
          </div>
          <p className="text-2xl font-bold text-gb-text">{stats.fullTimeCount} pzas</p>
          <p className="text-xs text-slate-500 mt-1">Profesores de Tiempo Completo</p>
        </div>
        <div className="geometric-card p-6 border-l-4 border-l-amber-400">
          <div className="flex items-center gap-3 text-amber-500 mb-4">
            <FileText size={20} />
            <span className="text-[11px] font-bold uppercase tracking-widest">Evaluación Anual</span>
          </div>
          <p className="text-2xl font-bold text-gb-text">{stats.avgAnnualEvaluation}</p>
          <p className="text-xs text-slate-500 mt-1">Promedio de desempeño (Art. 93)</p>
        </div>
      </div>

      {/* Faculty Data Grid */}
      <div className="geometric-card overflow-hidden">
        <div className="table-header-gb grid grid-cols-[1.5fr_1fr_1fr_1fr_120px]">
          <div>Académico / Categoría</div>
          <div>Adscripción</div>
          <div className="text-center">Dedicación</div>
          <div className="text-center">Expm Administrativo</div>
          <div className="text-center">Eval. Anual</div>
        </div>

        {/* Spinner de carga inicial */}
        {isLoadingFaculty ? (
          <div className="p-12 text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-3 text-gb-primary" />
            <p className="text-sm font-medium text-slate-400">Cargando personal académico...</p>
          </div>
        ) : faculty.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <UserCheck size={32} />
            </div>
            <p className="text-slate-500 font-medium">No hay docentes registrados.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {faculty.map(member => (
              <div
                key={member.id}
                className="table-row-gb grid grid-cols-[1.5fr_1fr_1fr_1fr_120px] items-center py-4"
              >
                <div
                  className="flex items-center gap-3 cursor-pointer hover:bg-slate-50/50 p-1 -m-1 rounded-lg transition-colors group"
                  onClick={() => openFacultyDetails(member)}
                >
                  <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-gb-primary font-bold group-hover:bg-gb-primary group-hover:text-white transition-colors">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gb-secondary group-hover:text-gb-primary transition-colors underline-offset-4 group-hover:underline decoration-gb-primary/30">
                      {member.name}
                    </p>
                    <p className="text-[10px] text-gb-accent font-bold uppercase tracking-tighter">
                      {member.category} - {member.level}
                    </p>
                  </div>
                </div>
                <div className="text-slate-500 font-medium">{member.adscription}</div>
                <div className="text-center">
                  <span className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-600">
                    {member.dedication}
                  </span>
                </div>
                <div className="flex justify-center gap-2">
                  <div title="Cédula" className={`w-6 h-6 rounded flex items-center justify-center ${member.compliance.cedula ? 'text-gb-accent bg-gb-accent/10' : 'text-slate-300 bg-slate-50'}`}>
                    <ShieldCheck size={14} />
                  </div>
                  <div title="Examen Médico" className={`w-6 h-6 rounded flex items-center justify-center ${member.compliance.medicalExam ? 'text-gb-primary bg-gb-primary/10' : 'text-slate-300 bg-slate-50'}`}>
                    <Stethoscope size={14} />
                  </div>
                  <div title="Inducción" className={`w-6 h-6 rounded flex items-center justify-center ${member.compliance.inductionCourse ? 'text-gb-accent bg-gb-accent/10' : 'text-slate-300 bg-slate-50'}`}>
                    <FileText size={14} />
                  </div>
                </div>
                <div className="text-center font-bold text-gb-text">
                  {member.compliance.annualEvaluation}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIPPPA Regulation Quick Link */}
      <div className="p-6 bg-gb-secondary rounded-lg text-white flex justify-between items-center">
        <div>
          <h4 className="font-bold text-lg leading-tight">Requisitos de Permanencia (Título V)</h4>
          <p className="text-white/60 text-sm mt-1">Asegúrese de que todo el personal cuente con el expediente clínico y pedagógico actualizado.</p>
        </div>
        <button className="flex items-center gap-2 bg-gb-primary px-4 py-2 rounded font-bold text-xs uppercase tracking-widest hover:bg-gb-primary/90 transition-all">
          Ver Reglamento Completo <ArrowUpRight size={14} />
        </button>
      </div>

      <AnimatePresence>
        {confirmDelete && (
          <ConfirmModal
            message={
              <>
                ¿Desea dar de baja a <strong>{confirmDelete.name}</strong>? Las secciones asignadas quedarán como SIN ASIGNAR.
              </>
            }
            onConfirm={handleDeleteConfirm}
            onCancel={() => setConfirmDelete(null)}
          />
        )}

        {/* Modal: Detalle del docente */}
        {selectedFaculty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeFacultyDetails}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Profile Sidebar */}
              <div className="w-full md:w-80 bg-slate-50 border-r border-slate-100 p-8 flex flex-col items-center text-center">
                <div className="w-32 h-32 bg-gb-primary/10 rounded-2xl flex items-center justify-center text-gb-primary text-4xl font-black mb-6">
                  {selectedFaculty.name.charAt(0)}
                </div>

                {isEditingProfile ? (
                  <input
                    type="text"
                    value={editedProfile?.name || ''}
                    onChange={e => updateEditedProfile({ name: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-gb-primary rounded-lg text-center font-bold text-gb-secondary mb-2 focus:outline-none focus:ring-2 focus:ring-gb-primary/20"
                    autoFocus
                  />
                ) : (
                  <h3 className="text-xl font-bold text-gb-secondary leading-tight">{selectedFaculty.name}</h3>
                )}
                <p className="text-gb-accent font-bold text-[10px] uppercase tracking-widest mt-2">{selectedFaculty.category}</p>
                <p className="text-slate-400 text-xs font-medium mt-1">{selectedFaculty.level}</p>

                <div className="w-full mt-8 space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 text-left">
                    <Mail size={16} className="text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Email Institucional</p>
                      <p className="text-xs font-medium text-slate-600 truncate">{selectedFaculty.email || 'No registrado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 text-left">
                    <Phone size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Teléfono</p>
                      <p className="text-xs font-medium text-slate-600">{selectedFaculty.phone || 'No registrado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 text-left">
                    <History size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Antigüedad</p>
                      <p className="text-xs font-medium text-slate-600">{selectedFaculty.seniority} años en BUAP</p>
                    </div>
                  </div>
                </div>

                {/* Botones de acción del perfil */}
                <div className="mt-auto pt-8 flex gap-2 w-full">
                  {isEditingProfile ? (
                    <button
                      onClick={handleSaveFaculty}
                      disabled={isSaving}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${isSaving
                        ? 'bg-slate-200 text-slate-500'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                        }`}
                    >
                      {isSaving
                        ? <><Loader2 size={14} className="animate-spin" />Guardando...</>
                        : 'Guardar Cambios'
                      }
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditedProfile(buildEditableFacultyForm(selectedFaculty));
                        setIsEditingProfile(true);
                      }}
                      className="flex-1 bg-gb-primary text-white py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-gb-primary/90 transition-colors"
                    >
                      Editar Perfil
                    </button>
                  )}
                  <button
                    disabled={isDeleting}
                    onClick={handleDeleteClick}
                    title="Dar de baja"
                    className={`p-2 border border-slate-200 rounded-lg transition-colors ${isDeleting ? 'text-slate-300' : 'text-slate-400 hover:text-rose-500 hover:border-rose-200'
                      }`}
                  >
                    {isDeleting
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Trash2 size={16} />
                    }
                  </button>
                </div>
              </div>

              {/* Panel de contenido derecho */}
              <div className="flex-1 p-8 overflow-y-auto bg-white">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h4 className="text-lg font-bold text-gb-secondary tracking-tight">Control de Asistencia y Permisos</h4>
                    <p className="text-slate-500 text-sm">Registro detallado de presencialidad académica.</p>
                  </div>
                  <button
                    onClick={closeFacultyDetails}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Formulario de edición */}
                {isEditingProfile && editedProfile && (
                  <div className="mb-8 p-5 rounded-2xl border border-gb-primary/10 bg-gb-primary/5 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gb-primary">Edición de Expediente</p>
                        <h5 className="text-lg font-bold text-gb-secondary mt-1">Datos administrativos del docente</h5>
                      </div>
                      <Save size={18} className="text-gb-primary" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Adscripción</label>
                        <input
                          type="text"
                          value={editedProfile.adscription}
                          onChange={e => updateEditedProfile({ adscription: e.target.value })}
                          className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all font-medium text-gb-secondary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Categoría</label>
                        <select
                          value={editedProfile.category}
                          onChange={e => updateEditedProfile({ category: e.target.value as FacultyMember['category'] })}
                          className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all font-bold text-gb-secondary text-sm appearance-none"
                        >
                          <option>Profesor de Asignatura</option>
                          <option>Profesor-Investigador</option>
                          <option>Técnico Académico</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Nivel</label>
                        <select
                          value={editedProfile.level}
                          onChange={e => updateEditedProfile({ level: e.target.value as FacultyMember['level'] })}
                          className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all font-bold text-gb-secondary text-sm appearance-none"
                        >
                          <option>Asistente</option>
                          <option>Asociado A</option>
                          <option>Asociado B</option>
                          <option>Asociado C</option>
                          <option>Titular A</option>
                          <option>Titular B</option>
                          <option>Titular C</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Dedicación</label>
                        <select
                          value={editedProfile.dedication}
                          onChange={e => updateEditedProfile({ dedication: e.target.value as FacultyMember['dedication'] })}
                          className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all font-bold text-gb-secondary text-sm appearance-none"
                        >
                          <option>Tiempo Completo</option>
                          <option>Medio Tiempo</option>
                          <option>Hora Clase</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Correo</label>
                        <input
                          type="email"
                          value={editedProfile.email}
                          onChange={e => updateEditedProfile({ email: e.target.value })}
                          className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all font-medium text-gb-secondary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Teléfono</label>
                        <input
                          type="text"
                          value={editedProfile.phone}
                          onChange={e => updateEditedProfile({ phone: e.target.value })}
                          className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all font-medium text-gb-secondary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Fecha de Ingreso BUAP</label>
                        <input
                          type="date"
                          value={editedProfile.hireDate}
                          onChange={e => updateEditedProfile({ hireDate: e.target.value })}
                          className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all font-medium text-gb-secondary"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Antigüedad</label>
                          <input
                            type="number" min="0"
                            value={editedProfile.seniority}
                            onChange={e => updateEditedProfile({ seniority: Number(e.target.value) || 0 })}
                            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all font-medium text-gb-secondary"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Eval. Anual</label>
                          <input
                            type="number" min="0" max="100"
                            value={editedProfile.annualEvaluation}
                            onChange={e => updateEditedProfile({ annualEvaluation: Number(e.target.value) || 0 })}
                            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all font-medium text-gb-secondary"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Expediente Administrativo</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: 'cedula', label: 'Cédula' },
                            { key: 'medicalExam', label: 'Examen Médico' },
                            { key: 'inductionCourse', label: 'Inducción' },
                          ].map(item => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => updateEditedProfile({
                                [item.key]: !editedProfile[item.key as keyof EditableFacultyForm]
                              } as Partial<EditableFacultyForm>)}
                              className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${editedProfile[item.key as keyof EditableFacultyForm]
                                ? 'bg-gb-primary/10 border-gb-primary text-gb-primary'
                                : 'bg-white border-slate-200 text-slate-500'
                                }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Horario Presencial</p>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map(day => {
                            const isActive = editedProfile.weeklySchedule.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => updateEditedProfile({
                                  weeklySchedule: isActive
                                    ? editedProfile.weeklySchedule.filter(d => d !== day)
                                    : [...editedProfile.weeklySchedule, day]
                                })}
                                className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${isActive
                                  ? 'bg-gb-primary text-white border-gb-primary'
                                  : 'bg-white border-slate-200 text-slate-500'
                                  }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Si captura la fecha de ingreso, la antigüedad se recalculará automáticamente al guardar. Si no la captura, se conserva el valor manual de antigüedad.
                    </p>
                  </div>
                )}

                {/* Estatus y dedicación */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center justify-between mb-2">
                      <CalendarDays size={20} className="text-emerald-600" />
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Estatus Hoy</span>
                    </div>
                    <p className="text-lg font-bold text-gb-secondary tracking-tight">
                      {selectedFaculty.weeklySchedule?.includes(
                        ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date().getDay()]
                      ) ? 'Presente en Facultad' : 'No programado'}
                    </p>
                    <p className="text-xs text-emerald-600/70 font-medium">Según cronograma semanal institucional.</p>
                  </div>
                  <div className="p-4 bg-gb-primary/5 rounded-xl border border-gb-primary/10">
                    <div className="flex items-center justify-between mb-2">
                      <Briefcase size={20} className="text-gb-primary" />
                      <span className="text-[10px] font-bold text-gb-primary uppercase tracking-widest">Dedicación</span>
                    </div>
                    <p className="text-lg font-bold text-gb-secondary tracking-tight">{selectedFaculty.dedication}</p>
                    <p className="text-xs text-gb-primary/70 font-medium">Carga horaria autorizada por dirección.</p>
                  </div>
                </div>

                {/* Horario semanal (solo lectura) */}
                <div className="mb-8">
                  <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                    <Clock size={14} /> Horario Semanal Presencial
                  </h5>
                  <div className="grid grid-cols-7 gap-2">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, i) => {
                      const fullDay = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][i];
                      const isActive = selectedFaculty.weeklySchedule?.includes(fullDay);
                      return (
                        <div
                          key={day}
                          className={`flex flex-col items-center p-3 rounded-lg border transition-all ${isActive
                            ? 'bg-gb-primary text-white border-gb-primary font-bold shadow-md shadow-gb-primary/20 scale-105'
                            : 'bg-white text-slate-400 border-slate-100'
                            }`}
                        >
                          <span className="text-[10px] uppercase">{day}</span>
                          {isActive && <div className="w-1 h-1 rounded-full bg-white mt-1" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Permisos y licencias */}
                <div>
                  <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                    <CircleAlert size={14} /> Permisos y Licencias Vigentes
                  </h5>
                  <div className="space-y-4">
                    {selectedFaculty.permissions && selectedFaculty.permissions.length > 0 ? (
                      selectedFaculty.permissions.map((perm, i) => (
                        <div key={i} className="p-4 rounded-xl border border-slate-100 flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${perm.type === 'Médico' ? 'bg-rose-100 text-rose-600' :
                            perm.type === 'Administrativo' ? 'bg-gb-accent/10 text-gb-accent' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                            {perm.type === 'Médico' ? <Stethoscope size={18} /> :
                              perm.type === 'Administrativo' ? <ShieldCheck size={18} /> :
                                <Briefcase size={18} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-bold text-gb-secondary text-sm">{perm.description}</p>
                              {perm.approved ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                  <CircleCheckBig size={10} /> AUTORIZADO
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                  PENDIENTE
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                              {perm.type} • {perm.startDate} al {perm.endDate}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center">
                        <p className="text-slate-400 text-sm font-medium">No existen permisos activos registrados.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Registrar nuevo académico */}
        {showRegistration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowRegistration(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="bg-gb-secondary p-6 text-white text-center relative">
                <h3 className="text-xl font-bold font-display">Registrar Nuevo Académico</h3>
                <p className="text-white/60 text-xs mt-1 uppercase tracking-widest font-black">Expediente de Personal 2026</p>
                <button
                  onClick={() => setShowRegistration(false)}
                  className="absolute top-4 right-4 text-white/40 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRegister} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">Nombre Completo del Docente</label>
                    <input
                      required
                      type="text"
                      placeholder="p. ej. Dr. Juan Pérez Maldonado"
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all font-medium text-gb-secondary"
                      value={newFaculty.name}
                      onChange={e => setNewFaculty({ ...newFaculty, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">ID / Matrícula BUAP</label>
                      <input
                        required
                        type="text"
                        placeholder="100XXXXXX"
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all font-medium text-gb-secondary"
                        value={newFaculty.id}
                        onChange={e => setNewFaculty({ ...newFaculty, id: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">Categoría</label>
                      <select
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 focus:border-gb-primary outline-none transition-all font-bold text-gb-secondary text-sm appearance-none"
                        value={newFaculty.category}
                        onChange={e => setNewFaculty({ ...newFaculty, category: e.target.value as FacultyMember['category'] })}
                      >
                        <option>Profesor de Asignatura</option>
                        <option>Profesor-Investigador</option>
                        <option>Técnico Académico</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1.5 ml-1">Dedicación Administrativa</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Tiempo Completo', 'Medio Tiempo', 'Hora Clase'] as const).map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setNewFaculty({ ...newFaculty, dedication: d })}
                          className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${newFaculty.dedication === d
                            ? 'bg-gb-primary/10 border-gb-primary text-gb-primary'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRegistration(false)}
                    className="flex-1 h-12 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={isAdding}
                    className={`flex-[2] h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isAdding
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-gb-primary text-white hover:bg-gb-primary/90 shadow-lg shadow-gb-primary/25'
                      }`}
                  >
                    {isAdding
                      ? <><Loader2 size={18} className="animate-spin" />Registrando...</>
                      : <><ShieldCheck size={20} />Confirmar Alta en RIPPPA</>
                    }
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
