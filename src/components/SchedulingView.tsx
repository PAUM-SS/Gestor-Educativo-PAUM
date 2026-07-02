import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Search,
    Filter,
    UploadCloud,
    DownloadCloud,
    Plus,
    BookOpen,
    Layers,
    Edit,
    Trash2,
    X,
    Save,
    Clock,
    MapPin,
    Users,
    Loader2,
    ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useApiError } from '../hooks/useApiError';
import { useToast } from '../context/ToastContext';
import { ClassSchedule, AcademicSectionWithNames, Module, FacultyMember } from '@/shared/types';
import { SchedulerService } from '../services/SchedulerService';
import { curriculumService } from '../services/curriculumService';
import { facultyService } from '../services/facultyService';
import { ConfirmModal } from './ConfirmModal';
import QuickAddFacultyModal from './QuickAddFacultyModal';
import QuickAddModuleModal from './QuickAddModuleModal';

export default function SchedulingView() {
    const { showToast } = useToast();

    const { loading: isLoadingClasses, execute: executeLoad } = useApiError(true);
    const { loading: isAdding, execute: executeAdd } = useApiError();
    const { loading: isSaving, execute: executeSave } = useApiError();
    const { loading: isDeleting, execute: executeDelete } = useApiError();
    const { loading: isImporting, execute: executeImport } = useApiError();
    const { loading: isExporting, execute: executeExport } = useApiError();

    const [classes, setClasses] = useState<AcademicSectionWithNames[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState<AcademicSectionWithNames | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<AcademicSectionWithNames>>({});
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

    // --- Catálogos para selects ---
    const [modulesCatalog, setModulesCatalog] = useState<Module[]>([]);
    const [facultyCatalog, setFacultyCatalog] = useState<FacultyMember[]>([]);
    const [showQuickAddFaculty, setShowQuickAddFaculty] = useState(false);
    const [showQuickAddModule, setShowQuickAddModule] = useState(false);

    // --- Horario del modal de agregar ---
    type DayKey = ClassSchedule['day'];
    const ALL_DAYS: DayKey[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const ROOM_TYPES: ClassSchedule['roomType'][] = ['Teórico', 'Laboratorio', 'Simulación', 'Rotación', 'Práctica', 'Otros'];

    type DaySlotDraft = {
        enabled: boolean;
        start: string;
        end: string;
        room: string;
        roomType: ClassSchedule['roomType'];
    };
    const buildEmptyDays = (): Record<DayKey, DaySlotDraft> =>
        Object.fromEntries(ALL_DAYS.map(d => [d, { enabled: false, start: '07:00', end: '09:00', room: '', roomType: 'Teórico' }])) as Record<DayKey, DaySlotDraft>;

    const [scheduleDraft, setScheduleDraft] = useState<Record<DayKey, DaySlotDraft>>(buildEmptyDays());

    const importInputRef = useRef<HTMLInputElement>(null);

    const loadClasses = async () => {
        const result = await executeLoad(
            () => SchedulerService.getClasses(),
            'No se pudo cargar el listado de clases. Verifica tu conexión.'
        );
        if (result) setClasses(result);
    };

    const loadCatalogs = async () => {
        const [mods, fac] = await Promise.all([
            curriculumService.getModules().catch(() => [] as Module[]),
            facultyService.getFaculty().catch(() => [] as FacultyMember[]),
        ]);
        setModulesCatalog(mods);
        setFacultyCatalog(fac);
    };

    useEffect(() => {
        void loadClasses();
        void loadCatalogs();
    }, []);

    // --- Helpers ---
    // Normaliza el formato de tiempo a HH:MM para compatibilidad con time inputs
    const normalizeTimeFormat = (timeStr: string): string => {
        if (!timeStr) return '';
        // Si ya está en formato HH:MM, devolver como está
        if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
        // Si es HH:MM:SS, quitar segundos
        if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return timeStr.substring(0, 5);
        // Si es H:MM, convertir a HH:MM
        if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
            const [h, m] = timeStr.split(':');
            return `${h.padStart(2, '0')}:${m}`;
        }
        // Si solo es un número (hora sin minutos), agregar :00
        if (/^\d{1,2}$/.test(timeStr.trim())) {
            return `${timeStr.trim().padStart(2, '0')}:00`;
        }
        return timeStr;
    };

    const formatSchedule = (schedules: ClassSchedule[]) => {
        if (!schedules || schedules.length === 0) return 'Sin horario asignado';
        // Mapea a las primeras 3 letras (ej. Lun, Mar)
        const days = schedules.map(s => s.day.substring(0, 3)).join(', ');
        const time = `${normalizeTimeFormat(schedules[0].start)} - ${normalizeTimeFormat(schedules[0].end)}`;
        return `${days} | ${time}`;
    };

    // --- Estadísticas Derivadas ---
    const totalClasses = classes.length;

    const classesBySemester = useMemo(() => {
        const counts: Record<string, number> = {};
        classes.forEach(c => {
            const mod = c.moduleId || 'N/A';
            counts[mod] = (counts[mod] || 0) + 1;
        });
        return counts;
    }, [classes]);

    // --- Filtros ---
    const filteredClasses = useMemo(() =>
        classes.filter(c => {
            const term = searchTerm.toLowerCase();
            return (
                c.id.toLowerCase().includes(term) ||
                c.moduleName.toLowerCase().includes(term) ||
                c.facultyName.toLowerCase().includes(term)
            );
        }),
        [classes, searchTerm]
    );

    // --- Helpers: schedule draft → ClassSchedule[] ---
    const buildScheduleFromDraft = (draft: Record<DayKey, DaySlotDraft>): ClassSchedule[] =>
        ALL_DAYS.filter(d => draft[d].enabled).map(d => ({
            day: d,
            start: draft[d].start,
            end: draft[d].end,
            room: draft[d].room,
            roomType: draft[d].roomType,
        }));

    const updateDay = (day: DayKey, patch: Partial<DaySlotDraft>) =>
        setScheduleDraft(prev => ({ ...prev, [day]: { ...prev[day], ...patch } }));

    // --- Handlers ---
    const handleAddClass = async () => {
        const schedule = buildScheduleFromDraft(scheduleDraft);
        const selectedModule = modulesCatalog.find(m => m.id === editForm.moduleId);
        const selectedFaculty = facultyCatalog.find(f => f.id === editForm.facultyId);

        const newClass: AcademicSectionWithNames = {
            id: editForm.id?.trim() || `sec-${Date.now()}`,
            moduleId: editForm.moduleId?.trim() || '',
            facultyId: editForm.facultyId?.trim() || '',
            moduleName: selectedModule?.title || editForm.moduleName || '',
            facultyName: selectedFaculty?.name || editForm.facultyName || 'Sin asignar',
            capacity: editForm.capacity || 0,
            enrolled: 0,
            schedule,
        };

        const created = await executeAdd(
            () => SchedulerService.addClass(newClass),
            'No se pudo registrar la clase.'
        );

        if (created) {
            setClasses(prev => [created, ...prev]);
            setShowAddModal(false);
            setEditForm({});
            setScheduleDraft(buildEmptyDays());
            showToast('Clase registrada correctamente', 'success');
        }
    };

    const handleEditClick = () => {
        if (!selectedClass) return;
        setEditForm({ ...selectedClass });

        // Populate scheduleDraft
        const draft = buildEmptyDays();
        if (selectedClass.schedule && selectedClass.schedule.length > 0) {
            selectedClass.schedule.forEach(slot => {
                const normalizedStart = normalizeTimeFormat(slot.start);
                const normalizedEnd = normalizeTimeFormat(slot.end);
                console.log(`[EDIT] Día: ${slot.day}, Start: ${slot.start} → ${normalizedStart}, End: ${slot.end} → ${normalizedEnd}`);
                draft[slot.day] = {
                    enabled: true,
                    start: normalizedStart,
                    end: normalizedEnd,
                    room: slot.room || '',
                    roomType: slot.roomType || 'Teórico'
                };
            });
        }
        console.log('[EDIT] scheduleDraft actualizado:', draft);
        setScheduleDraft(draft);
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!editForm.id || !selectedClass) return;

        const schedule = buildScheduleFromDraft(scheduleDraft);
        const updatedForm = { ...editForm, schedule };

        const updated = await executeSave(
            () => SchedulerService.updateClass(updatedForm.id!, updatedForm),
            'No se pudo actualizar la clase.'
        );

        if (updated) {
            setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
            setSelectedClass(updated);
            setIsEditing(false);
            showToast('Clase actualizada correctamente', 'success');
        }
    };

    const handleDeleteClick = () => {
        if (!selectedClass) return;
        setConfirmDelete({ id: selectedClass.id, name: selectedClass.moduleName });
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDelete) return;
        const { id, name } = confirmDelete;
        setConfirmDelete(null);

        const success = await executeDelete(
            () => SchedulerService.deleteClass(id),
            `No se pudo eliminar la clase ${id}. Intenta de nuevo.`
        );

        if (success) {
            setClasses(prev => prev.filter(c => c.id !== id));
            closePanel();
            showToast(`Clase ${name} - ${id} eliminada`, 'success');
        }
    };

    const closePanel = () => {
        setSelectedClass(null);
        setIsEditing(false);
    };

    const handleImportDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        const result = await executeImport(
            () => SchedulerService.importSections(file),
            'No se pudo importar la base de datos de clases.'
        );
        if (result) {
            showToast(`${result.created} clases importadas, ${result.updated} actualizadas.`, 'success');
            void loadClasses();
        }
    };

    const handleExport = async () => {
        const result = await executeExport(
            () => SchedulerService.exportSections(),
            'No se pudo exportar la base de datos de clases.'
        );
        if (result) {
            const url = window.URL.createObjectURL(result);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'programacion_academica.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showToast('Exportación exitosa', 'success');
        }
    };

    return (
        <div className="space-y-6 pb-10">
            {/* --- Header --- */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Programación Académica</h2>
                    <p className="text-slate-500 mt-1">Gestión de horarios, asignaturas, docentes y cupos.</p>
                </div>
                <div className="flex gap-3">
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".csv,.json,.xlsx,application/json,text/csv"
                        className="hidden"
                        onChange={handleImportDatabase}
                    />
                    <button
                        onClick={() => importInputRef.current?.click()}
                        disabled={isImporting}
                        className={`flex items-center gap-2 bg-white text-gb-secondary border border-slate-200 px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm ${isImporting ? 'opacity-60' : ''}`}
                    >
                        {isImporting
                            ? <><Loader2 size={18} className="animate-spin text-gb-primary" />Importando...</>
                            : <><UploadCloud size={18} className="text-gb-primary" />Importar Base</>
                        }
                    </button>
                    <button
                        onClick={() => { setEditForm({}); setShowAddModal(true); }}
                        className="flex items-center gap-2 bg-gb-primary text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-gb-primary/90 transition-all shadow-lg"
                    >
                        <Plus size={18} />
                        Agregar Clase
                    </button>
                </div>
            </header>

            {/* --- Estadísticas --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 text-blue-700 mb-2">
                            <BookOpen size={20} />
                            <span className="font-display font-bold">Cantidad Total de Clases</span>
                        </div>
                        <p className="text-3xl font-display font-bold text-blue-900">{totalClasses}</p>
                    </div>
                </div>
                <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100">
                    <div className="flex items-center gap-3 text-indigo-700 mb-3">
                        <Layers size={20} />
                        <span className="font-display font-bold">Módulos con Secciones</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(classesBySemester).slice(0, 6).map(([mod, count]) => (
                            <span key={mod} className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-800 font-bold text-xs rounded-lg shadow-sm">
                                {mod}: <span className="text-indigo-500">{count} secc.</span>
                            </span>
                        ))}
                        {Object.keys(classesBySemester).length > 6 && (
                            <span className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-500 font-bold text-xs rounded-lg shadow-sm">
                                +{Object.keys(classesBySemester).length - 6} más
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Búsqueda y Filtros --- */}
            <div className="flex gap-4 items-center">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por NRC, Asignatura o Docente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-gb-primary/20 outline-none transition-all text-sm text-slate-700 font-medium"
                    />
                </div>
                <button className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold text-sm hover:bg-slate-50 flex gap-2 items-center">
                    <Filter size={18} />
                    Filtros
                </button>
            </div>

            {/* --- Tabla Principal --- */}
            <div className="geometric-card overflow-hidden">
                {isLoadingClasses ? (
                    <div className="p-12 text-center">
                        <Loader2 size={32} className="animate-spin mx-auto mb-3 text-gb-primary" />
                        <p className="text-sm font-medium text-slate-400">Cargando programación académica...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="table-header-gb">
                                    <th className="px-5 py-4">NRC</th>
                                    <th className="px-4 py-4">Asignatura</th>
                                    <th className="px-4 py-4">Horario</th>
                                    <th className="px-4 py-4">Docente</th>
                                    <th className="px-4 py-4 text-center">Cupo</th>
                                    <th className="px-4 py-4 text-center">Inscritos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredClasses.map(cls => {
                                    const full = cls.capacity > 0 && cls.enrolled >= cls.capacity;
                                    return (
                                        <tr
                                            key={cls.id}
                                            className="table-row-gb group cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => { setSelectedClass(cls); setIsEditing(false); }}
                                        >
                                            {/* NRC */}
                                            <td className="px-5 py-3">
                                                <span className="font-bold text-gb-primary bg-blue-50 px-2 py-1 rounded-md text-xs border border-blue-100 font-mono">
                                                    {cls.id}
                                                </span>
                                            </td>
                                            {/* Asignatura — muestra nombre del módulo */}
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-slate-800 text-sm truncate max-w-[220px]" title={cls.moduleName}>
                                                    {cls.moduleName}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{cls.moduleId}</p>
                                            </td>
                                            {/* Horario */}
                                            <td className="px-4 py-3">
                                                <p className="text-xs text-slate-600 font-medium">{formatSchedule(cls.schedule)}</p>
                                                {cls.schedule.length > 0 && cls.schedule[0].room && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                        <MapPin size={10} /> {cls.schedule[0].room}
                                                    </p>
                                                )}
                                            </td>
                                            {/* Docente — muestra nombre del docente */}
                                            <td className="px-4 py-3">
                                                <p className={`text-xs font-medium truncate max-w-[180px] ${cls.facultyName === 'Sin asignar' ? 'text-slate-400 italic' : 'text-slate-700'}`}
                                                    title={cls.facultyName}>
                                                    {cls.facultyName}
                                                </p>
                                            </td>
                                            {/* Cupo */}
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                    {cls.capacity}
                                                </span>
                                            </td>
                                            {/* Inscritos */}
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${full ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {cls.enrolled}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredClasses.length === 0 && (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                                    <Search size={32} />
                                </div>
                                <p className="text-slate-500 font-medium">No se encontraron clases con ese criterio.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- Exportar Base --- */}
            <div className="flex justify-end pt-2">
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className={`flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-emerald-100 transition-all shadow-sm ${isExporting ? 'opacity-60' : ''}`}
                >
                    {isExporting
                        ? <><Loader2 size={18} className="animate-spin text-gb-primary" />Exportando...</>
                        : <><DownloadCloud size={18} className="text-gb-primary" />Exportar Base</>
                    }
                </button>
            </div>

            {/* --- Panel de Detalles / Edición --- */}
            <AnimatePresence>
                {confirmDelete && (
                    <ConfirmModal
                        message={
                            <>
                                ¿Desea eliminar la clase <strong>{confirmDelete.id}</strong>?
                            </>
                        }
                        confirmText='Sí, eliminar'
                        onConfirm={handleDeleteConfirm}
                        onCancel={() => setConfirmDelete(null)}
                    />
                )}
                {selectedClass && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            {/* Header del panel */}
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h2 className="text-xl font-display font-bold text-slate-800">
                                        {isEditing ? 'Editar Sección' : 'Ficha de la Sección'}
                                    </h2>
                                    <p className="text-xs text-slate-400 font-mono mt-0.5">NRC: {selectedClass.id}</p>
                                </div>
                                <button onClick={closePanel} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Cuerpo del panel */}
                            <div className="p-6 overflow-y-auto flex-1">
                                {!isEditing ? (
                                    // Vista de solo lectura
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-2xl font-bold text-slate-900">{selectedClass.moduleName}</h3>
                                                <p className="text-slate-400 font-mono text-sm mt-0.5">{selectedClass.moduleId}</p>
                                            </div>
                                            <span className={`px-3 py-1 font-bold rounded-lg text-sm border ${selectedClass.capacity > 0 && selectedClass.enrolled >= selectedClass.capacity
                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                : 'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}>
                                                {selectedClass.enrolled}/{selectedClass.capacity} inscritos
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-2">
                                                    <Users size={14} /> Docente Asignado
                                                </p>
                                                <p className={`font-medium text-sm ${selectedClass.facultyName === 'Sin asignar' ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                                                    {selectedClass.facultyName}
                                                </p>
                                                {selectedClass.facultyId && (
                                                    <p className="text-[10px] text-slate-400 font-mono mt-1">{selectedClass.facultyId}</p>
                                                )}
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-2">
                                                    <MapPin size={14} /> Edificio y Salón
                                                </p>
                                                {selectedClass.schedule.length > 0 && selectedClass.schedule[0].room ? (
                                                    <div>
                                                        <p className="font-medium text-slate-800 text-sm">{selectedClass.schedule[0].room}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">{selectedClass.schedule[0].roomType}</p>
                                                    </div>
                                                ) : (
                                                    <p className="font-medium text-slate-400 text-sm italic">Sin salón asignado</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                                                <Clock size={18} className="text-amber-500" /> Horario Programado
                                            </h4>
                                            {selectedClass.schedule.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedClass.schedule.map((sch, idx) => (
                                                        <div key={idx} className="bg-amber-50 text-amber-800 border border-amber-100 px-3 py-2 rounded-lg text-sm font-medium">
                                                            <span className="font-bold">{sch.day.substring(0, 3)}:</span>{' '}
                                                            {sch.start} – {sch.end}
                                                            {sch.room && <span className="ml-2 text-amber-600 text-xs">· {sch.room}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-slate-400 italic text-sm">Sin horario programado.</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    // Vista de edición
                                    <div className="space-y-4">
                                        {/* NRC */}
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">NRC de Sección</label>
                                            <input
                                                type="text"
                                                placeholder="Ej. 51740"
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm font-mono"
                                                value={editForm.id || ''}
                                                onChange={e => setEditForm({ ...editForm, id: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* --- Módulo Asociado (full width) --- */}
                                            <div className="col-span-2">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Módulo Asociado</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowQuickAddModule(true)}
                                                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors px-2 py-0.5 rounded-lg hover:bg-indigo-50"
                                                    >
                                                        <Plus size={11} /> Nuevo módulo
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <select
                                                        className="w-full h-11 pl-4 pr-9 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm appearance-none"
                                                        value={editForm.moduleId || ''}
                                                        onChange={e => {
                                                            const mod = modulesCatalog.find(m => m.id === e.target.value);
                                                            setEditForm({ ...editForm, moduleId: e.target.value, moduleName: mod?.title || '' });
                                                        }}
                                                    >
                                                        <option value="">— Selecciona un módulo —</option>
                                                        {modulesCatalog.map(m => (
                                                            <option key={m.id} value={m.id}>
                                                                {m.id} · {m.title}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                </div>
                                            </div>

                                            {/* --- Docente --- */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Docente</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowQuickAddFaculty(true)}
                                                        className="flex items-center gap-1 text-[10px] font-bold text-gb-primary hover:text-gb-primary/80 transition-colors px-2 py-0.5 rounded-lg hover:bg-blue-50"
                                                    >
                                                        <Plus size={11} /> Nuevo docente
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <select
                                                        className="w-full h-11 pl-4 pr-9 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm appearance-none"
                                                        value={editForm.facultyId || ''}
                                                        onChange={e => {
                                                            const fac = facultyCatalog.find(f => f.id === e.target.value);
                                                            setEditForm({ ...editForm, facultyId: e.target.value, facultyName: fac?.name || '' });
                                                        }}
                                                    >
                                                        <option value="">— Sin asignar —</option>
                                                        {facultyCatalog.map(f => (
                                                            <option key={f.id} value={f.id}>{f.name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                </div>
                                            </div>

                                            {/* --- Cupo --- */}
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Cupo Máximo</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                                    value={editForm.capacity ?? 0}
                                                    onChange={e => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                        {/* --- Editor de Horario --- */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3 mt-4 border-t border-slate-100 pt-4">
                                                <Clock size={15} className="text-amber-500" />
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Horario de Clases</span>
                                            </div>
                                            <div className="space-y-2">
                                                {ALL_DAYS.map(day => {
                                                    const slot = scheduleDraft[day];
                                                    console.log(`[EDIT PANEL] ${day}:`, { start: slot.start, startNormalized: normalizeTimeFormat(slot.start), end: slot.end, endNormalized: normalizeTimeFormat(slot.end), enabled: slot.enabled });
                                                    return (
                                                        <div
                                                            key={day}
                                                            className={`rounded-xl border transition-all ${slot.enabled
                                                                ? 'border-amber-200 bg-amber-50'
                                                                : 'border-slate-100 bg-slate-50'
                                                                }`}
                                                        >
                                                            {/* Row header: checkbox + día */}
                                                            <label className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={slot.enabled}
                                                                    onChange={e => updateDay(day, { enabled: e.target.checked })}
                                                                    className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                                                                />
                                                                <span className={`text-sm font-bold w-20 ${slot.enabled ? 'text-amber-800' : 'text-slate-400'
                                                                    }`}>{day}</span>

                                                                {/* Hora inicio / fin — sólo visible si activo */}
                                                                {slot.enabled && (
                                                                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                                                                        <input
                                                                            type="time"
                                                                            value={normalizeTimeFormat(slot.start)}
                                                                            onChange={e => updateDay(day, { start: e.target.value })}
                                                                            className="h-8 px-2 bg-white border border-amber-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-300 outline-none"
                                                                        />
                                                                        <span className="text-xs text-slate-400">–</span>
                                                                        <input
                                                                            type="time"
                                                                            value={normalizeTimeFormat(slot.end)}
                                                                            onChange={e => updateDay(day, { end: e.target.value })}
                                                                            className="h-8 px-2 bg-white border border-amber-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-300 outline-none"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Salón"
                                                                            value={slot.room}
                                                                            onChange={e => updateDay(day, { room: e.target.value })}
                                                                            className="h-8 px-2 bg-white border border-amber-200 rounded-lg text-xs flex-1 min-w-[80px] focus:ring-2 focus:ring-amber-300 outline-none"
                                                                        />
                                                                        <div className="relative">
                                                                            <select
                                                                                value={slot.roomType}
                                                                                onChange={e => updateDay(day, { roomType: e.target.value as ClassSchedule['roomType'] })}
                                                                                className="h-8 pl-2 pr-6 bg-white border border-amber-200 rounded-lg text-xs appearance-none focus:ring-2 focus:ring-amber-300 outline-none"
                                                                            >
                                                                                {ROOM_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                                                                            </select>
                                                                            <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </label>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer del panel */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                                <div className="flex gap-2">
                                    {!isEditing ? (
                                        <>
                                            <button
                                                onClick={handleEditClick}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors"
                                            >
                                                <Edit size={16} /> Editar
                                            </button>
                                            <button
                                                onClick={handleDeleteClick}
                                                disabled={isDeleting}
                                                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors disabled:opacity-50"
                                            >
                                                {isDeleting
                                                    ? <Loader2 size={16} className="animate-spin" />
                                                    : <Trash2 size={16} />
                                                }
                                                Eliminar
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleSaveEdit}
                                            disabled={isSaving}
                                            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm transition-colors ${isSaving ? 'bg-slate-100 text-slate-400' : 'bg-gb-primary text-white hover:bg-gb-primary/90'}`}
                                        >
                                            {isSaving
                                                ? <><Loader2 size={16} className="animate-spin" />Guardando...</>
                                                : <><Save size={16} />Guardar Cambios</>
                                            }
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={closePanel}
                                    className="px-5 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Modal: Agregar Clase */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-slate-900/50 z-50 flex justify-center items-center p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-3xl flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Registrar Nueva Sección</h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Completa los datos de la sección académica</p>
                                </div>
                                <button onClick={() => { setShowAddModal(false); setEditForm({}); setScheduleDraft(buildEmptyDays()); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="overflow-y-auto flex-1 p-6 space-y-5">

                                {/* NRC */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">NRC de Sección</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. 51740"
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm font-mono"
                                        value={editForm.id || ''}
                                        onChange={e => setEditForm({ ...editForm, id: e.target.value })}
                                    />
                                </div>

                                {/* --- Módulo Asociado (full width) --- */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Módulo Asociado</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowQuickAddModule(true)}
                                            className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors px-2 py-0.5 rounded-lg hover:bg-indigo-50"
                                        >
                                            <Plus size={11} /> Nuevo módulo
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <select
                                            className="w-full h-11 pl-4 pr-9 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm appearance-none"
                                            value={editForm.moduleId || ''}
                                            onChange={e => setEditForm({ ...editForm, moduleId: e.target.value })}
                                        >
                                            <option value="">— Selecciona un módulo —</option>
                                            {modulesCatalog.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.id} · {m.title}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* --- Docente --- */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Docente</label>
                                            <button
                                                type="button"
                                                onClick={() => setShowQuickAddFaculty(true)}
                                                className="flex items-center gap-1 text-[10px] font-bold text-gb-primary hover:text-gb-primary/80 transition-colors px-2 py-0.5 rounded-lg hover:bg-blue-50"
                                            >
                                                <Plus size={11} /> Nuevo docente
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <select
                                                className="w-full h-11 pl-4 pr-9 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm appearance-none"
                                                value={editForm.facultyId || ''}
                                                onChange={e => setEditForm({ ...editForm, facultyId: e.target.value })}
                                            >
                                                <option value="">— Sin asignar —</option>
                                                {facultyCatalog.map(f => (
                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>

                                    {/* --- Cupo --- */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Cupo Máximo</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                            value={editForm.capacity || 0}
                                            onChange={e => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                {/* --- Editor de Horario --- */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock size={15} className="text-amber-500" />
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Horario de Clases</span>
                                    </div>
                                    <div className="space-y-2">
                                        {ALL_DAYS.map(day => {
                                            const slot = scheduleDraft[day];
                                            console.log(`[ADD MODAL] ${day}:`, { start: slot.start, startNormalized: normalizeTimeFormat(slot.start), end: slot.end, endNormalized: normalizeTimeFormat(slot.end), enabled: slot.enabled });
                                            return (
                                                <div
                                                    key={day}
                                                    className={`rounded-xl border transition-all ${slot.enabled
                                                        ? 'border-amber-200 bg-amber-50'
                                                        : 'border-slate-100 bg-slate-50'
                                                        }`}
                                                >
                                                    {/* Row header: checkbox + día */}
                                                    <label className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={slot.enabled}
                                                            onChange={e => updateDay(day, { enabled: e.target.checked })}
                                                            className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                                                        />
                                                        <span className={`text-sm font-bold w-20 ${slot.enabled ? 'text-amber-800' : 'text-slate-400'
                                                            }`}>{day}</span>

                                                        {/* Hora inicio / fin — sólo visible si activo */}
                                                        {slot.enabled && (
                                                            <div className="flex items-center gap-2 flex-1 flex-wrap">
                                                                <input
                                                                    type="time"
                                                                    value={normalizeTimeFormat(slot.start)}
                                                                    onChange={e => updateDay(day, { start: e.target.value })}
                                                                    className="h-8 px-2 bg-white border border-amber-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-300 outline-none"
                                                                />
                                                                <span className="text-xs text-slate-400">–</span>
                                                                <input
                                                                    type="time"
                                                                    value={normalizeTimeFormat(slot.end)}
                                                                    onChange={e => updateDay(day, { end: e.target.value })}
                                                                    className="h-8 px-2 bg-white border border-amber-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-300 outline-none"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Salón"
                                                                    value={slot.room}
                                                                    onChange={e => updateDay(day, { room: e.target.value })}
                                                                    className="h-8 px-2 bg-white border border-amber-200 rounded-lg text-xs flex-1 min-w-[80px] focus:ring-2 focus:ring-amber-300 outline-none"
                                                                />
                                                                <div className="relative">
                                                                    <select
                                                                        value={slot.roomType}
                                                                        onChange={e => updateDay(day, { roomType: e.target.value as ClassSchedule['roomType'] })}
                                                                        className="h-8 pl-2 pr-6 bg-white border border-amber-200 rounded-lg text-xs appearance-none focus:ring-2 focus:ring-amber-300 outline-none"
                                                                    >
                                                                        {ROOM_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                                                                    </select>
                                                                    <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                            </div>{/* /Body */}

                            {/* Footer */}
                            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl">
                                <button
                                    onClick={() => { setShowAddModal(false); setEditForm({}); setScheduleDraft(buildEmptyDays()); }}
                                    className="px-5 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddClass}
                                    disabled={isAdding}
                                    className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm transition-colors ${isAdding ? 'bg-slate-100 text-slate-400' : 'bg-gb-primary text-white hover:bg-gb-primary/90'
                                        }`}
                                >
                                    {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    Guardar Sección
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Quick-add modaQuickAddFacultyModalls (z-[60] para estar encima del modal principal) */}
                <QuickAddFacultyModal
                    isOpen={showQuickAddFaculty}
                    onClose={() => setShowQuickAddFaculty(false)}
                    onCreated={member => {
                        setFacultyCatalog(prev => [...prev, member]);
                        setEditForm(ef => ({ ...ef, facultyId: member.id }));
                    }}
                />
                <QuickAddModuleModal
                    isOpen={showQuickAddModule}
                    onClose={() => setShowQuickAddModule(false)}
                    onCreated={module => {
                        setModulesCatalog(prev => [...prev, module]);
                        setEditForm(ef => ({ ...ef, moduleId: module.id }));
                    }}
                />
            </AnimatePresence>

        </div>
    );
}