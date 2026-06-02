import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Upload,
  Info,
  Sun,
  FileText,
  Loader2,
  X,
  Clock,
  CalendarDays,
} from 'lucide-react';
import { AcademicEvent } from '../types';
import { calendarService } from '../services/calendarService';
import { useApiError } from '../hooks/useApiError';
import { useToast } from '../context/ToastContext';

// ─── Constantes ───────────────────────────────────────────────────────────────

const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Colores y etiquetas por tipo de evento
const EVENT_META: Record<AcademicEvent['type'], { dot: string; bg: string; text: string; border: string; label: string }> = {
  clase: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Inicio de Curso' },
  ins: { dot: 'bg-sky-400', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', label: 'Inscripción' },
  fin: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Fin de Curso / Examen' },
  susp: { dot: 'bg-red-700', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', label: 'Suspensión de Labores' },
  vac: { dot: 'bg-slate-300', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', label: 'Periodo Vacacional' },
  gest: { dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Gestión Académica' },
  buap: { dot: 'bg-indigo-600', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'Día BUAP' },
  minuta: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Tarea de Minuta' },
};

type ViewMode = 'semana' | 'mes' | 'semestre';

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Lunes de la semana que contiene `date`
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Primer día del mes
function getMonthStart(year: number, month: number): Date {
  return new Date(year, month, 1);
}

// Días del mes en una grid de semanas (llenando con días del mes anterior/siguiente)
function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=Dom
  const gridStart = new Date(firstDay);
  // Retroceder al lunes anterior
  gridStart.setDate(firstDay.getDate() - (startDow === 0 ? 6 : startDow - 1));

  const days: Date[] = [];
  const current = new Date(gridStart);
  while (current <= lastDay || days.length % 7 !== 0) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
    if (days.length > 42) break; // máximo 6 semanas
  }
  return days;
}

// Meses del semestre activo según fecha actual
function getActiveSemesterMonths(today: Date): number[] {
  const m = today.getMonth(); // 0-indexed
  return m <= 5
    ? [0, 1, 2, 3, 4, 5]   // Primavera: Ene–Jun
    : [7, 8, 9, 10, 11];    // Otoño: Ago–Dic (julio = receso)
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

// Chip de evento pequeño para celdas del calendario
function EventChip({ event, onClick }: { event: AcademicEvent; onClick: () => void }) {
  const meta = EVENT_META[event.type];
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left px-1.5 py-0.5 rounded text-[9px] font-bold truncate ${meta.bg} ${meta.text} border ${meta.border} hover:opacity-80 transition-opacity`}
      title={event.title}
    >
      {event.title}
    </button>
  );
}

// Popup de detalle de evento
function EventPopup({ event, onClose }: { event: AcademicEvent; onClose: () => void }) {
  const meta = EVENT_META[event.type];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border-l-4 ${meta.border.replace('border', 'border-l')}`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-bold mb-3 ${meta.bg} ${meta.text}`}>
          <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
          {meta.label}
        </div>
        <h3 className="font-bold text-gb-secondary text-lg leading-snug mb-2">{event.title}</h3>
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <CalendarDays size={14} />
          {new Date(event.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        {event.description && (
          <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">{event.description}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Vista Semana ─────────────────────────────────────────────────────────────

function WeekView({ monday, events, today, onEventClick }: {
  monday: Date;
  events: AcademicEvent[];
  today: string;
  onEventClick: (e: AcademicEvent) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-7 gap-2">
      {DAYS_SHORT.map((d, i) => {
        const date = days[i];
        const ymd = toYMD(date);
        const isToday = ymd === today;
        const dayEvts = events.filter(e => e.date === ymd);

        return (
          <div key={d} className={`rounded-xl border min-h-[120px] p-2 flex flex-col gap-1 transition-all ${isToday ? 'border-gb-primary bg-gb-primary/5 shadow-md shadow-gb-primary/10' : 'border-slate-100 bg-white'}`}>
            <div className={`text-center mb-1 ${isToday ? 'text-gb-primary' : 'text-slate-400'}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest">{d}</p>
              <p className={`text-lg font-black leading-none ${isToday ? 'text-gb-primary' : 'text-gb-secondary'}`}>
                {date.getDate()}
              </p>
            </div>
            {dayEvts.map(evt => (
              <EventChip key={evt.id} event={evt} onClick={() => onEventClick(evt)} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Vista Mes ────────────────────────────────────────────────────────────────

function MonthView({ year, month, events, today, onEventClick }: {
  year: number;
  month: number;
  events: AcademicEvent[];
  today: string;
  onEventClick: (e: AcademicEvent) => void;
}) {
  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  return (
    <div>
      {/* Cabecera días */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] font-bold uppercase text-slate-400 tracking-widest py-2">{d}</div>
        ))}
      </div>
      {/* Grid días */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map((date, i) => {
          const ymd = toYMD(date);
          const isToday = ymd === today;
          const inMonth = date.getMonth() === month;
          const dayEvts = events.filter(e => e.date === ymd);
          const MAX_CHIPS = 2;

          return (
            <div
              key={i}
              className={`min-h-[80px] rounded-xl p-1.5 flex flex-col gap-1 border transition-all ${isToday ? 'border-gb-primary bg-gb-primary/5 shadow-sm' :
                !inMonth ? 'border-transparent bg-slate-50/50 opacity-40' :
                  'border-slate-100 bg-white hover:border-slate-200'
                }`}
            >
              <span className={`text-xs font-bold self-end px-1 ${isToday ? 'text-white bg-gb-primary rounded-full w-5 h-5 flex items-center justify-center text-[10px]' : inMonth ? 'text-slate-600' : 'text-slate-300'}`}>
                {date.getDate()}
              </span>
              {dayEvts.slice(0, MAX_CHIPS).map(evt => (
                <EventChip key={evt.id} event={evt} onClick={() => onEventClick(evt)} />
              ))}
              {dayEvts.length > MAX_CHIPS && (
                <span className="text-[9px] text-slate-400 font-bold pl-1">+{dayEvts.length - MAX_CHIPS} más</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vista Semestre ───────────────────────────────────────────────────────────

function SemesterView({ year, months, events, today, onEventClick }: {
  year: number;
  months: number[];
  events: AcademicEvent[];
  today: string;
  onEventClick: (e: AcademicEvent) => void;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
      {months.map(month => {
        const grid = getMonthGrid(year, month);
        const isActive = new Date().getMonth() === month;

        return (
          <div key={month} className={`rounded-2xl border p-4 ${isActive ? 'border-gb-primary/30 shadow-md shadow-gb-primary/10' : 'border-slate-100'} bg-white`}>
            <h4 className={`font-bold text-sm mb-3 ${isActive ? 'text-gb-primary' : 'text-gb-secondary'}`}>
              {MONTHS[month]}
            </h4>
            {/* Mini cabecera */}
            <div className="grid grid-cols-7 mb-1">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                <div key={d} className="text-center text-[8px] font-bold text-slate-300">{d}</div>
              ))}
            </div>
            {/* Mini grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {grid.map((date, i) => {
                const ymd = toYMD(date);
                const isToday = ymd === today;
                const inMonth = date.getMonth() === month;
                const dayEvts = events.filter(e => e.date === ymd);
                const hasEvt = dayEvts.length > 0;

                return (
                  <button
                    key={i}
                    onClick={() => hasEvt && onEventClick(dayEvts[0])}
                    title={hasEvt ? dayEvts.map(e => e.title).join(' · ') : undefined}
                    className={`h-6 w-full rounded flex items-center justify-center text-[9px] font-bold transition-all relative ${!inMonth ? 'opacity-0 pointer-events-none' :
                      isToday ? 'bg-gb-primary text-white ring-2 ring-gb-primary/30' :
                        hasEvt ? `${EVENT_META[dayEvts[0].type].bg} ${EVENT_META[dayEvts[0].type].text} cursor-pointer hover:opacity-80` :
                          'text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    {date.getDate()}
                    {hasEvt && dayEvts.length > 1 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full border border-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CalendarView() {
  const { showToast } = useToast();
  const { loading: isLoadingEvents, execute: executeLoad } = useApiError(true);
  const { loading: isUploading, execute: executeUpload } = useApiError();

  const today = toYMD(new Date());
  const nowDate = new Date();

  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('mes');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<AcademicEvent | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  // ─── Carga inicial ────────────────────────────────────────────────────────
  const load = async () => {
    const data = await executeLoad(
      () => calendarService.getEvents(),
      'No se pudieron cargar los eventos del calendario.'
    );
    if (data) setEvents(data);
  };
  useEffect(() => {
    void load();
  }, []);

  // ─── Upload del calendario BUAP (PDF o JSON) ──────────────────────────────

  const handleUploadCalendar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const isJson = file.name.toLowerCase().endsWith('.json');

    if (!isPdf && !isJson) {
      showToast('Solo se aceptan archivos PDF o JSON para el calendario.', 'error');
      return;
    }

    const result = await executeUpload(
      () => calendarService.uploadCalendar(file),
      'No se pudo procesar el archivo del calendario. Intenta de nuevo.'
    );

    if (result) {
      // Recargar eventos desde el servidor para reflejar el reemplazo
      const fresh = await calendarService.getEvents().catch(() => null);
      if (fresh) setEvents(fresh);
      showToast(`Calendario cargado: ${result.created} eventos importados.`, 'success');
    }
  };

  // ─── Navegación por fecha ─────────────────────────────────────────────────

  const navigate = (dir: 1 | -1) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'semana') {
        d.setDate(d.getDate() + dir * 7);
      } else if (viewMode === 'mes') {
        d.setMonth(d.getMonth() + dir);
      } else {
        // Semestre: avanzar/retroceder 6 meses
        d.setMonth(d.getMonth() + dir * 6);
      }
      return d;
    });
  };

  const goToToday = () => setCurrentDate(new Date());

  // ─── Datos derivados ──────────────────────────────────────────────────────

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monday = getMondayOf(currentDate);

  const semesterMonths = useMemo(
    () => getActiveSemesterMonths(currentDate),
    [currentDate]
  );

  // Etiqueta del rango visible
  const rangeLabel = useMemo(() => {
    if (viewMode === 'semana') {
      const sun = new Date(monday);
      sun.setDate(monday.getDate() + 6);
      return `${monday.getDate()} ${MONTHS[monday.getMonth()]} – ${sun.getDate()} ${MONTHS[sun.getMonth()]} ${sun.getFullYear()}`;
    }
    if (viewMode === 'mes') {
      return `${MONTHS[currentMonth]} ${currentYear}`;
    }
    const semLabel = semesterMonths[0] <= 5 ? 'Primavera' : 'Otoño';
    return `Semestre ${semLabel} ${currentYear}`;
  }, [viewMode, currentDate, monday, semesterMonths]);

  // Próximos eventos ordenados (panel derecho)
  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 15);
  }, [events, today]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-gb-text tracking-tight">Calendario Institucional BUAP</h2>
          <p className="text-slate-500 mt-1">Hitos académicos y administrativos · Profesional Semestral {currentYear}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={uploadRef}
            type="file"
            accept=".pdf,.json,application/pdf,application/json"
            className="hidden"
            onChange={handleUploadCalendar}
          />
          <button
            onClick={() => uploadRef.current?.click()}
            disabled={isUploading}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${isUploading
              ? 'bg-slate-100 text-slate-400 border-slate-200'
              : 'bg-white text-gb-primary border-gb-primary/20 hover:bg-gb-primary/5'
              }`}
          >
            {isUploading
              ? <><Loader2 size={16} className="animate-spin" />Procesando...</>
              : <><Upload size={16} />Cargar Calendario BUAP</>
            }
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Panel izquierdo: Calendario ───────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Controles de navegación y vista */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Navegación */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <h3 className="font-bold text-gb-secondary text-base min-w-[200px] text-center">{rangeLabel}</h3>
              <button
                onClick={() => navigate(1)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-xs font-bold text-gb-primary border border-gb-primary/20 rounded-lg hover:bg-gb-primary/5 transition-colors"
              >
                Hoy
              </button>
            </div>

            {/* Selector de vista */}
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {(['semana', 'mes', 'semestre'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${viewMode === v
                    ? 'bg-white text-gb-primary shadow-sm'
                    : 'text-slate-500 hover:text-gb-secondary'
                    }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido del calendario */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 min-h-[400px]">
            {isLoadingEvents ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 size={32} className="animate-spin mx-auto mb-3 text-gb-primary" />
                  <p className="text-sm text-slate-400 font-medium">Cargando calendario...</p>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${viewMode}-${rangeLabel}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {viewMode === 'semana' && (
                    <WeekView
                      monday={monday}
                      events={events}
                      today={today}
                      onEventClick={setSelectedEvent}
                    />
                  )}
                  {viewMode === 'mes' && (
                    <MonthView
                      year={currentYear}
                      month={currentMonth}
                      events={events}
                      today={today}
                      onEventClick={setSelectedEvent}
                    />
                  )}
                  {viewMode === 'semestre' && (
                    <SemesterView
                      year={currentYear}
                      months={semesterMonths}
                      events={events}
                      today={today}
                      onEventClick={setSelectedEvent}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ── Panel derecho: Simbología + Próximos eventos ──────────────────── */}
        <div className="space-y-6">

          {/* Simbología oficial */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="font-bold text-gb-secondary text-sm mb-4 uppercase tracking-widest">Simbología</h3>
            <div className="space-y-2.5">
              {Object.entries(EVENT_META).map(([type, meta]) => (
                <div key={type} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} />
                  <span className="text-xs font-medium text-slate-600">{meta.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card informativa del semestre */}
          <div className="p-5 bg-gb-primary rounded-2xl text-white">
            <Sun className="mb-3 text-white/50" size={24} />
            <h4 className="font-bold text-base leading-tight mb-2">
              {semesterMonths[0] <= 5 ? 'Ciclo Primavera' : 'Ciclo Otoño'} {currentYear}
            </h4>
            <p className="text-white/70 text-xs leading-relaxed">
              Recuerde que el registro de calificaciones finales en el SIIA debe realizarse dentro de los 3 días hábiles posteriores al examen final.
            </p>
          </div>

          {/* Próximos eventos */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="font-bold text-gb-secondary flex items-center gap-2 mb-4 text-sm">
              <Clock size={16} className="text-gb-primary" />
              Próximos Eventos
            </h3>
            {isLoadingEvents ? (
              <div className="py-4 text-center">
                <Loader2 size={20} className="animate-spin mx-auto text-slate-300" />
              </div>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No hay eventos próximos.</p>
            ) : (
              <div className="space-y-0">
                {upcomingEvents.map((event, i) => {
                  const meta = EVENT_META[event.type];
                  const isFirst = i === 0;
                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="w-full flex gap-4 pb-4 group items-start last:pb-0 text-left"
                    >
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${meta.dot} ring-4 ring-white z-10 mt-0.5`} />
                        <div className="w-0.5 h-full bg-slate-100 -mt-0.5 group-last:hidden" />
                      </div>
                      <div className="flex-1 min-w-0 pb-4 border-b border-slate-50 last:border-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {new Date(event.date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </p>
                        <p className={`text-xs font-bold truncate group-hover:text-gb-primary transition-colors ${isFirst ? 'text-gb-primary' : 'text-gb-secondary'}`}>
                          {event.title}
                        </p>
                        <span className={`text-[9px] font-bold ${meta.text}`}>{meta.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popup de detalle de evento */}
      <AnimatePresence>
        {selectedEvent && (
          <EventPopup event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}