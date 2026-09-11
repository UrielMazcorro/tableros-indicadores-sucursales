import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { MonthNav } from './MonthNav';
import { monthKey, getToday, semColor } from '../utils';
import { PROY_TIPOS, SEMANAS } from '../utils/constants';

export function Proyeccion() {
  const [date, setDate] = useState(() => getToday());
  const month = date.getMonth();
  const year = date.getFullYear();
  const mk = monthKey(year, month);

  const proyeccion = useStore((state) => state.proyeccion);
  const saveProyeccion = useStore((state) => state.saveProyeccion);
  
  const [localData, setLocalData] = useState<Record<string, string>>({});
  const [savedMsg, setSavedMsg] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const data = proyeccion[mk] || {};
    const initialLocal: Record<string, string> = {};
    PROY_TIPOS.forEach((tipo) => {
      const tkey = tipo.toLowerCase().replace('ó', 'o');
      initialLocal[`${tkey}_meta_mes`] = data[`${tkey}_meta_mes`]?.toString() || '';
      SEMANAS.forEach((_, si) => {
        initialLocal[`${tkey}_s${si}_pct`] = data[`${tkey}_s${si}_pct`]?.toString() || '';
        initialLocal[`${tkey}_s${si}_alc`] = data[`${tkey}_s${si}_alc`]?.toString() || '';
      });
    });
    setLocalData(initialLocal);
  }, [mk, proyeccion]);

  const handleChange = (key: string, value: string) => {
    setLocalData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const dataToSave: Record<string, number> = {};
    PROY_TIPOS.forEach((tipo) => {
      const tkey = tipo.toLowerCase().replace('ó', 'o');
      const mmStr = localData[`${tkey}_meta_mes`];
      const mm = mmStr ? parseFloat(mmStr) : null;
      if (mm != null && !isNaN(mm)) dataToSave[`${tkey}_meta_mes`] = mm;

      SEMANAS.forEach((_, si) => {
        const pctStr = localData[`${tkey}_s${si}_pct`];
        const alcStr = localData[`${tkey}_s${si}_alc`];
        const pct = pctStr ? parseFloat(pctStr) : null;
        const alc = alcStr ? parseFloat(alcStr) : null;
        if (pct != null && !isNaN(pct)) dataToSave[`${tkey}_s${si}_pct`] = pct;
        if (alc != null && !isNaN(alc)) dataToSave[`${tkey}_s${si}_alc`] = alc;
      });
    });

    setSaving(true);
    try {
      saveProyeccion(mk, dataToSave);
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

  return (
    <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="text-[12px] font-bold tracking-wide uppercase m-0">🎯 Proyección de Venta</div>
        <MonthNav year={year} month={month} onChange={(dir) => { const nd = new Date(date); nd.setMonth(nd.getMonth() + dir); setDate(nd); }} />
      </div>
      <div className="text-[11px] text-[#6B7280] mb-4">Captura la meta % de cada semana y tu alcance. El sistema calcula cuántas membresías necesitas y cómo vas.</div>

      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] p-3.5 mb-4">
        <div className="text-[10px] font-bold text-[#6B7280] tracking-wide uppercase mb-2.5">Meta del mes (en número de membresías)</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
          {PROY_TIPOS.map((tipo) => {
            const tkey = tipo.toLowerCase().replace('ó', 'o');
            return (
              <div key={tkey}>
                <div className="text-[11px] font-bold mb-1">{tipo}</div>
                <input
                  type="number"
                  value={localData[`${tkey}_meta_mes`] || ''}
                  onChange={(e) => handleChange(`${tkey}_meta_mes`, e.target.value)}
                  placeholder="Ej. 40"
                  className="w-full p-2 border-[1.5px] border-[#E5E7EB] rounded-[6px] text-[12px] outline-none focus:border-[#E8450A]"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
        {SEMANAS.map((sem, si) => (
          <div key={sem} className="bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[10px] p-3.5">
            <div className="text-[13px] font-bold text-[#1A1A1A] border-b border-[#E5E7EB] pb-2 mb-3 flex items-center justify-between">
              {sem}
              <span className="text-[10px] text-[#6B7280] font-medium">% meta acumulada</span>
            </div>
            {PROY_TIPOS.map((tipo) => {
              const tkey = tipo.toLowerCase().replace('ó', 'o');
              const metaMes = parseFloat(localData[`${tkey}_meta_mes`]) || 0;
              const pctMeta = parseFloat(localData[`${tkey}_s${si}_pct`]) || 0;
              const alcStr = localData[`${tkey}_s${si}_alc`];
              const alc = alcStr !== '' && alcStr != null ? parseFloat(alcStr) : null;
              
              const metaNec = metaMes && pctMeta ? Math.round((metaMes * pctMeta) / 100) : null;
              const pct = metaNec && alc != null ? Math.round((alc / metaNec) * 100) : null;
              const sc = semColor(pct);
              const falta = metaNec && alc != null ? Math.max(0, metaNec - alc) : null;

              return (
                <div key={tipo} className="border-[1.5px] rounded-[6px] p-2.5 mb-2 transition-colors duration-200" style={{ backgroundColor: sc.bg, borderColor: sc.border }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-bold" style={{ color: sc.text }}>{tipo}</div>
                    <div className="text-[13px] font-black" style={{ color: sc.text }}>{pct !== null ? `${pct}%` : '—'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <div className="text-[9px] font-bold tracking-wide uppercase mb-[3px]" style={{ color: sc.text }}>Meta %</div>
                      <input
                        type="number"
                        value={localData[`${tkey}_s${si}_pct`] || ''}
                        onChange={(e) => handleChange(`${tkey}_s${si}_pct`, e.target.value)}
                        placeholder="%"
                        className="w-full px-2 py-1.5 border-[1.5px] rounded-[4px] text-[11px] text-center outline-none bg-white transition-colors"
                        style={{ borderColor: sc.border }}
                      />
                      {metaNec ? <div className="text-[9px] text-center mt-0.5" style={{ color: sc.text }}>= {metaNec} uds</div> : null}
                    </div>
                    <div>
                      <div className="text-[9px] font-bold tracking-wide uppercase mb-[3px]" style={{ color: sc.text }}>Alcance</div>
                      <input
                        type="number"
                        value={localData[`${tkey}_s${si}_alc`] || ''}
                        onChange={(e) => handleChange(`${tkey}_s${si}_alc`, e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 border-[1.5px] rounded-[4px] text-[11px] text-center outline-none bg-white transition-colors"
                        style={{ borderColor: sc.border }}
                      />
                    </div>
                  </div>
                  {pct !== null && (
                    <div className="mt-1.5">
                      <div className="bg-[rgba(0,0,0,0.1)] rounded-[3px] h-[5px] overflow-hidden">
                        <div className="h-[5px] rounded-[3px] transition-all duration-300" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: sc.border }} />
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] font-bold mt-1 text-right min-h-[15px]" style={{ color: sc.text }}>
                    {falta && falta > 0 ? `Falta: ${falta}` : pct !== null && pct >= 100 ? '✅ Meta lograda' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] p-3.5">
        <div className="text-[10px] font-bold text-[#6B7280] tracking-wide uppercase mb-3">Resumen acumulado</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
          {PROY_TIPOS.map((tipo) => {
            const tkey = tipo.toLowerCase().replace('ó', 'o');
            const metaMes = parseFloat(localData[`${tkey}_meta_mes`]) || 0;
            let totalAlc = 0;
            SEMANAS.forEach((_, si) => {
              totalAlc += parseFloat(localData[`${tkey}_s${si}_alc`]) || 0;
            });
            const pct = metaMes > 0 ? Math.round((totalAlc / metaMes) * 100) : null;
            const sc = semColor(pct);
            const falta = metaMes > 0 ? Math.max(0, metaMes - totalAlc) : null;

            return (
              <div key={tipo} className="border-[1.5px] rounded-[6px] p-3 text-center transition-colors" style={{ backgroundColor: sc.bg, borderColor: sc.border }}>
                <div className="text-[10px] font-bold mb-1" style={{ color: sc.text }}>{tipo}</div>
                <div className="text-[22px] font-black" style={{ color: sc.text }}>{totalAlc}</div>
                <div className="text-[10px]" style={{ color: sc.text }}>de {metaMes || '—'} meta</div>
                {pct !== null && <div className="text-[12px] font-bold mt-1" style={{ color: sc.text }}>{pct}%</div>}
                {falta && falta > 0 ? <div className="text-[10px] font-bold" style={{ color: sc.text }}>Falta: {falta}</div> : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2.5 mt-3.5 items-center flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#E8450A] text-white border-none rounded-[6px] px-5 py-2 text-[11px] font-bold cursor-pointer transition-all hover:brightness-90 disabled:opacity-75 disabled:cursor-wait"
        >
          {saving ? '⏳ Guardando en la nube...' : '💾 Guardar proyección'}
        </button>
        {savedMsg && <span className="text-[11px] text-[#16A34A] font-bold">✓ Guardado en la nube con éxito</span>}
      </div>
    </div>
  );
}
