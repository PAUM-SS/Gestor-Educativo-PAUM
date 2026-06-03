import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Hospital } from 'lucide-react';
import { ClinicalField } from '../types';

interface ClinicalFieldModalProps {
  isOpen: boolean;
  isSaving?: boolean;
  initialData?: ClinicalField | null;
  onClose: () => void;
  onSave: (field: ClinicalField) => void | Promise<void>;
}

export default function ClinicalFieldModal({ isOpen, isSaving = false, initialData, onClose, onSave }: ClinicalFieldModalProps) {
  const [formData, setFormData] = useState<Partial<ClinicalField>>({
    name: '',
    type: 'Público',
    level: 2,
    slots: 10,
    status: 'En Revisión',
    pertinence: '',
    lastInspection: new Date().toISOString().split('T')[0],
    agreementExpiry: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          name: '',
          type: 'Público',
          level: 2,
          slots: 10,
          status: 'En Revisión',
          pertinence: '',
          lastInspection: new Date().toISOString().split('T')[0],
          agreementExpiry: ''
        });
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      id: initialData?.id || `cf-${Date.now()}`
    } as ClinicalField);
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
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100"
        >
          <div className="bg-gb-secondary text-white p-6 relative">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-3 mb-1">
              <Hospital size={24} className="text-gb-accent" />
              <h2 className="text-xl font-bold font-display">
                {initialData ? 'Editar Sede Clínica' : 'Registrar Nueva Sede Clínica'}
              </h2>
            </div>
            <p className="text-white/70 text-sm">Ingrese los datos para la evaluación de pertinencia académica.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nombre de la Institución / Sede</label>
                <input
                  required
                  type="text"
                  className="w-full border-2 border-slate-100 rounded-lg p-3 text-sm focus:border-gb-primary outline-none transition-colors"
                  placeholder="Ej. Hospital Universitario de Puebla"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tipo de Sede</label>
                <select
                  className="w-full border-2 border-slate-100 rounded-lg p-3 text-sm focus:border-gb-primary outline-none bg-white"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="Público">Público</option>
                  <option value="Privado">Privado</option>
                  <option value="Social">Social</option>
                  <option value="Rescate">Rescate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nivel de Atención</label>
                <select
                  className="w-full border-2 border-slate-100 rounded-lg p-3 text-sm focus:border-gb-primary outline-none bg-white"
                  value={formData.level}
                  onChange={e => setFormData({ ...formData, level: Number(e.target.value) as any })}
                >
                  <option value={1}>Nivel 1 (Básico / Prehospitalario)</option>
                  <option value={2}>Nivel 2 (Hospital General)</option>
                  <option value={3}>Nivel 3 (Especialidades)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Capacidad (Plazas)</label>
                <input
                  required
                  type="number"
                  min="1"
                  className="w-full border-2 border-slate-100 rounded-lg p-3 text-sm focus:border-gb-primary outline-none"
                  value={formData.slots}
                  onChange={e => setFormData({ ...formData, slots: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Vencimiento del Convenio</label>
                <input
                  required
                  type="date"
                  className="w-full border-2 border-slate-100 rounded-lg p-3 text-sm focus:border-gb-primary outline-none"
                  value={formData.agreementExpiry}
                  onChange={e => setFormData({ ...formData, agreementExpiry: e.target.value })}
                />
              </div>

              <div className='col-span-2'>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Estatus</label>
                <select
                  className="w-full border-2 border-slate-100 rounded-lg p-3 text-sm focus:border-gb-primary outline-none bg-white"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="Activo">Activo</option>
                  <option value="En Revisión">En Revisión</option>
                  <option value="Vencido">Vencido</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Justificación de Pertinencia</label>
                <textarea
                  required
                  rows={3}
                  className="w-full border-2 border-slate-100 rounded-lg p-3 text-sm focus:border-gb-primary outline-none resize-none"
                  placeholder="Describa la viabilidad académica, rotaciones críticas y cumplimiento del RIPPPA..."
                  value={formData.pertinence}
                  onChange={e => setFormData({ ...formData, pertinence: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-gb-primary text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-gb-primary/90 transition-all active:scale-95 disabled:opacity-60"
              >
                <Save size={18} />
                {isSaving ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Guardar Sede')}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

