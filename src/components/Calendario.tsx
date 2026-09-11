import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { getToday, dateKey, MONTHS_ES, DAYS_ES, DAYS_FULL } from '../utils';
import { EVT_COLORS } from '../utils/constants';

const INCIDENCIAS_DATES = [
  '2026-06-08', '2026-06-23', '2026-07-08', '2026-07-24',
  '2026-08-07', '2026-08-24', '2026-09-08', '2026-09-23',
  '2026-10-08', '2026-10-23', '2026-11-06', '2026-11-23',
  '2026-12-08', '2026-12-21',
];

function getNthWeekday(y: number, m: number, weekday: number, n: number) {
  let count = 0;
  const days = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    if (new Date(y, m, d).getDay() === weekday) {
      count++;
      if (count === n) return d;
    }
  }
  return null;
}

function getRecurringEvents(y: number, m: number) {
  const evts = [];
  const days = new Date(y, m + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = (d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

  if (y < 2026 || y > 2026 || (y === 2026 && m < 5) || (y === 2026 && m > 11)) return evts;

  for (let d = 1; d <= days; d++) {
    if (new Date(y, m, d).getDay() === 4) {
      evts.push({ id: `cp-${y}-${m}-${d}`, title: 'Correo productividad limpieza', date: dateStr(d), type: 'correo_prod', notes: 'Primer jueves del mes', recurring: true, status: 'pendiente' });
      break;
    }
  }

  for (let d = 1; d <= days; d++) {
    if (new Date(y, m, d).getDay() === 5) {
      evts.push({ id: `is-${y}-${m}-${d}`, title: 'Informe de resultados semanal', date: dateStr(d), type: 'informe_sem', notes: 'Todos los viernes', recurring: true, status: 'pendiente' });
    }
  }

  for (let d = 1; d <= days; d++) {
    if (new Date(y, m, d).getDay() === 6) {
      evts.push({ id: `ic-${y}-${m}-${d}`, title: 'Agregar inventario', date: dateStr(d), type: 'inventario_cal', notes: 'Todos los sábados', recurring: true, status: 'pendiente' });
    }
  }

  INCIDENCIAS_DATES.forEach((date) => {
    const [iy, im] = date.split('-').map(Number);
    if (iy === y && im - 1 === m) {
      evts.push({ id: `inc-${date}`, title: 'Envio de incidencias', date, type: 'incidencia', notes: 'Fecha de envio de incidencias', recurring: true, status: 'pendiente' });
    }
  });

  for (let d = 1; d <= days; d++) {
    const dt = new Date(y, m, d);
    if (d >= 15 && d <= 21 && dt.getDay() >= 1 && dt.getDay() <= 5) {
      evts.push({ id: `ono-${y}-${m}-${d}`, title: 'One on One', date: dateStr(d), type: 'ono_equipo', notes: 'One on One individual con miembro del equipo.', recurring: true, status: 'pendiente' });
    }
  }

  const thirdMon = getNthWeekday(y, m, 1, 3);
  if (thirdMon) {
    evts.push({ id: `insumos-${y}-${m}-${thirdMon}`, title: 'Solicitud de insumos de limpieza', date: dateStr(thirdMon), type: 'inventario_cal', notes: 'Tercer lunes del mes', recurring: true, status: 'pendiente' });
  }

  return evts;
}

export function Calendario() {
  const [date, setDate] = useState(() => getToday());
  const month = date.getMonth();
  const year = date.getFullYear();

  const calEvents = useStore((state) => state.calEvents);
  const hiddenEvents = useStore((state) => state.hiddenEvents);
  const evtStatuses = useStore((state) => state.evtStatuses);
  
  const restoreHiddenEvents = useStore((state) => state.restoreHiddenEvents);
  const hideCalEvent = useStore((state) => state.hideCalEvent);
  const deleteCalEvent = useStore((state) => state.deleteCalEvent);
  const toggleEvtStatus = useStore((state) => state.toggleEvtStatus);

  const [selDay, setSelDay] = useState<string | null>(null);

  const recurring = useMemo(() => getRecurringEvents(year, month), [year, month]);
  
  const allEvts = useMemo(() => {
    return [...calEvents, ...recurring].filter(e => !hiddenEvents.includes(e.id));
  }, [calEvents, recurring, hiddenEvents]);

  const total = allEvts.length;
  const realizados = allEvts.filter(e => (evtStatuses[e.id] || e.status) === 'realizado').length;
  const pendientes = total - realizados;
  const pct = total > 0 ? Math.round((realizados / total) * 100) : 0;
  const sumCol = pct >= 90 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626';
  const badgeSumCls = pct >= 90 ? 'bg-[#DCFCE7] text-[#14532D]' : pct >= 50 ? 'bg-[#FEF9C3] text-[#713F12]' : 'bg-[#FEE2E2] text-[#7F1D1D]';

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const prevDays = new Date(year, month, 0).getDate();
  const today = getToday();

  const handleDayClick = (dk: string) => {
    setSelDay(selDay === dk ? null : dk);
  };

  const selDateObj = selDay ? new Date(selDay + 'T12:00:00') : null;
  const selDayEvts = selDay ? allEvts.filter(e => e.date === selDay) : [];

  return (
    <div>
      <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 mb-3.5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <button onClick={() => { const nd = new Date(date); nd.setMonth(nd.getMonth() - 1); setDate(nd); }} className="bg-transparent border-[1.5px] border-[#E5E7EB] rounded-[6px] w-[30px] h-[30px] cursor-pointer text-[13px] text-[#6B7280] flex items-center justify-center hover:bg-[#F3F4F6]">←</button>
            <div className="text-[15px] font-bold">{MONTHS_ES[month]} <span className="text-[#E8450A]">{year}</span></div>
            <button onClick={() => { const nd = new Date(date); nd.setMonth(nd.getMonth() + 1); setDate(nd); }} className="bg-transparent border-[1.5px] border-[#E5E7EB] rounded-[6px] w-[30px] h-[30px] cursor-pointer text-[13px] text-[#6B7280] flex items-center justify-center hover:bg-[#F3F4F6]">→</button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'cal', id: null } }))}
              className="bg-[#E8450A] text-white border-none rounded-[6px] px-3.5 py-1.5 text-[10px] font-bold cursor-pointer transition-all hover:brightness-90"
            >
              ＋ Agregar
            </button>
            <button
              onClick={() => {
                if (hiddenEvents.length === 0) { alert('No hay actividades ocultas.'); return; }
                if (confirm(`¿Restaurar ${hiddenEvents.length} actividad(es) oculta(s)?`)) restoreHiddenEvents();
              }}
              className="bg-transparent border-[1.5px] border-[#E5E7EB] rounded-[6px] px-3 py-1.5 text-[10px] font-bold cursor-pointer text-[#6B7280] hover:bg-[#F3F4F6]"
            >
              ↺ Restaurar ocultas
            </button>
          </div>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-2.5 p-2.5 px-3.5 bg-[#F9FAFB] rounded-[6px] mb-3 flex-wrap">
            <div className="text-[11px] font-bold">Avance del mes:</div>
            <div className="flex-1 bg-[#F3F4F6] rounded-[4px] h-[8px] min-w-[80px] overflow-hidden">
              <div className="h-[8px] rounded-[4px] transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: sumCol }} />
            </div>
            <span className="text-[12px] font-bold" style={{ color: sumCol }}>{realizados}/{total}</span>
            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-[4px] tracking-wide ${badgeSumCls}`}>{pct}%</span>
            {pendientes > 0 ? (
              <span className="text-[10px] text-[#6B7280]">{pendientes} pendiente{pendientes > 1 ? 's' : ''}</span>
            ) : (
              <span className="text-[10px] text-[#16A34A] font-bold">✅ Todo realizado</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
          {DAYS_ES.map(d => (
            <div key={d} className="text-center text-[9px] font-bold text-[#6B7280] py-1 tracking-wide uppercase">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[70px] bg-[#FAFAFA] border border-[#E5E7EB] rounded-[4px] p-1 opacity-30 cursor-default">
              <div className="text-[10px] font-semibold text-[#6B7280] mb-0.5">{prevDays - firstDay + 1 + i}</div>
            </div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const dk = dateKey(new Date(year, month, d));
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
            const isSel = selDay === dk;
            const dayEvts = allEvts.filter(e => e.date === dk);
            
            return (
              <div
                key={d}
                onClick={() => handleDayClick(dk)}
                className={`min-h-[70px] rounded-[4px] p-1 cursor-pointer transition-colors ${
                  isToday ? 'bg-[#FFF5F2] border border-[#E8450A]' : 
                  isSel ? 'bg-[#F3F4F6] border border-[#D1D5DB]' : 'bg-[#FAFAFA] border border-[#E5E7EB] hover:bg-[#F3F4F6]'
                }`}
              >
                {isToday ? (
                  <div className="mb-0.5">
                    <div className="bg-[#E8450A] text-white rounded-full w-[18px] h-[18px] flex items-center justify-center font-bold text-[9px]">
                      {d}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] font-semibold text-[#6B7280] mb-0.5">{d}</div>
                )}
                <div className="flex flex-col gap-[1px]">
                  {dayEvts.slice(0, 3).map(e => {
                    const ec = EVT_COLORS[e.type] || EVT_COLORS.otro;
                    return (
                      <div key={e.id} className="text-[8px] font-bold px-1 py-[1px] rounded-[2px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ backgroundColor: ec.bg, color: ec.text }}>
                        {ec.lbl} {e.title}
                      </div>
                    );
                  })}
                  {dayEvts.length > 3 && <div className="text-[8px] text-[#6B7280]">+ {dayEvts.length - 3} más</div>}
                </div>
              </div>
            );
          })}
          {Array.from({ length: (firstDay + daysInMonth) % 7 === 0 ? 0 : 7 - ((firstDay + daysInMonth) % 7) }).map((_, i) => (
            <div key={`empty-end-${i}`} className="min-h-[70px] bg-[#FAFAFA] border border-[#E5E7EB] rounded-[4px] p-1 opacity-30 cursor-default">
              <div className="text-[10px] font-semibold text-[#6B7280] mb-0.5">{i + 1}</div>
            </div>
          ))}
        </div>
      </div>

      {selDay && selDateObj && (
        <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4">
          <div className="text-[12px] font-bold tracking-wide uppercase mb-3">
            📅 {DAYS_FULL[selDateObj.getDay()]} {selDateObj.getDate()} de {MONTHS_ES[selDateObj.getMonth()]} {selDateObj.getFullYear()}
          </div>
          {!selDayEvts.length ? (
            <div className="text-[#6B7280] text-[12px] py-2">
              Sin actividades.{' '}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'cal', id: null, prefillDate: selDay } }))}
                className="bg-transparent border-none text-[#E8450A] font-bold cursor-pointer text-[12px]"
              >
                + Agregar
              </button>
            </div>
          ) : (
            <div>
              {selDayEvts.map((e) => {
                const ec = EVT_COLORS[e.type] || EVT_COLORS.otro;
                const st = evtStatuses[e.id] || e.status || 'pendiente';
                const isRealizado = st === 'realizado';
                const stBg = isRealizado ? '#DCFCE7' : '#FEF9C3';
                const stColor = isRealizado ? '#14532D' : '#713F12';
                const stLabel = isRealizado ? '✅ Realizado' : '⏳ Pendiente';

                return (
                  <div key={e.id} className={`flex items-start gap-2 p-2.5 rounded-[5px] mb-2 ${isRealizado ? 'opacity-75' : 'opacity-100'}`} style={{ backgroundColor: ec.bg }}>
                    <div className="flex-1">
                      <div className="text-[12px] font-bold" style={{ color: ec.text }}>{ec.lbl} {e.title}</div>
                      {e.notes && <div className="text-[11px] mt-0.5 opacity-80" style={{ color: ec.text }}>{e.notes}</div>}
                      <div className="mt-1.5">
                        <button
                          onClick={() => toggleEvtStatus(e.id, st)}
                          className="border-[1.5px] rounded-[5px] px-3 py-1 text-[10px] font-bold cursor-pointer"
                          style={{ backgroundColor: stBg, color: stColor, borderColor: stColor }}
                        >
                          {stLabel}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'cal', id: e.id, prefillDate: selDay } }))}
                      className="text-[11px] bg-transparent border rounded-[4px] px-2 py-0.5 cursor-pointer"
                      style={{ borderColor: ec.text, color: ec.text }}
                    >
                      ✏
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('¿Quitar esta actividad del calendario?')) {
                          if (e.recurring) hideCalEvent(e.id);
                          else deleteCalEvent(e.id);
                        }
                      }}
                      className="text-[11px] bg-transparent border border-[#7F1D1D] rounded-[4px] px-2 py-0.5 cursor-pointer text-[#7F1D1D]"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
