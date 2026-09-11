import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { MonthNav } from './MonthNav';
import { monthKey, getToday, fmtMoney, semColor, parseMoney, MONTHS_ES } from '../utils';
import { IND_FIN, IND_MEM } from '../utils/constants';

export function Indicadores() {
  const [date, setDate] = useState(() => getToday());
  const month = date.getMonth();
  const year = date.getFullYear();
  const mk = monthKey(year, month);

  const indicators = useStore((state) => state.indicators);
  const saveIndicators = useStore((state) => state.saveIndicators);
  const clearIndicators = useStore((state) => state.clearIndicators);
  
  const [localData, setLocalData] = useState<Record<string, string>>({});
  const [savedMsg, setSavedMsg] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize local data when month changes
  useEffect(() => {
    const data = indicators[mk] || {};
    const initialLocal: Record<string, string> = {};
    
    [...IND_FIN, ...IND_MEM].forEach((def: any) => {
      const val = data[def.key];
      const meta = def.noMeta ? null : data[def.meta];
      const isMoney = def.unit === '$';
      
      initialLocal[`val_${def.key}`] = val != null ? (isMoney && def.key !== 'ingreso' ? fmtMoney(val) : String(val)) : '';
      if (!def.noMeta) {
        initialLocal[`meta_${def.key}`] = meta != null ? (isMoney && def.key !== 'ingreso' ? fmtMoney(meta) : String(meta)) : '';
      }
    });
    
    // special calc for ingreso
    const mrr = data['mrr'] || 0;
    const venta = data['venta'] || 0;
    const mrrMeta = data['mrr_meta'] || 0;
    const ventaMeta = data['venta_meta'] || 0;
    
    if (mrr || venta) initialLocal['val_ingreso'] = fmtMoney(mrr + venta);
    if (mrrMeta || ventaMeta) initialLocal['meta_ingreso'] = fmtMoney(mrrMeta + ventaMeta);

    setLocalData(initialLocal);
  }, [mk, indicators]);

  const handleChange = (type: 'val' | 'meta', key: string, value: string) => {
    const newLocal = { ...localData, [`${type}_${key}`]: value };
    
    // Auto calc ingreso
    if (key === 'mrr' || key === 'venta') {
      const mrr = parseMoney(newLocal[`${type}_mrr`]) || 0;
      const venta = parseMoney(newLocal[`${type}_venta`]) || 0;
      if (mrr || venta) {
        newLocal[`${type}_ingreso`] = fmtMoney(mrr + venta);
      } else {
        newLocal[`${type}_ingreso`] = '';
      }
    }
    
    setLocalData(newLocal);
  };

  const handleBlur = (type: 'val' | 'meta', key: string) => {
    const def: any = [...IND_FIN, ...IND_MEM].find((d: any) => d.key === key);
    if (def?.unit === '$' && key !== 'ingreso') {
      const parsed = parseMoney(localData[`${type}_${key}`]);
      if (parsed != null) {
        setLocalData(prev => ({ ...prev, [`${type}_${key}`]: fmtMoney(parsed) }));
      }
    }
  };

  const handleSave = async () => {
    const dataToSave: Record<string, number> = {};
    
    [...IND_FIN, ...IND_MEM].forEach((def: any) => {
      const vStr = localData[`val_${def.key}`];
      const mStr = localData[`meta_${def.key}`];
      const isMoney = def.unit === '$';
      
      const vParsed = isMoney ? parseMoney(vStr) : (vStr !== '' && vStr != null ? parseFloat(vStr) : null);
      const mParsed = isMoney ? parseMoney(mStr) : (mStr !== '' && mStr != null ? parseFloat(mStr) : null);
      
      if (vParsed != null && !isNaN(vParsed)) dataToSave[def.key] = vParsed;
      if (mParsed != null && !isNaN(mParsed) && !def.noMeta) dataToSave[def.meta] = mParsed;
    });

    const mrrSaved = dataToSave['mrr'] || 0;
    const ventaSaved = dataToSave['venta'] || 0;
    dataToSave['ingreso'] = mrrSaved + ventaSaved;

    setSaving(true);
    try {
      saveIndicators(mk, dataToSave);
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

  const renderIndicator = (def: any, isMem = false) => {
    const isMoney = def.unit === '$';
    const isIngreso = def.key === 'ingreso';
    
    const rawVal = localData[`val_${def.key}`] || '';
    const rawMeta = localData[`meta_${def.key}`] || '';
    
    const val = isMoney ? parseMoney(rawVal) : parseFloat(rawVal);
    const meta = isMoney ? parseMoney(rawMeta) : parseFloat(rawMeta);

    let pct: number | null = null;
    if (def.isChurn) {
      if (meta && val != null && !isNaN(val)) {
        pct = Math.round((meta / val) * 100);
      }
    } else {
      if (meta && val != null && !isNaN(val)) pct = Math.round((val / meta) * 100);
    }
    
    const sc = semColor(pct);
    const falta = (meta && val != null && !def.isChurn) ? Math.max(0, meta - val) : null;
    
    const displayPct = def.isChurn && meta && val != null && !isNaN(val) ? Math.round((val / meta) * 100) : pct;
    
    let statusMsg = '';
    if (def.isChurn && pct !== null) {
      statusMsg = val <= meta ? '✅ Dentro del objetivo' : `⚠️ Excede meta: +${(val - meta).toFixed(2)}${def.unit}`;
    } else if (pct !== null) {
      const faltaStr = falta != null && falta > 0 ? (isMoney ? '$' + fmtMoney(falta) : falta + (def.unit || '')) : null;
      statusMsg = pct >= 100 ? '✅ Meta lograda' : faltaStr ? 'Falta: ' + faltaStr : '';
    }

    return (
      <div key={def.key} className="bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[10px] p-3 transition-colors duration-150" style={pct !== null ? { backgroundColor: sc.bg, borderColor: sc.border } : {}}>
        <div className="text-[10px] font-bold tracking-wide uppercase mb-2" style={pct !== null ? { color: sc.text } : { color: '#6B7280' }}>
          {def.label} {isIngreso && <span className="text-[9px] font-medium ml-1 opacity-70">(auto)</span>}
        </div>
        
        {!def.noMeta && (
          <div className="mb-2">
            <label className="text-[10px] font-semibold mb-1 block" style={pct !== null ? { color: sc.text } : { color: '#111827' }}>Meta del mes</label>
            <input
              type={isMoney && !isIngreso ? 'text' : 'number'}
              value={rawMeta}
              placeholder="0"
              readOnly={isIngreso}
              onChange={(e) => handleChange('meta', def.key, e.target.value)}
              onBlur={() => handleBlur('meta', def.key)}
              className="w-full p-2 border-[1.5px] border-[#E5E7EB] rounded-[6px] text-[12px] outline-none focus:border-[#E8450A] transition-colors"
              style={isIngreso ? { background: 'rgba(0,0,0,0.04)', color: '#6B7280', cursor: 'not-allowed' } : {}}
            />
          </div>
        )}
        
        <div className="mb-2">
          <label className="text-[10px] font-semibold mb-1 block" style={pct !== null ? { color: sc.text } : { color: '#111827' }}>Alcance actual {def.unit && `(${def.unit})`}</label>
          <input
            type={isMoney && !isIngreso ? 'text' : 'number'}
            value={rawVal}
            placeholder="0"
            readOnly={isIngreso}
            onChange={(e) => handleChange('val', def.key, e.target.value)}
            onBlur={() => handleBlur('val', def.key)}
            className="w-full p-2 border-[1.5px] border-[#E5E7EB] rounded-[6px] text-[12px] outline-none focus:border-[#E8450A] transition-colors"
            style={isIngreso ? { background: 'rgba(0,0,0,0.04)', color: '#6B7280', cursor: 'not-allowed' } : {}}
          />
        </div>

        {pct !== null ? (
          <div>
            <div className="text-[28px] font-black my-1.5" style={{ color: sc.text }}>{displayPct}%</div>
            <div className="bg-[#F3F4F6] rounded-[3px] h-[5px] mt-1.5 overflow-hidden" style={{ background: 'rgba(0,0,0,0.1)' }}>
              <div className="h-[5px] rounded-[3px] transition-all duration-400" style={{ width: `${Math.min(100, displayPct)}%`, backgroundColor: sc.border }} />
            </div>
            <div className="text-[11px] font-bold mt-1" style={{ color: sc.text }}>{statusMsg}</div>
          </div>
        ) : (
          <div className="text-[10px] text-[#6B7280] mt-1">Captura meta y alcance para ver el avance</div>
        )}
      </div>
    );
  };

  const monthsHist = Object.keys(indicators).sort().reverse().slice(0, 6);
  const allDefs = [...IND_FIN, ...IND_MEM];

  return (
    <div>
      <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 mb-3.5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[12px] font-bold tracking-wide uppercase m-0">📈 Indicadores</div>
          <MonthNav year={year} month={month} onChange={(dir) => { const nd = new Date(date); nd.setMonth(nd.getMonth() + dir); setDate(nd); }} />
        </div>

        <div className="mb-4">
          <div className="text-[10px] font-bold text-[#6B7280] tracking-wide uppercase py-1.5 border-b border-[#E5E7EB] mb-2.5">Financieros</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {IND_FIN.map(def => renderIndicator(def))}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-[10px] font-bold text-[#6B7280] tracking-wide uppercase py-1.5 border-b border-[#E5E7EB] mb-2.5">Membresías</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {IND_MEM.map(def => renderIndicator(def, true))}
          </div>
        </div>

        <div className="flex items-center gap-2.5 mt-3.5 flex-wrap">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#E8450A] text-white border-none rounded-[6px] px-5 py-2 text-[11px] font-bold cursor-pointer transition-all hover:brightness-90 disabled:opacity-75 disabled:cursor-wait"
          >
            {saving ? '⏳ Guardando en la nube...' : '💾 Guardar indicadores'}
          </button>
          <button
            onClick={() => {
              if (confirm(`¿Limpiar todos los datos de ${MONTHS_ES[month]} ${year}? Esto no se puede deshacer.`)) {
                clearIndicators(mk);
              }
            }}
            disabled={saving}
            className="bg-transparent border-[1.5px] border-[#E5E7EB] rounded-[6px] px-4 py-2 text-[11px] font-bold cursor-pointer text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑 Limpiar mes
          </button>
          {savedMsg && <span className="text-[11px] text-[#16A34A] font-bold">✓ Guardado en la nube con éxito</span>}
        </div>
      </div>

      <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4">
        <div className="text-[12px] font-bold tracking-wide uppercase mb-3">📊 Historial</div>
        {!monthsHist.length ? (
          <div className="text-[#6B7280] text-[11px] py-2">Sin historial aún.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="p-2 bg-[#F9FAFB] text-left border-b border-[#E5E7EB] text-[9px] font-bold uppercase tracking-wide">Mes</th>
                  {allDefs.map((d) => (
                    <th key={d.key} className="p-2 bg-[#F9FAFB] text-center border-b border-[#E5E7EB] text-[9px] font-bold uppercase tracking-wide whitespace-nowrap">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthsHist.map((mk2) => {
                  const [y, m] = mk2.split('-').map(Number);
                  const d = indicators[mk2] || {};
                  return (
                    <tr key={mk2}>
                      <td className="p-2 border-b border-[#F3F4F6] font-semibold whitespace-nowrap">
                        {MONTHS_ES[m - 1]} {y}
                      </td>
                      {allDefs.map((def: any) => {
                        const v = d[def.key];
                        const meta2 = d[def.meta] || (def.key === 'nps' ? 50 : null);
                        const p = meta2 && v != null ? (def.isChurn ? Math.round((1 - v / meta2) * 100) : Math.round((v / meta2) * 100)) : null;
                        const sc2 = def.key === 'nps' || IND_MEM.find((im) => im.key === def.key) ? semColor(p) : { bg: '', border: '', text: p !== null && p >= 100 ? '#16A34A' : p !== null && p >= 70 ? '#D97706' : '#DC2626' };
                        
                        return (
                          <td key={def.key} className="p-2 border-b border-[#F3F4F6] text-center" style={{ backgroundColor: sc2.bg || 'transparent' }}>
                            <div className="font-bold" style={{ color: sc2.text || 'inherit' }}>
                              {v != null ? (def.unit === '$' ? '$' + fmtMoney(v) : v + (def.unit || '')) : '—'}
                            </div>
                            {p !== null && <div className="text-[9px] font-bold" style={{ color: sc2.text || 'inherit' }}>{p}%</div>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
