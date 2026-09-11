import React, { useState } from 'react';
import { useStore } from '../store';
import { getToday, getMonday, dateKey, DAYS_ES, MONTHS_ES } from '../utils';
import { LS_ACTS, CA_ACTS } from '../utils/constants';

export function Checklist() {
  const [activeTab, setActiveTab] = useState<'ls' | 'ca'>('ls');
  
  const [lsWeekStart, setLsWeekStart] = useState(() => getMonday(getToday()));
  const [caWeekStart, setCaWeekStart] = useState(() => getMonday(getToday()));
  
  const [lsSelDay, setLsSelDay] = useState(() => getToday());
  const [caSelDay, setCaSelDay] = useState(() => getToday());

  const chkLS = useStore((state) => state.chkLS);
  const chkCA = useStore((state) => state.chkCA);
  const toggleChk = useStore((state) => state.toggleChk);
  const saveChkNote = useStore((state) => state.saveChkNote);

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleCloudSave = async () => {
    setSaving(true);
    try {
      const { saveActiveTableroToCloud } = await import('../store');
      await saveActiveTableroToCloud();
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Error al guardar en la nube.');
    } finally {
      setSaving(false);
    }
  };

  const renderPanel = (type: 'ls' | 'ca') => {
    const ws = type === 'ls' ? lsWeekStart : caWeekStart;
    const acts = type === 'ls' ? LS_ACTS : CA_ACTS;
    const chkData = type === 'ls' ? chkLS : chkCA;
    const selDay = type === 'ls' ? lsSelDay : caSelDay;
    const color = type === 'ls' ? '#E8450A' : '#0D9488';
    
    const setWs = type === 'ls' ? setLsWeekStart : setCaWeekStart;
    const setSelDay = type === 'ls' ? setLsSelDay : setCaSelDay;

    const we = new Date(ws);
    we.setDate(we.getDate() + 5);

    const changeWeek = (dir: number) => {
      const nw = new Date(ws);
      nw.setDate(nw.getDate() + dir * 7);
      setWs(nw);
    };

    let wDone = 0;
    let wTotal = 0;
    for (let i = 0; i < 6; i++) {
      const d = new Date(ws);
      d.setDate(ws.getDate() + i);
      const s2 = chkData[dateKey(d)] || {};
      wDone += acts.filter((a) => s2[a.n]?.done).length;
      wTotal += acts.length;
    }
    const pct = wTotal > 0 ? Math.round((wDone / wTotal) * 100) : 0;
    const badgeClass = pct >= 90 ? 'bg-[#DCFCE7] text-[#14532D]' : pct >= 60 ? 'bg-[#FEF9C3] text-[#713F12]' : 'bg-[#FEE2E2] text-[#7F1D1D]';

    const selDk = dateKey(selDay);
    const state = chkData[selDk] || {};

    return (
      <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 mb-3.5">
        <div className="text-[12px] font-bold tracking-wide uppercase mb-3">✅ Checklist {type === 'ls' ? 'Líder de Sucursal' : 'Club Assistance'}</div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="text-[13px] font-bold">Sem. {ws.getDate()} al {we.getDate()} de {MONTHS_ES[we.getMonth()]} {we.getFullYear()}</div>
            <div className="text-[10px] text-[#6B7280] mt-0.5">Selecciona el día</div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => changeWeek(-1)} className="bg-transparent border-[1.5px] border-[#E5E7EB] rounded-[6px] w-[30px] h-[30px] cursor-pointer text-[13px] text-[#6B7280] flex items-center justify-center hover:bg-[#F3F4F6]">←</button>
            <div className="flex gap-1.5 flex-wrap">
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const d = new Date(ws);
                d.setDate(ws.getDate() + i);
                const dk = dateKey(d);
                const s = chkData[dk] || {};
                const done = acts.filter((a) => s[a.n]?.done).length;
                const isToday = dk === dateKey(getToday());
                const isSel = dk === dateKey(selDay);
                const allDone = done === acts.length;

                let btnClass = "px-2.5 py-1.5 rounded-[16px] border-[1.5px] text-[10px] font-bold cursor-pointer transition-all text-center min-w-[38px] leading-snug ";
                let btnStyle: React.CSSProperties = { borderColor: '#E5E7EB', color: '#6B7280', background: '#fff' };
                
                if (isSel) {
                  btnStyle = { background: color, borderColor: color, color: '#fff' };
                } else if (allDone) {
                  btnStyle = { background: '#DCFCE7', borderColor: '#86EFAC', color: '#14532D' };
                } else if (isToday) {
                  btnStyle = { ...btnStyle, outline: `2px solid ${color}` };
                }

                return (
                  <button key={dk} onClick={() => setSelDay(d)} className={btnClass} style={btnStyle}>
                    {DAYS_ES[d.getDay()]}<br /><small className="text-[8px]">{d.getDate()}</small>
                  </button>
                );
              })}
            </div>
            <button onClick={() => changeWeek(1)} className="bg-transparent border-[1.5px] border-[#E5E7EB] rounded-[6px] w-[30px] h-[30px] cursor-pointer text-[13px] text-[#6B7280] flex items-center justify-center hover:bg-[#F3F4F6]">→</button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <div className="flex-1 bg-[#F3F4F6] rounded-[4px] h-[7px] overflow-hidden min-w-[80px]">
            <div className="h-[7px] rounded-[4px] transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
          <div className="text-[11px] font-bold">{wDone} / {wTotal}</div>
          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-[4px] tracking-wide whitespace-nowrap ${badgeClass}`}>
            {pct}%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="p-2 bg-[#F9FAFB] text-[9px] font-bold text-[#6B7280] text-left border-b border-[#E5E7EB] tracking-wide uppercase w-[32px]">✓</th>
                <th className="p-2 bg-[#F9FAFB] text-[9px] font-bold text-[#6B7280] text-center border-b border-[#E5E7EB] tracking-wide uppercase w-[24px]">#</th>
                <th className="p-2 bg-[#F9FAFB] text-[9px] font-bold text-[#6B7280] text-left border-b border-[#E5E7EB] tracking-wide uppercase">Actividad</th>
                <th className="p-2 bg-[#F9FAFB] text-[9px] font-bold text-[#6B7280] text-center border-b border-[#E5E7EB] tracking-wide uppercase w-[65px]">Horario</th>
                <th className="p-2 bg-[#F9FAFB] text-[9px] font-bold text-[#6B7280] text-left border-b border-[#E5E7EB] tracking-wide uppercase hidden sm:table-cell">Nota</th>
              </tr>
            </thead>
            <tbody>
              {acts.map((item) => {
                const isDone = !!state[item.n]?.done;
                const note = state[item.n]?.note || '';
                return (
                  <tr key={item.n} className={isDone ? 'opacity-50' : ''}>
                    <td className="p-2 text-center border-b border-[#F3F4F6]">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={(e) => toggleChk(type, selDk, item.n, e.target.checked)}
                        className="w-[16px] h-[16px] cursor-pointer"
                        style={{ accentColor: color }}
                      />
                    </td>
                    <td className="p-2 text-center text-[10px] font-bold text-[#6B7280] border-b border-[#F3F4F6]">{item.n}</td>
                    <td className="p-2 border-b border-[#F3F4F6]">
                      <div className={`text-[11px] font-medium leading-relaxed ${isDone ? 'line-through' : ''}`}>{item.act}</div>
                    </td>
                    <td className="p-2 text-[10px] text-[#6B7280] whitespace-nowrap text-center border-b border-[#F3F4F6]">{item.hora}</td>
                    <td className="p-2 border-b border-[#F3F4F6] hidden sm:table-cell">
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => saveChkNote(type, selDk, item.n, e.target.value)}
                        placeholder="Nota..."
                        className="w-full p-1 border-[1.5px] border-[#E5E7EB] rounded-[4px] text-[10px] outline-none focus:border-[#E8450A]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2.5 mt-4 items-center flex-wrap">
          <button
            onClick={handleCloudSave}
            disabled={saving}
            className="text-white border-none rounded-[6px] px-5 py-2 text-[11px] font-bold cursor-pointer transition-all hover:brightness-90 disabled:opacity-75 disabled:cursor-wait"
            style={{ backgroundColor: color }}
          >
            {saving ? '⏳ Guardando en la nube...' : '💾 Guardar checklist'}
          </button>
          {savedMsg && <span className="text-[11px] text-[#16A34A] font-bold">✓ Guardado en la nube con éxito</span>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex gap-2 mb-3.5">
        <button
          onClick={() => setActiveTab('ls')}
          className="flex-1 py-2 px-3 text-[11px] font-bold text-white rounded-[6px] transition-all"
          style={{ backgroundColor: activeTab === 'ls' ? '#E8450A' : '#6B7280' }}
        >
          Checklist LS
        </button>
        <button
          onClick={() => setActiveTab('ca')}
          className="flex-1 py-2 px-3 text-[11px] font-bold text-white rounded-[6px] transition-all"
          style={{ backgroundColor: activeTab === 'ca' ? '#0D9488' : '#6B7280' }}
        >
          Checklist CA
        </button>
      </div>

      {activeTab === 'ls' ? renderPanel('ls') : renderPanel('ca')}
    </div>
  );
}
