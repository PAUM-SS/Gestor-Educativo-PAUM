import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, BookOpen, Loader2 } from 'lucide-react';
import { Module } from '@/shared/types';
import { curriculumService } from '../services/curriculumService';
import { useApiError } from '../hooks/useApiError';
import { useToast } from '../context/ToastContext';

interface QuickAddModuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (module: Module) => void;
}

const EMPTY_FORM = {
    id: '',
    title: '',
    credits: 0,
    description: '',
    level: 'Básico' as Module['level'],
    status: 'pendiente' as Module['status'],
    semester: 1,
    competencies: [] as string[],
};

export default function QuickAddModuleModal({ isOpen, onClose, onCreated }: QuickAddModuleModalProps) {
    const { showToast } = useToast();
    const { loading: isSaving, execute } = useApiError();
    const [form, setForm] = useState(EMPTY_FORM);

    const handleClose = () => {
        setForm(EMPTY_FORM);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.id.trim() || !form.title.trim()) {
            showToast('El código y el nombre del módulo son requeridos.', 'error');
            return;
        }

        const payload: Module = {
            id: form.id.trim().toUpperCase(),
            title: form.title.trim(),
            credits: Number(form.credits) || 0,
            description: form.description.trim(),
            level: form.level,
            status: form.status,
            semester: Number(form.semester) || 1,
            competencies: [],
        };

        const created = await execute(
            () => curriculumService.addModule(payload),
            'No se pudo registrar el módulo.'
        );

        if (created) {
            showToast(`Módulo "${created.title}" registrado.`, 'success');
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
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <BookOpen size={16} className="text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Registrar Módulo</h3>
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
                            {/* Código */}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-0.5">
                                    Código / ID
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej. PAUS 001"
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm font-mono"
                                    value={form.id}
                                    onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                                />
                            </div>

                            {/* Créditos */}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-0.5">
                                    Créditos
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                    value={form.credits}
                                    onChange={e => setForm(f => ({ ...f, credits: Number(e.target.value) }))}
                                />
                            </div>
                        </div>

                        {/* Nombre / Título */}
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-0.5">
                                Nombre del Módulo
                            </label>
                            <input
                                required
                                type="text"
                                placeholder="Ej. Bioquímica Médica"
                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Semestre */}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-0.5">
                                    Semestre
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="12"
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                    value={form.semester}
                                    onChange={e => setForm(f => ({ ...f, semester: Number(e.target.value) }))}
                                />
                            </div>

                            {/* Nivel */}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-0.5">
                                    Nivel
                                </label>
                                <select
                                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm"
                                    value={form.level}
                                    onChange={e => setForm(f => ({ ...f, level: e.target.value as Module['level'] }))}
                                >
                                    <option value="Básico">Básico</option>
                                    <option value="Formativo">Formativo</option>
                                    <option value="Minerva">Minerva</option>
                                    <option value="Práctica/Servicio">Práctica/Servicio</option>
                                </select>
                            </div>
                        </div>

                        {/* Descripción opcional */}
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-0.5">
                                Descripción <span className="normal-case font-normal text-slate-300">(opcional)</span>
                            </label>
                            <textarea
                                rows={2}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gb-primary/20 outline-none text-sm resize-none"
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            />
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
                                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60"
                            >
                                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                Guardar Módulo
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
