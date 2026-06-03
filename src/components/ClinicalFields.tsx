import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Hospital,
  MapPin,
  CircleCheckBig,
  TriangleAlert,
  FileBadge,
  Plus,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';

import { ClinicalField } from '../types';
import { clinicalFieldService } from '../services/clinicalFieldService';
import ClinicalFieldModal from './ClinicalFieldModal';
import { ConfirmModal } from './ConfirmModal';
import { useApiError } from '../hooks/useApiError';
import { useToast } from '../context/ToastContext';

export default function ClinicalFields() {
  const { showToast } = useToast();
  const { loading: isLoading, execute: executeLoad } = useApiError(true);
  const { loading: isAdding, execute: executeAdd } = useApiError();
  const { loading: isUpdating, execute: executeUpdate } = useApiError();
  const { loading: isDeleting, execute: executeDelete } = useApiError();
  const [selectedClinicalField, setSelectedClinicalField] = useState<ClinicalField | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const [fields, setFields] = useState<ClinicalField[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadFields = async () => {
    const loadedFields = await executeLoad(
      () => clinicalFieldService.getClinicalFields(),
      'No se pudieron cargar las sedes clínicas. Verifica tu conexión.'
    );

    if (loadedFields) {
      setFields(loadedFields);
    }
  }
  useEffect(() => {
    void loadFields();
  }, []);

  const handleAddSite = async (newSite: ClinicalField) => {
    const created = await executeAdd(
      () => clinicalFieldService.addClinicalField(newSite),
      'No se pudo registrar la sede clínica. Intenta de nuevo.'
    );

    if (created) {
      setFields((prev) => [created, ...prev]);
      setIsModalOpen(false);
      showToast('Sede clínica registrada correctamente.', 'success');
    }
  };

  const handleUpdateField = async (updatedField: ClinicalField) => {
    const updated = await executeUpdate(
      () => clinicalFieldService.updateClinicalField(updatedField.id, updatedField),
      'No se pudo actualizar el registro de sedes clínicas. Intenta de nuevo.'
    );

    if (updated) {
      setFields(prev => prev.map(f => f.id === updated.id ? updated : f));
      setSelectedClinicalField(null);
      setIsModalOpen(false);
      showToast('Sede clínica actualizada correctamente.', 'success');
    }
  };

  const handleEditClick = (field: ClinicalField) => {
    setSelectedClinicalField(field);
    setIsModalOpen(true);
  };

  const handleDeleteClick = () => {
    if (!selectedClinicalField) return;
    setConfirmDelete({ id: selectedClinicalField.id, name: selectedClinicalField.name });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const { id, name } = confirmDelete;
    setConfirmDelete(null);

    const deleted = await executeDelete(
      () => clinicalFieldService.deleteClinicalField(id),
      `No se pudo dar de baja a ${name}. Intenta de nuevo.`
    );

    if (deleted) {
      setFields(prev => prev.filter(f => f.id !== id));
      setSelectedClinicalField(null);
      showToast(`${name} dado de baja del sistema.`, 'success');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-display font-bold text-gb-text tracking-tight">Base de Sedes Clínicas</h2>
          <p className="text-slate-500 mt-1">Evaluación de pertinencia y capacidad para el programa PAUM.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gb-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gb-primary/90 transition-all active:scale-95"
        >
          <Plus size={20} />
          Registrar Sede
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Sedes Activas', value: fields.filter((field) => field.status === 'Activo').length.toString(), icon: Hospital, color: 'text-gb-primary' },
          { label: 'Plazas Totales', value: fields.reduce((acc, curr) => acc + curr.slots, 0).toString(), icon: CircleCheckBig, color: 'text-gb-accent' },
          { label: 'Nivel 3 (Alta)', value: fields.filter((field) => field.level === 3).length.toString(), icon: FileBadge, color: 'text-gb-secondary' },
          { label: 'Convenios x Vencer', value: fields.filter((field) => field.status === 'En Revisión' || field.status === 'Vencido').length.toString(), icon: TriangleAlert, color: 'text-amber-500' },
        ].map((stat) => (
          <div key={stat.label} className="geometric-card p-4">
            <div className={`flex items-center gap-2 ${stat.color} mb-2`}>
              <stat.icon size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-gb-text">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="geometric-card overflow-hidden">
        <div className="table-header-gb grid grid-cols-[1.5fr_100px_80px_1fr_120px_120px_80px]">
          <div>Sede / Hospital</div>
          <div className="text-center">Tipo</div>
          <div className="text-center">Nivel</div>
          <div>Pertinencia Académica</div>
          <div className="text-center">Capacidad</div>
          <div className="text-center">Estatus</div>
          <div className="text-center">Acciones</div>
        </div>
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-10 text-center text-slate-500">
              <Loader2 size={40} className="mx-auto mb-3 text-slate-300 animate-spin" />
              <p className="font-bold">Cargando sedes registradas...</p>
            </div>
          ) : fields.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              <Hospital size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold">No hay sedes registradas</p>
              <p className="text-xs mt-1">Utilice el botón "Registrar Sede" para agregar nuevos campos clínicos.</p>
            </div>
          ) : (
            fields.map((field) => (
              <div key={field.id} className="table-row-gb grid grid-cols-[1.5fr_100px_80px_1fr_120px_120px_80px] items-center py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded">
                    <Hospital className="text-gb-primary" size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gb-secondary text-sm">{field.name}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 uppercase tracking-tighter">
                      <MapPin size={10} /> Puebla, México
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-600 rounded">
                    {field.type}
                  </span>
                </div>
                <div className="text-center text-xs font-bold text-gb-text">{field.level}</div>
                <div className="text-[11px] text-gb-text/70 leading-tight pr-4">{field.pertinence}</div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gb-primary">{field.slots}</p>
                  <p className="text-[9px] text-slate-400 leading-none">alumnos/ciclo</p>
                </div>
                <div className="text-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${field.status === 'Activo'
                      ? 'bg-gb-accent/10 text-gb-accent'
                      : field.status === 'En Revisión'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-red-50 text-red-500'
                      }`}
                  >
                    {field.status}
                  </span>
                  <p className="text-[8px] text-slate-400 mt-1 uppercase tracking-tighter">Vence: {field.agreementExpiry}</p>
                </div>
                <div className="flex justify-center gap-2">
                  <button onClick={() => handleEditClick(field)} className="text-slate-400 hover:text-gb-primary transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => { setSelectedClinicalField(field); setTimeout(handleDeleteClick, 0); }} className="text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ClinicalFieldModal
        isOpen={isModalOpen}
        isSaving={isAdding || isUpdating}
        initialData={selectedClinicalField}
        onClose={() => {
          if (!isAdding && !isUpdating) {
            setIsModalOpen(false);
            setSelectedClinicalField(null);
          }
        }}
        onSave={selectedClinicalField ? handleUpdateField : handleAddSite}
      />

      <AnimatePresence>
        {confirmDelete && (
          <ConfirmModal
            title="¿Dar de baja sede?"
            message={
              <>
                Estás a punto de eliminar <strong>{confirmDelete.name}</strong> del sistema. Esta acción no se puede deshacer.
              </>
            }
            confirmText="Eliminar Sede"
            isProcessing={isDeleting}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
