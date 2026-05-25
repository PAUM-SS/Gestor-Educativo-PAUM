/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  Stethoscope, 
  TrendingUp, 
  ArrowUpRight,
  Clock,
  CircleCheckBig,
  CircleAlert,
  CalendarDays,
  FileText,
  Mail,
  ArrowRight
} from 'lucide-react';
import { minutesService } from '../services/minutesService';
import { AcademicMinute } from '../types';
import PAUMShield from './PAUMShield';

interface OverviewProps {
  onViewChange: (view: string) => void;
}

export default function Overview({ onViewChange }: OverviewProps) {
  const [minutes, setMinutes] = useState<AcademicMinute[]>([]);

  useEffect(() => {
    minutesService.getMinutes().then(setMinutes);
  }, []);

  const stats = [
    { label: 'Matrícula PAUM', value: '245' },
    { label: 'Coadyuvancia Técnica', value: '33 Secciones' },
    { label: 'Práctica Profesional', value: 'Cruz Roja / SUMA' },
    { label: 'Trámites Pendientes', value: minutes.reduce((acc, min) => acc + min.tasks.filter(t => t.status !== 'realizada').length, 0).toString() },
  ];

  const deliverables = minutes.flatMap(minute => 
    minute.tasks.map(task => ({
      title: task.description,
      date: task.dueDate,
      status: task.status === 'realizada'
        ? 'realizada'
        : task.status === 'vencida'
          ? 'vencida'
          : (new Date(task.dueDate) < new Date('2026-04-21') ? 'urgente' : 'pendiente'),
      to: minute.subject.toLowerCase().includes('acreditación') ? 'Sec. Académica' : 'Dirección',
      minuteId: minute.id,
      taskId: task.id,
      estimated: task.estimatedHours,
      actual: task.actualHours,
      reminder: task.reminderSent
    }))
  ).filter(t => t.status !== 'realizada').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-8">
      <div className="geometric-card overflow-hidden border-gb-primary/10 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eef5ff_100%)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-white border border-gb-primary/10 shadow-sm p-2 shrink-0">
              <PAUMShield className="w-full h-full" />
            </div>
            <div className="max-w-2xl">
              <span className="inline-flex items-center rounded-full bg-gb-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-gb-primary border border-gb-primary/10">
                Inicio PAUM
              </span>
              <h2 className="mt-4 text-3xl md:text-4xl font-display font-black tracking-tight text-gb-secondary">
                Profesional Asociado en Urgencias Médicas
              </h2>
              <p className="mt-3 text-sm md:text-base text-slate-600 leading-relaxed">
                Panel general de seguimiento para la coordinación académica del programa en la Facultad de Medicina BUAP.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Benemérita Universidad Autónoma de Puebla', 'Facultad de Medicina', 'Primavera 2026'].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[220px]">
            <div className="rounded-2xl bg-white/90 border border-slate-200 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estado General</p>
              <p className="mt-2 text-lg font-black text-gb-primary">Operación estable</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Módulos, minutas y reportes activos.</p>
            </div>
            <div className="rounded-2xl bg-gb-secondary text-white border border-gb-secondary/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Vista Inicial</p>
              <p className="mt-2 text-lg font-black">Tablero General</p>
              <p className="mt-1 text-xs font-medium text-white/70">Resumen institucional del PAUM.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            key={stat.label}
            className="geometric-card p-6 flex flex-col items-center justify-center text-center h-[140px]"
          >
            <h3 className="text-3xl font-extrabold text-gb-primary">{stat.value}</h3>
            <p className="text-[12px] uppercase tracking-wider text-gb-secondary font-semibold opacity-70 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Semester Progress and Deliverables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Semester Progress */}
        <div className="geometric-card p-8 flex flex-col justify-center">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <BookOpen size={18} className="text-gb-primary" />
            Cumplimiento Programático y de Egresación
          </h3>
          
          <div className="space-y-6">
            <p className="text-[11px] text-slate-500 leading-tight mb-4">Métrica que pondera la entrega de contenidos temáticos (avance didáctico) frente al cumplimiento de créditos reglamentarios por nivel.</p>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-gb-secondary uppercase tracking-wider">Nivel Básico</span>
                <span className="text-xs font-black text-gb-primary">68 / 71</span>
              </div>
              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <motion.div initial={{ width: 0 }} animate={{ width: '95%' }} className="absolute h-full bg-gb-primary" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-gb-secondary uppercase tracking-wider">Nivel Formativo</span>
                <span className="text-xs font-black text-gb-accent">53 / 94</span>
              </div>
              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <motion.div initial={{ width: 0 }} animate={{ width: '56%' }} className="absolute h-full bg-gb-accent" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase leading-none mb-1">Carga Crítica Semanal</p>
                <p className="text-sm font-bold text-gb-secondary">Validación de PP / SS en curso</p>
              </div>
              <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                73% Total
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Deliverables (Tasks from Minutes) */}
        <div className="geometric-card p-6 min-h-[300px]">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <FileText size={18} className="text-gb-accent" />
            Próximas Entregas de Información (Minutas)
          </h3>
          
          <div className="space-y-3">
            {deliverables.map((item, idx) => (
              <div key={idx} className={`flex flex-col p-4 border rounded-lg hover:border-gb-primary/30 transition-colors ${
                item.status === 'vencida' ? 'bg-red-50 border-red-100' : 'border-slate-100 bg-white'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gb-secondary text-sm leading-tight max-w-[70%]">{item.title}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                    item.status === 'urgente' || item.status === 'vencida' ? 'bg-red-500 text-white' : 
                    item.status === 'pendiente' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.date}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Destinatario: <span className="font-semibold">{item.to}</span></span>
                  <div className="flex gap-3 items-center">
                    {item.reminder && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-blue-500 uppercase bg-blue-50 px-1.5 py-0.5 rounded">
                        <Mail size={10}/> Recordatorio 48h (OK)
                      </span>
                    )}
                    {item.status === 'urgente' && <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase"><Clock size={12}/> Vencerá Pronto</span>}
                    {item.status === 'vencida' && <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase"><CircleAlert size={12}/> Vencida</span>}
                    <button 
                      onClick={() => onViewChange('minutes')}
                      className="flex items-center gap-1 text-[10px] font-bold text-gb-primary uppercase bg-gb-primary/5 px-2 py-1 rounded hover:bg-gb-primary/10 transition-colors"
                    >
                      Ver Tarea <ArrowRight size={10}/>
                    </button>
                  </div>
                </div>

                {/* Time Metrics */}
                {(item.estimated || item.actual) && (
                  <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex gap-4">
                      <div className="text-[10px]">
                        <p className="text-slate-400 uppercase font-bold tracking-tighter">Estimado</p>
                        <p className="font-bold text-gb-secondary">{item.estimated}h</p>
                      </div>
                      {item.actual && (
                        <div className="text-[10px]">
                          <p className="text-slate-400 uppercase font-bold tracking-tighter">Invertido</p>
                          <p className={`font-bold ${item.actual > (item.estimated || 0) ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {item.actual}h
                          </p>
                        </div>
                      )}
                    </div>
                    {item.actual && item.estimated && (
                      <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        item.actual <= item.estimated ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        Eficiencia: {Math.round((item.estimated / item.actual) * 100)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

