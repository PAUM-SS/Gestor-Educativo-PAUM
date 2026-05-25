/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Circle, 
  XOctagon, 
  Sun, 
  Star,
  Info
} from 'lucide-react';
import { MOCK_ACADEMIC_CALENDAR } from '../constants';

export default function CalendarView() {
  const categories = [
    { label: 'Inicio de Curso', dot: 'bg-blue-500', type: 'clase' },
    { label: 'Fin de Curso/Examen', dot: 'bg-red-500', type: 'fin' },
    { label: 'Suspensión de Labores', dot: 'bg-red-700', type: 'susp' },
    { label: 'Periodo Vacacional', dot: 'bg-slate-300', type: 'vac' },
    { label: 'Inscripción', dot: 'bg-sky-400', type: 'ins' },
    { label: 'Día BUAP', dot: 'bg-indigo-600', type: 'buap' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-display font-bold text-gb-text tracking-tight">Calendario Institucional BUAP</h2>
          <p className="text-slate-500 mt-1">Hitos académicos y administrativos para el Profesional Semestral 2026.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-gb-border px-4 py-2 rounded font-bold text-xs text-gb-secondary hover:bg-slate-50 transition-all flex items-center gap-2">
            <Info size={14} /> Guía de Trámites
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Events Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="geometric-card p-6">
            <h3 className="font-bold text-gb-secondary mb-6 flex items-center gap-2">
              <CalendarIcon size={18} className="text-gb-primary" />
              Próximos Eventos 2026
            </h3>
            
            <div className="space-y-0">
              {MOCK_ACADEMIC_CALENDAR.map((event, i) => {
                const category = categories.find(c => c.type === event.type);
                return (
                  <div key={i} className="flex gap-6 pb-6 group items-start last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${category?.dot || 'bg-slate-200'} ring-4 ring-white z-10`} />
                      <div className="w-0.5 h-full bg-slate-100 -mt-0.5 group-last:hidden" />
                    </div>
                    <div className="flex-1 -mt-1 pb-4 border-b border-slate-50 last:border-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{event.date}</p>
                      <h4 className="font-bold text-gb-text group-hover:text-gb-primary transition-colors">{event.title}</h4>
                    </div>
                    <div className="text-right">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter ${
                        event.type === 'susp' ? 'bg-red-50 text-red-600' :
                        event.type === 'clase' ? 'bg-blue-50 text-blue-600' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                        {category?.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Legend and Quick Links */}
        <div className="space-y-6">
          <div className="geometric-card p-6 bg-slate-50 border-none">
            <h3 className="font-bold text-gb-secondary text-sm mb-4 uppercase tracking-widest">Simbología Oficial</h3>
            <div className="grid grid-cols-1 gap-3">
              {categories.map(cat => (
                <div key={cat.label} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${cat.dot}`} />
                  <span className="text-xs font-medium text-gb-text/80">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-gb-primary rounded-lg text-white">
            <Sun className="mb-4 text-white/50" />
            <h4 className="font-bold text-lg leading-tight mb-2">Ciclo Primavera 2026</h4>
            <p className="text-white/70 text-xs leading-relaxed">
              Recuerde que el registro de calificaciones finales en el SIIA debe realizarse dentro de los 3 días hábiles posteriores al examen final.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

