import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  ChevronDown,
  Clock,
  Award,
  Layers,
  Plus,
  Upload,
  Download,
  Calendar,
  FileCheck,
  FileText,
  File,
  ClipboardList,
  Target,
  Sparkles,
  ShieldAlert,
  X,
  CircleCheckBig,
  CircleAlert,
  Eye,
  ArrowLeft,
  Minus,
  Printer,
  Loader2,
  Pencil,
} from 'lucide-react';
import { curriculumService } from '../services/curriculumService';
import { Module } from '../types';
import { useApiError } from '../hooks/useApiError';
import { useToast } from '../context/ToastContext';
import PDFPreview from './PDFPreview';
import InfoPanel from '@/src/components/InstructionInfo';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ProgramFile = {
  name: string;
  url: string;
};

type ModuleFiles = {
  syllabus?: ProgramFile;
  planning?: ProgramFile;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildModuleFilesState(modules: Module[]): Record<string, ModuleFiles> {
  return modules.reduce<Record<string, ModuleFiles>>((acc, module) => {
    acc[module.id] = {
      syllabus: module.syllabusUrl
        ? { name: module.syllabusFileName || 'Programa académico.pdf', url: module.syllabusUrl }
        : undefined,
      planning: module.didacticPlanningUrl
        ? { name: module.didacticPlanningFileName || 'Planeación didáctica.pdf', url: module.didacticPlanningUrl }
        : undefined,
    };
    return acc;
  }, {});
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Curriculum({ onModuleUpdate }: { onModuleUpdate?: () => void }) {
  const { showToast } = useToast();
  const { loading: isLoadingModules, execute: executeLoad } = useApiError(true);
  const { loading: isUploading, execute: executeUpload } = useApiError();

  const [openSemesters, setOpenSemesters] = useState<Record<string, boolean>>({ '1° Semestre': true, '2° Semestre': true });
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleFiles, setModuleFiles] = useState<Record<string, ModuleFiles>>({});
  const [selectedPlanningModule, setSelectedPlanningModule] = useState<Module | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [pendingPlanning, setPendingPlanning] = useState<{
    module: Module;
    detectedUnits: { unitNumber: string; title: string; content: string }[];
    learningOutcome: string;
  } | null>(null);
 
  

  // ─── Carga inicial ──────────────────────────────────────────────────────────

  const load = async () => {
    const loadedModules = await executeLoad(
      () => curriculumService.getModules(),
      'No se pudo cargar el plan de estudios. Verifica tu conexión.'
    );
    if (loadedModules) {
      setModules(loadedModules);
      setModuleFiles(buildModuleFilesState(loadedModules));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const toggleSemester = (sem: string) => {
    setOpenSemesters(prev => ({ ...prev, [sem]: !prev[sem] }));
  };

  const handleFileUpload = async (moduleId: string, type: 'syllabus' | 'planning', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        window.alert('Solo se permiten archivos PDF para programa o planeación.');
        return;
      }

      const requestKey = `${moduleId}:${type}`;
      setUploadingKey(requestKey);

      try {
        const result = await curriculumService.uploadModuleDocument(moduleId, type, file);

        if (!result) {
          window.alert('No se pudo guardar el documento del módulo.');
          return;
        }

        const { module: updatedModule, detectedUnits } = result;

        setModules(prev => prev.map(m => m.id === updatedModule.id ? updatedModule : m));
        setModuleFiles(prev => ({
          ...prev,
          [moduleId]: {
            ...prev[moduleId],
            [type]: {
              name: type === 'syllabus'
                ? updatedModule.syllabusFileName || file.name
                : updatedModule.didacticPlanningFileName || file.name,
              url: type === 'syllabus'
                ? updatedModule.syllabusUrl || ''
                : updatedModule.didacticPlanningUrl || '',
            },
          },
        }));

        // Si es syllabus y se detectaron unidades, abrir modal de sesiones
        if (type === 'syllabus' && detectedUnits && detectedUnits.length > 0) {
          setPendingPlanning({ module: updatedModule, detectedUnits, learningOutcome: result.learningOutcome || '' });
        }

      } finally {
        setUploadingKey(null);
      }
    }
  };

  // ─── Datos derivados ────────────────────────────────────────────────────────

  const groupedModules = useMemo(() => {
    const groups: Record<string, Module[]> = {};
    modules.forEach(m => {
      const key = typeof m.semester === 'number' ? `${m.semester}° Semestre` : String(m.semester);
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  }, [modules]);

  const orderedSemesters = useMemo(() => {
    return Object.keys(groupedModules).sort((a, b) => {
      if (a.includes('Semestre') && b.includes('Semestre')) return a.localeCompare(b, undefined, { numeric: true });
      if (a.includes('Semestre')) return -1;
      if (b.includes('Semestre')) return 1;
      return a.localeCompare(b);
    });
  }, [groupedModules]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-gb-text tracking-tight">Plan de Estudios 2016</h2>
          <p className="text-slate-500 mt-1">
            Módulos agrupados por semestre con control y distribución de Programas Académicos.
          </p>
        </div>
        <button
          onClick={() => setIsReportPreviewOpen(true)}
          className="flex items-center gap-2 bg-gb-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gb-primary/90 transition-all active:scale-95 shadow-sm"
        >
          <Layers size={18} />
          Reporte Retícula
        </button>
      </header>

      <InfoPanel
        title="Gestión de Retícula"
        content="En esta sección se gestiona el Plan de Estudios 2016. Puede visualizar los módulos por semestre, verificar su estado de avance y cargar los programas académicos y las planeaciones didácticas correspondientes a cada módulo. Asegúrese de que los archivos cargados sean en formato PDF para una correcta visualización."
      />

      {/* Stats Summary */}
      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
        {[
          { label: 'Créditos Totales', value: '139', icon: Award },
          { label: 'Módulos Totales', value: '33', icon: Layers },
          { label: 'Horas Prácticas', value: '1,300', icon: Clock },
        ].map(stat => (
          <div key={stat.label} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 min-w-fit pr-8 shadow-sm">
            <div className="p-3 bg-blue-50 text-gb-primary rounded-lg border border-blue-100">
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gb-secondary leading-none">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Spinner de carga inicial */}
      {isLoadingModules ? (
        <div className="p-16 text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-3 text-gb-primary" />
          <p className="text-sm font-medium text-slate-400">Cargando plan de estudios...</p>
        </div>
      ) : (
        /* Accordion List - Grouped by Semester */
        <div className="space-y-4">
          {orderedSemesters.map((sem, idx) => {
            const isOpen = openSemesters[sem] || false;
            const mods = groupedModules[sem];

            const uploadedCount = mods.filter(m => moduleFiles[m.id]?.syllabus).length;
            const planningCount = mods.filter(m => moduleFiles[m.id]?.planning).length;
            const totalTarget = mods.length * 2;
            const currentTotal = uploadedCount + planningCount;
            const progProgress = Math.round((currentTotal / totalTarget) * 100);

            return (
              <div key={sem} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all">
                {/* Accordion Header */}
                <button
                  onClick={() => toggleSemester(sem)}
                  className="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gb-primary/10 text-gb-primary">
                      {idx + 1}
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gb-secondary">{sem}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {mods.length} Módulos • {uploadedCount} Programas • {planningCount} Planeaciones
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="hidden md:flex flex-col items-end gap-1 w-24">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                        Prog. {progProgress}%
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progProgress}%` }} />
                      </div>
                    </div>
                    <div className={`p-2 rounded-full transition-transform ${isOpen ? 'rotate-180 bg-slate-100 text-gb-primary' : 'bg-slate-50 text-slate-400'}`}>
                      <ChevronDown size={20} />
                    </div>
                  </div>
                </button>

                {/* Accordion Body */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50">
                        <div className="grid grid-cols-1 gap-3 mt-4">
                          {mods.map(module => {
                            const files = moduleFiles[module.id] || {};

                            return (
                              <div key={module.id} className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-all shadow-sm group">

                                <div className="flex gap-4 flex-1">
                                  <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${module.level === 'Minerva' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                    module.level === 'Básico' ? 'bg-blue-50 text-gb-primary border border-blue-200' :
                                      module.level === 'Formativo' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                                        'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}>
                                    <BookOpen size={20} />
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{module.code}</span>
                                      <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-widest ${module.level === 'Minerva' ? 'bg-amber-100 text-amber-700' :
                                        module.level === 'Básico' ? 'bg-blue-100 text-blue-700' :
                                          module.level === 'Formativo' ? 'bg-purple-100 text-purple-700' :
                                            'bg-slate-200 text-slate-700'
                                        }`}>
                                        {module.level}
                                      </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-gb-secondary group-hover:text-gb-primary transition-colors leading-tight">
                                      {module.title}
                                    </h4>
                                    <div className="flex items-center gap-3 mt-1.5 overflow-hidden">
                                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                                        {module.credits} Créditos
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-medium truncate">
                                        {module.instructor}
                                      </span>
                                      <button
                                        onClick={() => setEditingModule(module)}
                                        className="flex items-center gap-1 text-[9px] font-bold text-gb-primary uppercase bg-gb-primary/5 px-2 py-1 rounded hover:bg-gb-primary/10 transition-colors mt-1"
                                      >
                                        <Pencil size={10} /> Editar módulo
                                      </button>
                                    </div>

                                    {module.planning && (() => {
                                      const totalSessions = module.planning.units.reduce((acc, u) => acc + u.sessions, 0);
                                      const completedSessions = module.planning.units.reduce((acc, u) => acc + u.completedSessions, 0);
                                      const progress = Math.round((completedSessions / totalSessions) * 100);

                                      return (
                                        <div className="mt-3 space-y-2">
                                          <div className="flex justify-between items-end">
                                            <button
                                              onClick={() => setSelectedPlanningModule(module)}
                                              className="flex items-center gap-1.5 text-[10px] font-bold text-white bg-gb-primary hover:bg-gb-secondary px-3 py-1.5 rounded-lg shadow-lg shadow-blue-900/10 transition-all group/plan animate-in fade-in slide-in-from-left-2 duration-500"
                                            >
                                              <ClipboardList size={14} className="group-hover/plan:rotate-6 transition-transform" />
                                              Ver Planeación Digitalizada
                                              <Sparkles size={12} className="text-amber-300 animate-pulse ml-1" />
                                            </button>
                                            <span className="text-[10px] font-black text-gb-primary bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                              {progress}% AVANCE
                                            </span>
                                          </div>
                                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                            <motion.div
                                              initial={{ width: 0 }}
                                              animate={{ width: `${progress}%` }}
                                              className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-gb-primary'}`}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>

                                {/* Files Area */}
                                <div className="grid grid-cols-2 gap-4 shrink-0 xl:w-[420px] pt-4 xl:pt-0 border-t xl:border-t-0 xl:border-l border-slate-100 xl:pl-6">
                                  {/* Programa Académico */}
                                  <div className="space-y-2">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Programa Académico</p>
                                    {files.syllabus ? (
                                      <div className="flex items-center justify-between bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <FileCheck size={14} className="text-emerald-600 shrink-0" />
                                          <p className="text-[10px] font-medium text-emerald-800 truncate" title={files.syllabus.name}>{files.syllabus.name}</p>
                                        </div>
                                        <div className="flex gap-1">
                                          <a href={files.syllabus.url} download={files.syllabus.name} target="_blank" rel="noreferrer" className="p-1 text-emerald-600 hover:bg-emerald-100 rounded transition-colors">
                                            <Download size={14} />
                                          </a>
                                          <label className={`cursor-pointer p-1 text-emerald-400 hover:text-gb-primary ${uploadingKey === `${module.id}:syllabus` ? 'pointer-events-none opacity-50' : ''}`}>
                                            {uploadingKey === `${module.id}:syllabus`
                                              ? <Loader2 size={14} className="animate-spin" />
                                              : <Upload size={14} />
                                            }
                                            <input type="file" className="hidden" accept=".pdf" onChange={e => handleFileUpload(module.id, 'syllabus', e)} />
                                          </label>
                                        </div>
                                      </div>
                                    ) : (
                                      <label className={`cursor-pointer flex items-center justify-center gap-2 py-2 border border-dashed border-slate-300 hover:border-gb-primary hover:bg-blue-50 text-slate-500 hover:text-gb-primary rounded-lg text-[10px] font-bold transition-all ${uploadingKey === `${module.id}:syllabus` ? 'pointer-events-none opacity-50' : ''}`}>
                                        {uploadingKey === `${module.id}:syllabus`
                                          ? <><Loader2 size={12} className="animate-spin" /> Guardando PDF...</>
                                          : <><FileText size={12} /> Subir Programa</>
                                        }
                                        <input type="file" className="hidden" accept=".pdf" onChange={e => handleFileUpload(module.id, 'syllabus', e)} />
                                      </label>
                                    )}
                                  </div>

                                  {/* Planeación Didáctica */}
                                  <div className="space-y-2">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Planeación Didáctica</p>
                                    {files.planning ? (
                                      <div className="flex items-center justify-between bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <FileCheck size={14} className="text-gb-primary shrink-0" />
                                          <p className="text-[10px] font-medium text-gb-secondary truncate" title={files.planning.name}>{files.planning.name}</p>
                                        </div>
                                        <div className="flex gap-1">
                                          <a href={files.planning.url} download={files.planning.name} target="_blank" rel="noreferrer" className="p-1 text-gb-primary hover:bg-blue-100 rounded transition-colors">
                                            <Download size={14} />
                                          </a>
                                          <label className={`cursor-pointer p-1 text-slate-400 hover:text-gb-primary ${uploadingKey === `${module.id}:planning` ? 'pointer-events-none opacity-50' : ''}`}>
                                            {uploadingKey === `${module.id}:planning`
                                              ? <Loader2 size={14} className="animate-spin" />
                                              : <Upload size={14} />
                                            }
                                            <input type="file" className="hidden" accept=".pdf" onChange={e => handleFileUpload(module.id, 'planning', e)} />
                                          </label>
                                        </div>
                                      </div>
                                    ) : (
                                      <label className={`cursor-pointer flex items-center justify-center gap-2 py-2 border border-dashed border-slate-300 hover:border-gb-primary hover:bg-blue-50 text-slate-500 hover:text-gb-primary rounded-lg text-[10px] font-bold transition-all ${uploadingKey === `${module.id}:planning` ? 'pointer-events-none opacity-50' : ''}`}>
                                        {uploadingKey === `${module.id}:planning`
                                          ? <><Loader2 size={12} className="animate-spin" /> Guardando PDF...</>
                                          : <><Layers size={12} /> Planeación</>
                                        }
                                        <input type="file" className="hidden" accept=".pdf" onChange={e => handleFileUpload(module.id, 'planning', e)} />
                                      </label>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
      <AnimatePresence>
        {editingModule && (
          <EditModuleModal
            module={editingModule}
            onClose={() => setEditingModule(null)}
            onSave={(updatedModule) => {
              setModules(prev => prev.map(m => m.id === updatedModule.id ? updatedModule : m));
              setEditingModule(null);
              onModuleUpdate?.();
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedPlanningModule && (
          <PlanningModal
            module={selectedPlanningModule} 
            onClose={() => setSelectedPlanningModule(null)} 
            onUpdate={(updatedModule) => {
              setModules(prev => prev.map(m => m.id === updatedModule.id ? updatedModule : m));
              setSelectedPlanningModule(updatedModule);
              onModuleUpdate?.();
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isReportPreviewOpen && (
          <CurriculumReportModal onClose={() => setIsReportPreviewOpen(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {pendingPlanning && (
          <PlanningSetupModal
            module={pendingPlanning.module}
            detectedUnits={pendingPlanning.detectedUnits}
            learningOutcome={pendingPlanning.learningOutcome}
            onClose={() => setPendingPlanning(null)}
            onConfirm={(updatedModule) => {
              setModules(prev => prev.map(m => m.id === updatedModule.id ? updatedModule : m));
              setPendingPlanning(null);
              onModuleUpdate?.();
            }}
          />
        )}
      </AnimatePresence>
      
    </div>
  );
}

function EditModuleModal({ module, onClose, onSave }: { 
  module: Module; 
  onClose: () => void; 
  onSave: (m: Module) => void;
}) {
  const [form, setForm] = useState({
    title: module.title,
    code: module.code,
    credits: module.credits,
    instructor: module.instructor,
    description: module.description,
    level: module.level,
    status: module.status,
    semester: module.semester,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updated = await curriculumService.updateModule(module.id, form);
    setSaving(false);
    if (updated) onSave(updated);
    else window.alert('No se pudo guardar el módulo.');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gb-primary text-white p-5 flex items-center justify-between rounded-t-2xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Plan de Estudios</p>
            <h3 className="text-lg font-bold">Editar Módulo</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombre del Módulo</label>
              <input
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-gb-secondary focus:outline-none focus:border-gb-primary"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código</label>
              <input
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-gb-secondary focus:outline-none focus:border-gb-primary"
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Créditos</label>
              <input
                type="number"
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-gb-secondary focus:outline-none focus:border-gb-primary"
                value={form.credits}
                onChange={e => setForm(p => ({ ...p, credits: Number(e.target.value) }))}
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instructor</label>
              <input
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-gb-secondary focus:outline-none focus:border-gb-primary"
                value={form.instructor}
                onChange={e => setForm(p => ({ ...p, instructor: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nivel</label>
              <select
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-gb-secondary focus:outline-none focus:border-gb-primary"
                value={form.level}
                onChange={e => setForm(p => ({ ...p, level: e.target.value as Module['level'] }))}
              >
                <option value="Básico">Básico</option>
                <option value="Formativo">Formativo</option>
                <option value="Minerva">Minerva</option>
                <option value="Práctica/Servicio">Práctica/Servicio</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</label>
              <select
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-gb-secondary focus:outline-none focus:border-gb-primary"
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value as Module['status'] }))}
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_curso">En curso</option>
                <option value="completado">Completado</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción</label>
              <textarea
                rows={3}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-gb-secondary focus:outline-none focus:border-gb-primary resize-none"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gb-primary text-white font-bold rounded-lg text-sm shadow-lg shadow-gb-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PlanningSetupModal({ module, detectedUnits, learningOutcome, onClose, onConfirm }: {
  module: Module;
  detectedUnits: { unitNumber: string; title: string; content: string }[];
  learningOutcome: string;
  onClose: () => void;
  onConfirm: (updatedModule: Module) => void;
}) {
  const [sessions, setSessions] = useState<Record<string, number>>(
    Object.fromEntries(detectedUnits.map(u => [u.unitNumber, 18]))
  );
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const planning = {
        id: `planning-${module.id}`,
        learningOutcome: learningOutcome,
        competencies: { generic: [], specific: [] },
        units: detectedUnits.map((u, idx) => ({
          id: `unit-${module.id}-${u.unitNumber}`,
          unitNumber: u.unitNumber,
          title: u.title,
          content: u.content,
          activity: u.content || '',
          strategies: [],
          resources: [],
          evidence: '',
          instrument: '',
          weight: Math.floor(100 / detectedUnits.length),
          sessions: sessions[u.unitNumber] || 18,
          completedSessions: 0,
          sessionLog: [],
          status: 'pendiente' as const,
        }))
      };

      const updated = await curriculumService.updateModule(module.id, { planning });
      if (updated) onConfirm(updated);
      else window.alert('No se pudo guardar la planeación.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gb-primary text-white p-5 flex items-center justify-between rounded-t-2xl shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Programa Académico Detectado</p>
            <h3 className="text-lg font-bold">Definir Sesiones por Unidad</h3>
            <p className="text-xs text-white/70 mt-1">{module.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Se detectaron <span className="font-bold text-gb-primary">{detectedUnits.length} unidades</span> en el programa. Define el número de sesiones para cada una — esto habilitará el seguimiento de avance.
          </p>
          <div className="space-y-3">
            {detectedUnits.map(unit => (
              <div key={unit.unitNumber} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Unidad {unit.unitNumber}</p>
                  <p className="text-sm font-bold text-gb-secondary truncate">{unit.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Sesiones</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={sessions[unit.unitNumber]}
                    onChange={e => setSessions(prev => ({ ...prev, [unit.unitNumber]: Number(e.target.value) }))}
                    className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm font-bold text-center text-gb-secondary focus:outline-none focus:border-gb-primary"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
          >
            Omitir
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="px-6 py-2 bg-gb-primary text-white font-bold rounded-lg text-sm shadow-lg shadow-gb-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {saving ? 'Creando planeación...' : 'Crear Planeación'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── PlanningModal ────────────────────────────────────────────────────────────

function PlanningModal({
  module,
  onClose,
  onUpdate,
}: {
  module: Module;
  onClose: () => void;
  onUpdate: (m: Module) => void;
}) {
  const { showToast } = useToast();
  const { execute: executeSession } = useApiError();
  const [isPreviewing, setIsPreviewing] = useState(false);

  if (!module.planning) return null;
  const p = module.planning;

  // Extraído del JSX: registrar o deshacer sesión
  const handleUpdateSession = async (unitId: string, newCompleted: number, unitTitle: string) => {
    const updatedUnit = await executeSession(
      () => curriculumService.updateModulePlanningUnit(module.id, unitId, newCompleted),
      'No se pudo actualizar la sesión. Intenta de nuevo.'
    );

    if (updatedUnit) {
      const updatedModule = { ...module };
      if (updatedModule.planning) {
        updatedModule.planning = {
          ...updatedModule.planning,
          units: updatedModule.planning.units.map(u => u.id === unitId ? updatedUnit : u),
        };
      }
      onUpdate(updatedModule);
      showToast(
        newCompleted > (updatedUnit.completedSessions - 1)
          ? `Sesión registrada en "${unitTitle}".`
          : `Sesión deshecha en "${unitTitle}".`,
        'success'
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#2D4b7C] p-6 text-white shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <ClipboardList size={28} />
              </div>
              <div>
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.2em]">Planeación Didáctica Digital • PE 2016</p>
                <h3 className="text-2xl font-display font-bold">{module.title}</h3>
                <p className="text-sm text-blue-100/80 mt-1">ID Docente Titular: 100534457 • Responsable del Seguimiento</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0 space-y-0 bg-slate-50/50 custom-scrollbar">
          {isPreviewing ? (
            <div className="bg-slate-200 p-8 min-h-full">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => setIsPreviewing(false)}
                  className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase hover:text-gb-primary transition-colors"
                >
                  <ArrowLeft size={16} /> Volver a Gestión Digital
                </button>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded shadow-sm border border-slate-200">
                  Vista de Auditoría Oficial
                </span>
              </div>
              <div className="scale-[0.85] origin-top transform">
                <PDFPreview type="curriculo" />
              </div>
            </div>
          ) : (
            <div className="p-8 space-y-8">
              {/* Overview Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="geometric-card p-6 border-l-4 border-l-amber-500 bg-white shadow-sm">
                  <h4 className="flex items-center gap-2 text-gb-secondary font-bold mb-3">
                    <Target size={18} className="text-amber-500" /> Resultado de Aprendizaje
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-slate-100 pl-4">
                    "{p.learningOutcome}"
                  </p>
                </div>
              </div>

              {/* Units Table */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gb-secondary flex items-center gap-2 px-1">
                  <Layers size={20} className="text-gb-primary" /> Planeación por Unidad de Aprendizaje
                </h4>
                <div className="grid grid-cols-1 gap-6">
                  {p.units.map(unit => (
                    <div key={unit.id} className="geometric-card bg-white border border-slate-200 shadow-sm overflow-hidden group hover:border-gb-primary transition-all">
                      <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${unit.status === 'completado' ? 'bg-emerald-500 text-white' :
                            unit.status === 'en_progreso' ? 'bg-gb-primary text-white' :
                              'bg-slate-200 text-slate-500'
                            }`}>
                            {unit.unitNumber}
                          </div>
                          <div>
                            <h5 className="font-bold text-gb-secondary flex items-center gap-2">
                              {unit.title}
                              {unit.status === 'completado' && <CircleCheckBig size={14} className="text-emerald-500" />}
                              {unit.status === 'en_progreso' && <Clock size={14} className="text-gb-primary animate-pulse" />}
                            </h5>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                                Sesiones: {unit.completedSessions} de {unit.sessions}
                              </p>
                              <div className="w-24 h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${unit.status === 'completado' ? 'bg-emerald-500' : 'bg-gb-primary'}`}
                                  style={{ width: `${(unit.completedSessions / unit.sessions) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Estado de Avance</p>
                            <p className={`text-[10px] font-black uppercase leading-none ${unit.status === 'completado' ? 'text-emerald-600' :
                              unit.status === 'en_progreso' ? 'text-gb-primary' :
                                'text-slate-400'
                              }`}>
                              {unit.status.replace('_', ' ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Ponderación</p>
                            <p className="text-lg font-black text-gb-primary leading-none">{unit.weight}%</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <div>
                          <p className="text-[10px] font-bold text-gb-secondary uppercase mb-2">Contenido Temático</p>
                          {unit.activity ? (
                            <ul className="space-y-1">
                              {unit.activity.split(/(?=\d+\.\d+)/).filter(Boolean).map((item, i) => (
                                <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gb-primary mt-1.5 shrink-0" />
                                  {item.trim()}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Sin contenido temático registrado.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 px-8 shrink-0">
          <p className="text-xs font-medium text-slate-400 italic text-center md:text-left">
            Este documento digitalizado sirve como auditoría de congruencia para la Secretaría Académica.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsPreviewing(!isPreviewing)}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-[#2D4b7C] hover:bg-slate-50 border border-[#2D4b7C]/20 rounded-lg transition-all active:scale-95"
            >
              {isPreviewing ? <ArrowLeft size={16} /> : <Eye size={16} />}
              {isPreviewing ? 'Regresar a Gestión' : 'Previsualizar PDF'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#2D4b7C] text-white font-bold rounded-lg text-sm shadow-xl shadow-blue-900/10 hover:-translate-y-0.5 transition-all outline-none"
            >
              Cerrar Auditoría
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── CurriculumReportModal ────────────────────────────────────────────────────

function CurriculumReportModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gb-primary text-white p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Plan de Estudios</p>
            <h3 className="text-xl font-bold">Reporte de Retícula</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
            >
              <Printer size={14} />
              Imprimir
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-200 p-6">
          <div className="scale-[0.82] origin-top transform -mb-[18%]">
            <PDFPreview type="curriculo" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
