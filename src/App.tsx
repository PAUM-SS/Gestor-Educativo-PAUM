/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import Students from './components/Students';
import Curriculum from './components/Curriculum';
import Faculty from './components/Faculty';
import ClinicalFields from './components/ClinicalFields';
import CalendarView from './components/CalendarView';
import MinutesView from './components/MinutesView';
import SchedulingView from './components/SchedulingView';
import PAUMShield from './components/PAUMShield';
import { Send } from 'lucide-react';
import ReportModal from './components/ReportModal';
import { curriculumService, calcCurriculumProgress } from './services/curriculumService';
import { Module } from './types';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const [modules, setModules] = useState<Module[]>([]);

  const refreshModules = () => {
    curriculumService.getModules().then(setModules);
  };

  useEffect(() => {
    refreshModules();
  }, []);

  const progress = calcCurriculumProgress(modules);
  const basico = progress.byLevel.find(l => l.level === 'Básico')!;
  const formativo = progress.byLevel.find(l => l.level === 'Formativo')!;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Overview onViewChange={setCurrentView} />;
      case 'students': return <Students />;
      case 'curriculum': return <Curriculum onModuleUpdate={refreshModules} />;
      case 'faculty': return <Faculty />;
      case 'clinical-fields': return <ClinicalFields />;
      case 'scheduling': return <SchedulingView />;
      case 'calendar': return <CalendarView />;
      case 'minutes': return <MinutesView />;
      default: return <Overview onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gb-bg font-sans">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 ml-60 flex flex-col">
        {/* Geometric Balance Header */}
        <header className="h-20 bg-white border-b-2 border-gb-primary flex items-center justify-between px-6 md:px-10 sticky top-0 z-40 lg:hidden xl:flex">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white border border-gb-primary/15 shadow-sm p-1.5 shrink-0">
              <PAUMShield className="w-full h-full" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gb-accent leading-none">BUAP | Facultad de Medicina</p>
              <h1 className="text-lg font-bold uppercase tracking-wide text-gb-secondary leading-tight mt-1">Profesional Asociado en Urgencias Médicas</h1>
              <p className="text-xs text-slate-500 font-bold mt-1">Sistema Integral de Coordinación Académica PAUM</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="hidden lg:flex items-center gap-2 bg-gb-primary text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-gb-primary/90 transition-all active:scale-95 shadow-lg shadow-gb-primary/20"
            >
              <Send size={14} />
              Reporte a Secretaría Académica
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gb-text">Dr. Ariel Farit Gutierrez Alexander</p>
              <p className="text-[11px] text-slate-400 font-medium">ID: 100534457</p>
            </div>
            <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0" />
          </div>
        </header>

        {/* Alternate Header for responsive sizes */}
        <header className="h-auto bg-white border-b-2 border-gb-primary flex flex-col items-center justify-between px-6 py-4 sticky top-0 z-40 xl:hidden">
          <div className="flex w-full items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white border border-gb-primary/15 shadow-sm p-1.5 shrink-0">
                <PAUMShield className="w-full h-full" />
              </div>
              <div>
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-gb-accent leading-none">BUAP | Facultad de Medicina</p>
                <h1 className="text-sm md:text-base font-bold uppercase tracking-wide text-gb-secondary leading-tight mt-1">Profesional Asociado en Urgencias Médicas</h1>
                <p className="text-[10px] md:text-xs text-slate-500 font-bold mt-1">Sistema Integral de Coordinación Académica PAUM</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs md:text-sm font-bold text-gb-text">Dr. Ariel Farit Gutierrez</p>
              </div>
              <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0" />
            </div>
          </div>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-gb-primary text-white px-4 py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-gb-primary/90 transition-all active:scale-95 shadow-lg shadow-gb-primary/20"
          >
            <Send size={14} />
            Reporte a Secretaría Académica
          </button>
        </header>

        <div className="flex flex-1">
          {/* Main Content Pane */}
          <main className="flex-1 p-8 border-r border-gb-border">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Sidebar Right */}
          <aside className="w-72 bg-white p-8 hidden xl:block">
            <div className="mb-8 p-4 bg-[#E8F4FD] rounded-lg border border-gb-primary/20">
              <span className="section-label text-gb-primary">Acciones Rápidas</span>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-gb-primary text-white px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-gb-primary/90 transition-all active:scale-95 shadow-lg shadow-gb-primary/20"
              >
                <Send size={14} />
                Reporte a Secretaría Académica
              </button>
            </div>

            <span className="section-label text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 block underline decoration-gb-primary decoration-2 underline-offset-4" title="Porcentaje ponderado de avance en el programa académico (Temarios + Créditos)">Cumplimiento Programático y de Egresación</span>
            <div className="flex flex-col items-center p-5 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
              <div className="relative w-36 h-36 mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                  <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={376.8} strokeDashoffset={376.8 * (1 - progress.totalPct / 100)} className="text-gb-accent transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-gb-secondary" title="Suma total de créditos aprobados por la generación actual">{progress.totalPct}%</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{progress.completedCredits} / {progress.totalCredits} Crts.</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 text-center mb-4 leading-tight">Representa el avance global en la obtención de créditos acumulados y validación de temarios del programa PAUM.</p>
              <div className="w-full space-y-2">

                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-500 uppercase">Nivel Básico</span>
                  <span className="text-gb-primary">{basico.pct}% ({basico.completed}/{basico.total})</span>
                </div>
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full bg-gb-primary`} style={{ width: `${basico.pct}%` }} />
                </div>

                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-500 uppercase">Nivel Formativo</span>
                  <span className="text-gb-accent">{formativo.pct}% ({formativo.completed}/{formativo.total})</span>
                </div>
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full bg-gb-accent`} style={{ width: `${formativo.pct}%` }} />
                </div>

                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-500 uppercase">Nivel Minerva</span>
                  <span className="text-gb-primary">
                    {progress.byLevel.find(l => l.level === 'Minerva')!.pct}% ({progress.byLevel.find(l => l.level === 'Minerva')!.completed}/{progress.byLevel.find(l => l.level === 'Minerva')!.total})
                  </span>
                </div>
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gb-primary" style={{ width: `${progress.byLevel.find(l => l.level === 'Minerva')!.pct}%` }} />
                </div>

                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-500 uppercase">Práctica / Servicio</span>
                  <span className="text-gb-accent">
                    {progress.byLevel.find(l => l.level === 'Práctica/Servicio')!.pct}% ({progress.byLevel.find(l => l.level === 'Práctica/Servicio')!.completed}/{progress.byLevel.find(l => l.level === 'Práctica/Servicio')!.total})
                  </span>
                </div>
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gb-accent" style={{ width: `${progress.byLevel.find(l => l.level === 'Práctica/Servicio')!.pct}%` }} />
                </div>

              </div>
            </div>

            <div className="mt-8">
              <span className="section-label text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 block underline decoration-gb-accent decoration-2 underline-offset-4">Próximos Hitos PAUM</span>
              <div className="space-y-4">
                {[
                  { date: '21 OCT, 2026', desc: 'Evaluación Nacional de Competencias Prehospitalarias' },
                  { date: '04 NOV, 2026', desc: 'Validación de Expedientes de Servicio Social' },
                  { date: '18 NOV, 2026', desc: 'Supervisión de Práctica Profesional en Sedes' },
                ].map((item, idx) => (
                  <div key={idx} className="border-l-2 border-gb-accent pl-4 py-1 hover:bg-slate-50 transition-colors cursor-default group">
                    <p className="text-[11px] font-black text-gb-accent group-hover:tracking-wider transition-all">{item.date}</p>
                    <p className="text-sm font-bold text-gb-secondary mt-1 leading-tight">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}
