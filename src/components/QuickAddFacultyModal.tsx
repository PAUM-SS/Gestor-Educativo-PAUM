import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, UserPlus, Loader2 } from 'lucide-react';
import { FacultyMember } from '../types';
import { facultyService } from '../services/facultyService';
import { useApiError } from '../hooks/useApiError';
import { useToast } from '../context/ToastContext';

interface QuickAddFacultyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (member: FacultyMember) => void;
}

const EMPTY_FORM: Partial<FacultyMember> = {
    id: '',
    name: '',
    category: 'Profesor de Asignatura',
    level: 'Asociado A',
    dedication: 'Hora Clase',
    adscription: 'Facultad de Medicina',
    seniority: 0,
    compliance: { cedula: false, medicalExam: false, inductionCourse: false, annualEvaluation: 0 },
};

export default function QuickAddFacultyModal({ isOpen, onClose, onCreated }: QuickAddFacultyModalProps) {
    const { showToast } = useToast();
    const { loading: isSaving, execute } = useApiError();
    const [form, setForm] = useState<Partial<FacultyMember>>(EMPTY_FORM);

    const handleClose = () => {
        setForm(EMPTY_FORM);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.id?.trim() || !form.name?.trim()) {
            showToast('El ID y el nombre del docente son requeridos.', 'error');
            return;
        }

        const payload: FacultyMember = {
            ...EMPTY_FORM,
            ...form,
            id: form.id!.trim(),
            name: form.name!.trim(),
            seniority: Number(form.seniority) || 0,
            compliance: { cedula: false, medicalExam: false, inductionCourse: false, annualEvaluation: 0 },
            weeklySchedule: [],
            permissions: [],
        } as FacultyMember;

        const created = await execute(
            () => facultyService.addFaculty(payload),
            'No se pudo registrar al docente.'
        );

        if (created) {
            showToast(`Docente "${created.name}" registrado.`, 'success');
            onCreated(created);
            handleClose();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    onClick={handleClose}
                />

                {/* Panel */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gb-primary/10 flex items-center justify-center">
                                <UserPlus size={16} className="text-gb-primary" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Registrar Docente</h3>
                                <p className="text-[10px] text-slate-400">Datos mínimos requeridos</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-5 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            {/* ID */}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-0.5">
                                    ID / Núm. de empleado
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej. FAC-0123"
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm font-mono"
                                    value={form.id ?? ''}
                                    onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                                />
                            </div>

                            {/* Antigüedad */}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-0.5">
                                    Antigüedad (años)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                    value={form.seniority ?? 0}
                                    onChange={e => setForm(f => ({ ...f, seniority: Number(e.target.value) }))}
                                />
                            </div>
                        </div>

                        {/* Nombre */}
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-0.5">
                                Nombre Completo
                            </label>
                            <input
                                required
                                type="text"
                                placeholder="Ej. Ramírez Torres Carlos"
                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                value={form.name ?? ''}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Categoría */}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-0.5">
                                    Categoría
                                </label>
                                <select
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                    value={form.category}
                                    onChange={e => setForm(f => ({ ...f, category: e.target.value as FacultyMember['category'] }))}
                                >
                                    <option value="Profesor-Investigador">Profesor-Investigador</option>
                                    <option value="Técnico Académico">Técnico Académico</option>
                                    <option value="Profesor de Asignatura">Profesor de Asignatura</option>
                                </select>
                            </div>

                            {/* Dedicación */}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-0.5">
                                    Dedicación
                                </label>
                                <select
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                    value={form.dedication}
                                    onChange={e => setForm(f => ({ ...f, dedication: e.target.value as FacultyMember['dedication'] }))}
                                >
                                    <option value="Tiempo Completo">Tiempo Completo</option>
                                    <option value="Medio Tiempo">Medio Tiempo</option>
                                    <option value="Hora Clase">Hora Clase</option>
                                </select>
                            </div>

                            {/* Nivel */}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-0.5">
                                    Nivel
                                </label>
                                <select
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                    value={form.level}
                                    onChange={e => setForm(f => ({ ...f, level: e.target.value as FacultyMember['level'] }))}
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

                            {/* Adscripción */}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-0.5">
                                    Adscripción
                                </label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                    value={form.adscription ?? ''}
                                    onChange={e => setForm(f => ({ ...f, adscription: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSaving}
                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center gap-2 px-5 py-2 bg-gb-primary text-white rounded-xl font-bold text-sm hover:bg-gb-primary/90 transition-colors disabled:opacity-60"
                            >
                                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                Guardar Docente
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
