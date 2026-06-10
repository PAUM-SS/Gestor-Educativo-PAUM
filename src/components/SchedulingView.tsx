import { useState, useEffect, useMemo } from 'react';
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
    Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useApiError } from '../hooks/useApiError';
import { useToast } from '../context/ToastContext';
import { ClassSchedule, AcademicSection } from '../types';
import { MOCK_SECTIONS } from '../constants';
import { SchedulerService } from '../services/SchedulerService';

export default function SchedulingView() {
    const { showToast } = useToast();
    const { loading: isLoading, execute: executeLoad } = useApiError();

    const [classes, setClasses] = useState<AcademicSection[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals / Panels
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState<AcademicSection | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<AcademicSection>>({});

    useEffect(() => {
        void loadClasses();
    }, []);

    // --- Helpers ---
    const formatSchedule = (schedules: ClassSchedule[]) => {
        if (!schedules || schedules.length === 0) return 'Sin horario asignado';
        // Mapea a las primeras 3 letras (ej. Lun, Mar)
        const days = schedules.map(s => s.day.substring(0, 3)).join(', ');
        const time = `${schedules[0].start} - ${schedules[0].end}`;
        return `${days} | ${time}`;
    };

    const loadClasses = async () => {
        const result = await executeLoad(
            () => SchedulerService.getClasses(),
            'No se pudo cargar el listado de clases. Verifica tu conexión.'
        );
        if (result) setClasses(result);
    };

    // --- Estadísticas Derivadas ---
    const totalClasses = classes.length;
    const classesByModule = useMemo(() => {
        const counts: Record<string, number> = {};
        classes.forEach(c => {
            const mod = c.moduleId || 'N/A';
            counts[mod] = (counts[mod] || 0) + 1;
        });
        return counts;
    }, [classes]);

    // --- Filtros ---
    const filteredClasses = classes.filter(c =>
        c.moduleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.facultyId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- Handlers ---
    const handleEditClick = () => {
        setEditForm(selectedClass as AcademicSection);
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!editForm.id) return;

        const updated = await executeLoad(
            () => SchedulerService.updateClass(editForm.id!, editForm),
            'No se pudo actualizar la clase.'
        );

        if (updated) {
            setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
            setSelectedClass(updated);
            setIsEditing(false);
            showToast('Clase actualizada', 'success');
        }
    };

    const handleDeleteClass = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar esta clase?')) {
            const success = await executeLoad(
                () => SchedulerService.deleteClass(id),
                'No se pudo eliminar la clase.'
            );
            if (success) {
                setClasses(prev => prev.filter(c => c.id !== id));
                setSelectedClass(null);
                setIsEditing(false);
                showToast('Clase eliminada', 'success');
            }
        }
    };

    const handleAddClass = async () => {
        const newClass = {
            id: editForm.id || `sec-${Date.now()}`,
            moduleId: editForm.moduleId || '',
            facultyId: editForm.facultyId || '',
            capacity: editForm.capacity || 0,
            enrolled: 0,
            schedule: editForm.schedule || []
        } as AcademicSection;

        const created = await executeLoad(
            () => SchedulerService.addClass(newClass),
            'No se pudo registrar la clase.'
        );

        if (created) {
            setClasses(prev => [created, ...prev]);
            setShowAddModal(false);
            setEditForm({});
            showToast('Clase registrada', 'success');
        }
    };

    const handleImportDatabase = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv, application/json, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const result = await executeLoad(
                () => SchedulerService.importSections(file),
                'No se pudo importar la base de datos de clases.'
            );

            if (result) {
                showToast(`Se importaron ${result.created} clases y se actualizaron ${result.updated}.`, 'success');
                void loadClasses();
            }
        };
        input.click();
    };

    const closePanel = () => {
        setSelectedClass(null);
        setIsEditing(false);
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
                    <button onClick={handleImportDatabase} className="flex items-center gap-2 bg-white text-gb-secondary border border-slate-200 px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm">
                        <UploadCloud size={18} className="text-gb-primary" />
                        Importar Base (Excel/CSV)
                    </button>
                    <button
                        onClick={() => { setEditForm({}); setShowAddModal(true); }}
                        className="flex items-center gap-2 bg-gb-primary text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-gb-primary/90 transition-all shadow-lg"
                    >
                        <Plus size={18} />
                        Agregar clase
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
                        {Object.entries(classesByModule).slice(0, 8).map(([mod, count]) => (
                            <span key={mod} className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-800 font-bold text-xs rounded-lg shadow-sm">
                                {mod}: <span className="text-indigo-500">{count} secc.</span>
                            </span>
                        ))}
                        {Object.keys(classesByModule).length > 8 && (
                            <span className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-500 font-bold text-xs rounded-lg shadow-sm">
                                +{Object.keys(classesByModule).length - 8} más
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="table-header-gb">
                                <th className="px-5 py-4">ID Sección</th>
                                <th className="px-4 py-4">Módulo (ID)</th>
                                <th className="px-4 py-4">Horario</th>
                                <th className="px-4 py-4">Docente</th>
                                <th className="px-4 py-4 text-center">Cupo</th>
                                <th className="px-4 py-4 text-center">Inscritos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredClasses.map((cls) => (
                                <tr
                                    key={cls.id}
                                    className="table-row-gb group cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => setSelectedClass(cls)}
                                >
                                    <td className="px-5 py-3">
                                        <span className="font-bold text-gb-primary bg-blue-50 px-2 py-1 rounded-md text-xs border border-blue-100">
                                            {cls.id}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{cls.moduleId}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-xs text-slate-600 font-medium">{formatSchedule(cls.schedule)}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-xs text-slate-600 font-medium truncate max-w-[200px]" title={cls.facultyId}>
                                            {cls.facultyId || <span className="text-slate-400 italic">Sin asignar</span>}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                            {cls.capacity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                                            cls.enrolled >= cls.capacity && cls.capacity > 0
                                                ? 'bg-rose-100 text-rose-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {cls.enrolled}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredClasses.length === 0 && (
                        <div className="p-12 text-center text-slate-500 font-medium">
                            No se encontraron clases con ese criterio.
                        </div>
                    )}
                </div>
            </div>

            {/* --- Exportar Base --- */}
            <div className="flex justify-end pt-2">
                <button className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-emerald-100 transition-all shadow-sm">
                    <DownloadCloud size={18} />
                    Exportar Base
                </button>
            </div>

            {/* --- Panel de Detalles / Edición --- */}
            <AnimatePresence>
                {selectedClass && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h2 className="text-xl font-display font-bold text-slate-800">
                                    {isEditing ? 'Editar Clase' : 'Ficha de la Clase'}
                                </h2>
                                <button onClick={closePanel} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1">
                                {!isEditing ? (
                                    /* VISTA DE SOLO LECTURA */
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-2xl font-bold text-slate-900">{selectedClass.moduleId}</h3>
                                                <p className="text-slate-500 font-mono mt-1">ID Sección: {selectedClass.id}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm border border-blue-200">
                                                    {selectedClass.enrolled}/{selectedClass.capacity} inscritos
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-1"><Users size={14} /> Docente Asignado</p>
                                                <p className="font-medium text-slate-800 text-sm">{selectedClass.facultyId || <span className="italic text-slate-400">Sin asignar</span>}</p>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-1"><MapPin size={14} /> Edificio y Salón</p>
                                                {selectedClass.schedule.length > 0 ? (
                                                    <p className="font-medium text-slate-800 text-sm">
                                                        {selectedClass.schedule[0].room || '—'}
                                                        <span className="text-slate-400 text-xs ml-1">({selectedClass.schedule[0].roomType})</span>
                                                    </p>
                                                ) : (
                                                    <p className="font-medium text-slate-400 text-sm italic">Sin salón asignado</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                                                <Clock size={18} className="text-amber-500" /> Horario Programado
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedClass.schedule.length > 0 ? selectedClass.schedule.map((sch, idx) => (
                                                    <div key={idx} className="bg-amber-50 text-amber-800 border border-amber-100 px-3 py-1.5 rounded-lg text-sm font-medium">
                                                        <span className="font-bold">{sch.day}:</span> {sch.start} - {sch.end}
                                                        {sch.room && <span className="ml-2 text-amber-600 text-xs">· {sch.room}</span>}
                                                    </div>
                                                )) : (
                                                    <p className="text-slate-400 italic text-sm">Sin horario programado</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* VISTA DE EDICIÓN */
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">ID Módulo</label>
                                                <input
                                                    type="text"
                                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                                    value={editForm.moduleId || ''}
                                                    onChange={e => setEditForm({ ...editForm, moduleId: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Docente (ID)</label>
                                                <input
                                                    type="text"
                                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                                    value={editForm.facultyId || ''}
                                                    onChange={e => setEditForm({ ...editForm, facultyId: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Cupo</label>
                                                <input
                                                    type="number"
                                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                                    value={editForm.capacity || 0}
                                                    onChange={e => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

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
                                                onClick={() => handleDeleteClass(selectedClass.id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors"
                                            >
                                                <Trash2 size={16} /> Eliminar
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleSaveEdit}
                                            className="flex items-center gap-2 px-6 py-2 bg-gb-primary text-white rounded-xl font-bold text-sm hover:bg-gb-primary/90 transition-colors"
                                        >
                                            <Save size={16} /> Guardar Cambios
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
            </AnimatePresence>

            {/* Modal: Agregar Clase */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Registrar Nueva Clase</h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">ID / NRC</label>
                                <input
                                    type="text"
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                    value={editForm.id || ''}
                                    onChange={e => setEditForm({ ...editForm, id: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">ID del Módulo</label>
                                <input
                                    type="text"
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                    value={editForm.moduleId || ''}
                                    onChange={e => setEditForm({ ...editForm, moduleId: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Docente (ID)</label>
                                <input
                                    type="text"
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                    value={editForm.facultyId || ''}
                                    onChange={e => setEditForm({ ...editForm, facultyId: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Cupo Máximo</label>
                                <input
                                    type="number"
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                    value={editForm.capacity || 0}
                                    onChange={e => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</button>
                            <button onClick={handleAddClass} className="px-4 py-2 bg-gb-primary text-white rounded-xl font-bold">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}