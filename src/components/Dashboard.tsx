import React, { useState } from 'react';
import { useStore, saveActiveTableroToCloud } from '../store';
import { MonthNav } from './MonthNav';
import { monthKey, dateKey, getToday, semColor, fmtMoney, MONTHS_ES } from '../utils';
import { IND_FIN, IND_MEM, LS_ACTS, CA_ACTS } from '../utils/constants';

export function Dashboard() {
  const [date, setDate] = useState(() => getToday());
  const [bitLSDay, setBitLSDay] = useState(() => getToday());
  const [bitCADay, setBitCADay] = useState(() => getToday());
  const [savingComp, setSavingComp] = useState(false);
  const [savedCompMsg, setSavedCompMsg] = useState(false);
  
  const chkLS = useStore((state) => state.chkLS);
  const chkCA = useStore((state) => state.chkCA);
  const indicators = useStore((state) => state.indicators);
  const composicion = useStore((state) => state.composicion);
  const saveComposicion = useStore((state) => state.saveComposicion);
  const bitLS = useStore((state) => state.bitLS);
  const bitCA = useStore((state) => state.bitCA);
  const deleteBitacora = useStore((state) => state.deleteBitacora);

  const month = date.getMonth();
  const year = date.getFullYear();
  const mk = monthKey(year, month);
  const data = indicators[mk] || {};
  const compData = composicion[mk] || { mensuales: 0, anuales: 0 };

  const handleMonthChange = (dir: number) => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + dir);
    setDate(newDate);
  };

  const getChkProgress = (type: 'ls' | 'ca') => {
    const acts = type === 'ls' ? LS_ACTS : CA_ACTS;
    const store = type === 'ls' ? chkLS : chkCA;
    const dk = dateKey(getToday());
    const state = store[dk] || {};
    const done = acts.filter((a) => state[a.n]?.done).length;
    const pct = Math.round((done / acts.length) * 100);
    const c = pct >= 90 ? '#16A34A' : pct >= 50 ? '#D97706' : '#DC2626';
    const color = type === 'ls' ? '#E8450A' : '#0D9488';
    return { done, total: acts.length, pct, c, color };
  };

  const lsProg = getChkProgress('ls');
  const caProg = getChkProgress('ca');

  const totalMen = compData.mensuales || 0;
  const totalAnu = compData.anuales || 0;
  const totalComp = totalMen + totalAnu;
  const pctMen = totalComp > 0 ? Math.round((totalMen / totalComp) * 100) : 0;
  const pctAnu = totalComp > 0 ? Math.round((totalAnu / totalComp) * 100) : 0;

  const r = 60, cx = 80, cy = 80, stroke = 22, circ = 2 * Math.PI * r;
  const menArc = totalComp > 0 ? (totalMen / totalComp) * circ : 0;
  const anuArc = totalComp > 0 ? (totalAnu / totalComp) * circ : 0;

  const changeBitDay = (type: 'ls' | 'ca', dir: number) => {
    if (type === 'ls') {
      const next = new Date(bitLSDay);
      next.setDate(next.getDate() + dir);
      setBitLSDay(next);
    } else {
      const next = new Date(bitCADay);
      next.setDate(next.getDate() + dir);
      setBitCADay(next);
    }
  };

  const formatBitDate = (d: Date) => {
    if (dateKey(d) === dateKey(getToday())) return 'Hoy';
    return `${d.getDate()} ${MONTHS_ES[d.getMonth()].slice(0, 3)}`;
  };

  const renderBitacora = (type: 'ls' | 'ca') => {
    const list = type === 'ls' ? bitLS : bitCA;
    const targetDay = type === 'ls' ? bitLSDay : bitCADay;
    const dk = dateKey(targetDay);
    const isToday = dk === dateKey(getToday());
    const entries = list.filter((e) => e.date === dk).slice(0, 10);
    
    if (!entries.length) {
      return <div className="text-[#6B7280] text-[11px] py-1.5">Sin notas {isToday ? 'hoy' : 'este día'}.</div>;
    }

    return entries.map((e) => {
      let borderCol = '#E5E7EB';
      let badgeCls = 'bg-[#F3F4F6] text-[#6B7280]';
      if (e.prio === 'urgente') { borderCol = '#DC2626'; badgeCls = 'bg-[#FEE2E2] text-[#7F1D1D]'; }
      if (e.prio === 'info') { borderCol = '#1D4ED8'; badgeCls = 'bg-[#DBEAFE] text-[#1E3A8A]'; }
      if (e.prio === 'seguimiento') { borderCol = '#E8450A'; badgeCls = 'bg-[#FEF0E8] text-[#9A3412]'; }

      return (
        <div key={e.id} className="p-2 bg-[#F9FAFB] rounded-[5px] mb-1.5 border-l-[3px]" style={{ borderLeftColor: borderCol }}>
          <div className="flex gap-1.5 items-center mb-[3px]">
            <span className={`inline-block text-[9px] font-bold px-[7px] py-[2px] rounded-[4px] tracking-wide whitespace-nowrap ${badgeCls}`}>
              {e.turno}
            </span>
            <span className="text-[9px] text-[#6B7280]">{e.time}</span>
          </div>
          <div className="text-[11px]">{e.nota}</div>
          <button
            onClick={async () => {
              deleteBitacora(type, e.id);
              try {
                await saveActiveTableroToCloud();
              } catch (err) {
                console.error(err);
              }
            }}
            className="text-[9px] text-[#7F1D1D] bg-transparent border-none cursor-pointer mt-[3px] font-inherit hover:underline"
          >
            ✕ Eliminar
          </button>
        </div>
      );
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-[12px] font-bold text-[#6B7280] tracking-wide uppercase">
          📊 Dashboard
        </div>
        <MonthNav year={year} month={month} onChange={handleMonthChange} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 mb-3.5">
        <div className="col-span-full text-[10px] font-bold text-[#6B7280] tracking-wide uppercase py-2 pb-1 border-b border-[#E5E7EB] mb-2">
          Financieros
        </div>
        {IND_FIN.map((def) => {
          const val = data[def.key];
          const meta = def.noMeta ? null : data[def.meta];
          let pct: number | null = null;
          let displayPct: number | null = null;

          if (meta && val != null) {
            if (def.isChurn) {
              pct = Math.min(150, Math.round((meta / val) * 100)); // inverted for color
              displayPct = Math.round((val / meta) * 100);
            } else {
              pct = Math.min(150, Math.round((val / meta) * 100));
              displayPct = pct;
            }
          }

          const col = pct === null ? '#9CA3AF' : pct >= 100 ? '#16A34A' : pct >= 86 ? '#D97706' : '#DC2626';
          const falta = meta && val != null && !def.isChurn && !def.noMeta ? Math.max(0, meta - val) : null;
          const dispVal = val != null ? (def.unit === '$' ? '$' + fmtMoney(val) : val + (def.unit || '')) : '-';
          const dispMeta = meta != null ? (def.unit === '$' ? '$' + fmtMoney(meta) : meta + (def.unit || '')) : '—';
          const churnStatus = def.isChurn && pct !== null ? (val <= meta ? '✅ Dentro del objetivo' : '⚠️ Sobre meta') : null;

          return (
            <div key={def.key} className="bg-white border border-[#E5E7EB] rounded-[10px] p-3 border-l-4" style={{ borderLeftColor: col }}>
              <div className="text-[9px] font-bold text-[#6B7280] tracking-wide uppercase mb-1">{def.label}</div>
              <div className="text-[22px] font-bold mb-0.5" style={{ color: col }}>{dispVal}</div>
              <div className="text-[10px] text-[#6B7280]">Meta: {dispMeta}</div>
              {falta != null && falta > 0 && (
                <div className="text-[10px] font-bold mt-0.5 text-[#DC2626]">Falta: {def.unit === '$' ? '$' + fmtMoney(falta) : falta + (def.unit || '')}</div>
              )}
              {churnStatus && <div className="text-[10px] font-bold mt-0.5" style={{ color: col }}>{churnStatus}</div>}
              {pct !== null && displayPct !== null && (
                <>
                  <div className="bg-[#F3F4F6] rounded-[3px] h-[5px] mt-1.5 overflow-hidden">
                    <div className="h-[5px] rounded-[3px] transition-all duration-400" style={{ width: `${Math.min(100, displayPct)}%`, backgroundColor: col }} />
                  </div>
                  <div className="text-[10px] font-bold mt-1" style={{ color: col }}>{displayPct}%</div>
                </>
              )}
            </div>
          );
        })}

        <div className="col-span-full text-[10px] font-bold text-[#6B7280] tracking-wide uppercase py-2 pb-1 border-b border-[#E5E7EB] mb-2 mt-2">
          Membresías
        </div>
        {IND_MEM.map((def) => {
          const val = data[def.key];
          const meta = data[def.meta];
          const pct = meta && val != null ? Math.round((val / meta) * 100) : null;
          const sc = semColor(pct);
          const falta = meta && val != null ? Math.max(0, meta - val) : null;

          return (
            <div key={def.key} className="bg-white border rounded-[10px] p-3 border-l-4" style={{ borderLeftColor: sc.border, backgroundColor: sc.bg }}>
              <div className="text-[9px] font-bold tracking-wide uppercase mb-1" style={{ color: sc.text }}>{def.label}</div>
              <div className="text-[22px] font-bold mb-0.5" style={{ color: sc.text }}>{val != null ? val : '-'}</div>
              <div className="text-[10px]" style={{ color: sc.text }}>Meta: {meta || '—'}</div>
              {falta != null && falta > 0 && <div className="text-[10px] font-bold mt-0.5" style={{ color: sc.text }}>Falta: {falta}</div>}
              {pct !== null && (
                <>
                  <div className="rounded-[3px] h-[5px] mt-1.5 overflow-hidden" style={{ background: 'rgba(0,0,0,0.1)' }}>
                    <div className="h-[5px] rounded-[3px] transition-all duration-400" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: sc.border }} />
                  </div>
                  <div className="text-[10px] font-bold mt-1" style={{ color: sc.text }}>{pct}%</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
        <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4">
          <div className="text-[12px] font-bold tracking-wide uppercase mb-3 flex items-center gap-2">✅ Checklist LS — Hoy</div>
          <div className="flex items-center gap-3 mb-2.5">
            <div className="flex-1">
              <div className="text-[11px] font-semibold mb-1">{lsProg.done} de {lsProg.total} actividades completadas hoy</div>
              <div className="bg-[#F3F4F6] rounded-[4px] h-[10px] overflow-hidden">
                <div className="h-[10px] rounded-[4px] transition-all duration-300" style={{ width: `${lsProg.pct}%`, backgroundColor: lsProg.color }} />
              </div>
            </div>
            <div className="text-[24px] font-black" style={{ color: lsProg.color }}>{lsProg.pct}%</div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className={`rounded-[6px] p-2 text-center ${lsProg.pct >= 90 ? 'bg-[#DCFCE7]' : lsProg.pct >= 50 ? 'bg-[#FEF9C3]' : 'bg-[#FEE2E2]'}`}>
              <div className="text-[18px] font-black" style={{ color: lsProg.c }}>{lsProg.done}</div>
              <div className="text-[9px] font-bold" style={{ color: lsProg.c }}>Completadas</div>
            </div>
            <div className="bg-[#F9FAFB] rounded-[6px] p-2 text-center">
              <div className="text-[18px] font-black text-[#6B7280]">{lsProg.total - lsProg.done}</div>
              <div className="text-[9px] font-bold text-[#6B7280]">Pendientes</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4">
          <div className="text-[12px] font-bold tracking-wide uppercase mb-3 flex items-center gap-2">✅ Checklist CA — Hoy</div>
          <div className="flex items-center gap-3 mb-2.5">
            <div className="flex-1">
              <div className="text-[11px] font-semibold mb-1">{caProg.done} de {caProg.total} actividades completadas hoy</div>
              <div className="bg-[#F3F4F6] rounded-[4px] h-[10px] overflow-hidden">
                <div className="h-[10px] rounded-[4px] transition-all duration-300" style={{ width: `${caProg.pct}%`, backgroundColor: caProg.color }} />
              </div>
            </div>
            <div className="text-[24px] font-black" style={{ color: caProg.color }}>{caProg.pct}%</div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className={`rounded-[6px] p-2 text-center ${caProg.pct >= 90 ? 'bg-[#DCFCE7]' : caProg.pct >= 50 ? 'bg-[#FEF9C3]' : 'bg-[#FEE2E2]'}`}>
              <div className="text-[18px] font-black" style={{ color: caProg.c }}>{caProg.done}</div>
              <div className="text-[9px] font-bold" style={{ color: caProg.c }}>Completadas</div>
            </div>
            <div className="bg-[#F9FAFB] rounded-[6px] p-2 text-center">
              <div className="text-[18px] font-black text-[#6B7280]">{caProg.total - caProg.done}</div>
              <div className="text-[9px] font-bold text-[#6B7280]">Pendientes</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 mb-3.5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[12px] font-bold tracking-wide uppercase m-0">🏷 Composición de membresías</div>
        </div>
        <div className="flex items-center gap-5 flex-wrap">
          {totalComp > 0 ? (
            <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={stroke} />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#16A34A" strokeWidth={stroke} strokeDasharray={`${anuArc} ${circ}`} strokeDashoffset="0" transform={`rotate(-90 ${cx} ${cy})`} className="transition-all duration-400" />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1D4ED8" strokeWidth={stroke} strokeDasharray={`${menArc} ${circ}`} strokeDashoffset={-anuArc} transform={`rotate(-90 ${cx} ${cy})`} className="transition-all duration-400" />
              <text x={cx} y={cy - 8} textAnchor="middle" fontSize="20" fontWeight="900" fill="#1A1A1A" fontFamily="Montserrat, Arial">{totalComp}</text>
              <text x={cx} y={cy + 10} textAnchor="middle" fontSize="10" fill="#6B7280" fontFamily="Montserrat, Arial">socios</text>
            </svg>
          ) : (
            <div className="w-[160px] h-[160px] rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0">
              <span className="text-[11px] text-[#6B7280] text-center p-2.5">Sin datos</span>
            </div>
          )}
          <div className="flex-1 min-w-[160px]">
            <div className="flex flex-col gap-2.5">
              <div className="bg-[#DBEAFE] border-[1.5px] border-[#93C5FD] rounded-[6px] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-bold text-[#1E3A8A] tracking-wide uppercase mb-0.5">■ Mensuales</div>
                    <div className="text-[22px] font-black text-[#1E3A8A]">{totalMen}</div>
                  </div>
                  <div className="text-[18px] font-black text-[#1E3A8A]">{pctMen}%</div>
                </div>
              </div>
              <div className="bg-[#DCFCE7] border-[1.5px] border-[#86EFAC] rounded-[6px] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-bold text-[#14532D] tracking-wide uppercase mb-0.5">■ Anuales</div>
                    <div className="text-[22px] font-black text-[#14532D]">{totalAnu}</div>
                  </div>
                  <div className="text-[18px] font-black text-[#14532D]">{pctAnu}%</div>
                </div>
              </div>
            </div>
            <div className="mt-2.5 flex gap-2 flex-wrap">
              <input
                type="number"
                placeholder="Mensuales"
                value={totalMen || ''}
                onChange={(e) => saveComposicion(mk, parseFloat(e.target.value) || 0, totalAnu)}
                className="flex-1 min-w-[80px] px-2.5 py-1.5 border-[1.5px] border-[#93C5FD] rounded-[6px] text-[12px] outline-none"
              />
              <input
                type="number"
                placeholder="Anuales"
                value={totalAnu || ''}
                onChange={(e) => saveComposicion(mk, totalMen, parseFloat(e.target.value) || 0)}
                className="flex-1 min-w-[80px] px-2.5 py-1.5 border-[1.5px] border-[#86EFAC] rounded-[6px] text-[12px] outline-none"
              />
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={async () => {
                  setSavingComp(true);
                  try {
                    await saveActiveTableroToCloud();
                    setSavedCompMsg(true);
                    setTimeout(() => setSavedCompMsg(false), 3000);
                  } catch (e) {
                    console.error(e);
                    alert('Error al guardar la composición en la nube.');
                  } finally {
                    setSavingComp(false);
                  }
                }}
                disabled={savingComp}
                className="text-white bg-[#1E293B] border-none rounded-[6px] px-4 py-1.5 text-[10px] font-bold cursor-pointer transition-all hover:brightness-90 disabled:opacity-75 disabled:cursor-wait"
              >
                {savingComp ? '⏳ Guardando...' : '💾 Guardar composición'}
              </button>
              {savedCompMsg && <span className="text-[10px] text-[#16A34A] font-bold">✓ Guardada</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-[12px] font-bold tracking-wide uppercase m-0">📝 Bitácora LS</div>
            <div className="flex items-center gap-[6px]">
              <button
                onClick={() => changeBitDay('ls', -1)}
                className="w-[26px] h-[26px] flex items-center justify-center rounded-[5px] border border-[#E5E7EB] bg-white text-[#6B7280] text-[12px] font-bold cursor-pointer hover:bg-[#F3F4F6] transition-all"
              >
                ←
              </button>
              <span className="text-[10px] font-bold text-[#6B7280] min-w-[70px] text-center">
                {formatBitDate(bitLSDay)}
              </span>
              <button
                onClick={() => changeBitDay('ls', 1)}
                className="w-[26px] h-[26px] flex items-center justify-center rounded-[5px] border border-[#E5E7EB] bg-white text-[#6B7280] text-[12px] font-bold cursor-pointer hover:bg-[#F3F4F6] transition-all"
              >
                →
              </button>
            </div>
          </div>
          <div>{renderBitacora('ls')}</div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openBitacora', { detail: 'ls' }))}
            className="mt-2.5 text-[10px] px-3.5 py-2 bg-[#E8450A] text-white border-none rounded-[6px] font-bold cursor-pointer transition-all hover:brightness-90 inline-block"
          >
            + Agregar nota
          </button>
        </div>

        <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-[12px] font-bold tracking-wide uppercase m-0">📝 Bitácora CA</div>
            <div className="flex items-center gap-[6px]">
              <button
                onClick={() => changeBitDay('ca', -1)}
                className="w-[26px] h-[26px] flex items-center justify-center rounded-[5px] border border-[#E5E7EB] bg-white text-[#6B7280] text-[12px] font-bold cursor-pointer hover:bg-[#F3F4F6] transition-all"
              >
                ←
              </button>
              <span className="text-[10px] font-bold text-[#6B7280] min-w-[70px] text-center">
                {formatBitDate(bitCADay)}
              </span>
              <button
                onClick={() => changeBitDay('ca', 1)}
                className="w-[26px] h-[26px] flex items-center justify-center rounded-[5px] border border-[#E5E7EB] bg-white text-[#6B7280] text-[12px] font-bold cursor-pointer hover:bg-[#F3F4F6] transition-all"
              >
                →
              </button>
            </div>
          </div>
          <div>{renderBitacora('ca')}</div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openBitacora', { detail: 'ca' }))}
            className="mt-2.5 text-[10px] px-3.5 py-2 bg-[#0D9488] text-white border-none rounded-[6px] font-bold cursor-pointer transition-all hover:brightness-90 inline-block"
          >
            + Agregar nota
          </button>
        </div>
      </div>
    </div>
  );
}
