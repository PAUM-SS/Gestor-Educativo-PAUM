/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Upload, 
  CircleAlert, 
  CircleCheckBig, 
  Clock,
  ArrowRight,
  Bell,
  RefreshCw,
  Mail
} from 'lucide-react';
import { minutesService } from '../services/minutesService';
import { aiService } from '../services/aiService';
import { AcademicMinute } from '../types';

export default function MinutesView() {
  const [minutes, setMinutes] = useState<AcademicMinute[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    minutesService.getMinutes().then(setMinutes);
  }, []);

  const toggleTask = async (minuteId: string, taskId: string) => {
    const minute = minutes.find(m => m.id === minuteId);
    const task = minute?.tasks.find( t => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === 'realizada' ? 'pendiente' : 'realizada';
    const success = await minutesService.updateTask(minuteId, taskId, newStatus);
    
    if (success) {
      setMinutes(prev => prev.map(m => {
        if (m.id === minuteId) {
          return {
            ...m,
            tasks: m.tasks.map(t => 
              t.id === taskId 
                ? { ...t, status: newStatus } 
                : t
            )
          };
        }
        return m;
      }));
    }
  };

  const handleUpload = async () => {
    setIsProcessing(true);
    // Integrate AI Service to process the "upload"
    await aiService.generateResponse("Process uploaded minute file", { action: 'extract_tasks' });
    setIsProcessing(false);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-display font-bold text-gb-text tracking-tight">Minutas y Tareas Académicas</h2>
          <p className="text-slate-500 mt-1">Gestión de acuerdos institucionales y seguimiento de pendientes.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Upload and Recent Minutes */}
        <div className="lg:col-span-2 space-y-6">
          <div 
            onClick={handleUpload}
            className="geometric-card p-8 border-dashed border-2 border-gb-primary/20 bg-gb-primary/5 flex flex-col items-center justify-center text-center group hover:border-gb-primary transition-all cursor-pointer"
          >
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-gb-primary mb-4 group-hover:scale-110 transition-transform">
              {isProcessing ? <RefreshCw size={32} className="animate-spin" /> : <Upload size={32} />}
            </div>
            <h3 className="font-bold text-gb-secondary text-lg">Cargar Nueva Minuta</h3>
            <p className="text-slate-500 text-sm max-w-xs mt-2">Arrastre el archivo PDF de la minuta aquí para extraer automáticamente acuerdos y tareas.</p>
            <div className="mt-6 flex gap-2">
              <span className="px-3 py-1 bg-white rounded-full text-[10px] font-bold text-gb-primary uppercase tracking-widest border border-gb-primary/10">
                {isProcessing ? 'Procesando...' : 'Procesamiento IA'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gb-secondary flex items-center gap-2">
              <FileText size={18} className="text-gb-primary" />
              Minutas Recientes
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {minutes.map((minute) => (
                <div key={minute.id} className="geometric-card p-5 group hover:border-gb-primary transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{minute.date}</p>
                      <h4 className="font-bold text-gb-secondary">{minute.subject}</h4>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase">Documento ID: {minute.id}</span>
                  </div>
                  <div className="flex gap-4 mt-6 pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gb-primary">
                      <Clock size={14} /> {minute.tasks.filter(t => t.status === 'pendiente').length} Pendientes
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gb-accent">
                      <CircleCheckBig size={14} /> {minute.tasks.filter(t => t.status === 'realizada').length} Realizadas
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Active Alerts / Tasks */}
        <div className="space-y-4">
          <h3 className="font-bold text-gb-secondary flex items-center gap-2 px-1">
            <Bell size={18} className="text-red-500 pulse" />
            Alertas de Tareas
          </h3>
          <div className="space-y-3">
            {minutes.flatMap(m => m.tasks.map(t => ({...t, minuteId: m.id}))).map((task) => (
              <div key={task.id} className={`geometric-card p-4 border-l-4 ${
                task.status === 'vencida' ? 'border-l-red-500 bg-red-50/30' : 
                task.status === 'realizada' ? 'border-l-gb-accent opacity-60' : 'border-l-amber-400'
              }`}>
                <div className="flex justify-between items-start gap-3">
                  <p className={`text-xs font-bold flex-1 leading-snug ${task.status === 'realizada' ? 'text-slate-400 line-through' : 'text-gb-secondary'}`}>
                    {task.description}
                  </p>
                  <div className="flex flex-col items-end gap-1">
                    {task.status === 'vencida' && <CircleAlert size={16} className="text-red-500 shrink-0" />}
                    {task.reminderSent && <Mail size={14} className="text-blue-500 shrink-0" title="Recordatorio enviado" />}
                  </div>
                </div>
                
                {/* Time Tracking Details */}
                {(task.estimatedHours || task.actualHours) && (
                  <div className="mt-2 flex gap-3 text-[9px] font-bold uppercase tracking-tighter border-t border-slate-100/50 pt-2">
                    <span className="text-slate-400">Est: {task.estimatedHours}h</span>
                    {task.actualHours && (
                      <span className={`${task.actualHours > (task.estimatedHours || 0) ? 'text-amber-600' : 'text-emerald-600'}`}>
                        Real: {task.actualHours}h
                      </span>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-end mt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Vencimiento: {task.dueDate}</span>
                  <button 
                    onClick={() => toggleTask(task.minuteId, task.id)}
                    className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all ${
                      task.status === 'realizada' ? 'text-gb-accent' : 'text-gb-primary hover:gap-2'
                    }`}
                  >
                    {task.status === 'realizada' ? 'Reactivar' : 'Marcar Lista'} <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

