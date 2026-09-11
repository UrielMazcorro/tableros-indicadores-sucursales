import React from 'react';
import { useStore } from '../store';
import { fmtDate } from '../utils';
import { AGREGADOR_COLORS, PLAN_COLORS } from '../utils/constants';

export function ExAgregadores() {
  const exAgregadores = useStore((state) => state.exAgregadores);

  const totalTP = exAgregadores.filter((e) => e.origen === 'Total Pass').length;
  const totalWH = exAgregadores.filter((e) => e.origen === 'Wellhub').length;

  const planCounts: Record<string, number> = {};
  exAgregadores.forEach((e) => {
    planCounts[e.plan] = (planCounts[e.plan] || 0) + 1;
  });

  const totalMen = (planCounts['Mensual'] || 0) + (planCounts['Reactivación Mensual'] || 0);
  const totalAnu = (planCounts['Anual'] || 0) + (planCounts['Reactivación Anual'] || 0);

  const sorted = [...exAgregadores].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4">
      <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
        <div>
          <div className="text-[12px] font-bold tracking-wide uppercase m-0">🔄 Ex-Agregadores</div>
          <div className="text-[11px] text-[#6B7280] mt-1">Socios que migraron de Total Pass o Wellhub a Station</div>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'exag', id: null } }))}
          className="bg-[#E8450A] text-white border-none rounded-[6px] px-5 py-2 text-[11px] font-bold cursor-pointer transition-all hover:brightness-90"
        >
          ＋ Registrar migración
        </button>
      </div>

      <div className="mb-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 mb-2">
          <div className="bg-[#1A1A1A] rounded-[6px] p-3 text-center">
            <div className="text-[9px] font-bold text-[#999] tracking-wide uppercase mb-1">Total</div>
            <div className="text-[24px] font-black text-white">{exAgregadores.length}</div>
          </div>
          <div className="border-[1.5px] rounded-[6px] p-3 text-center" style={{ backgroundColor: AGREGADOR_COLORS['Total Pass'].bg, borderColor: AGREGADOR_COLORS['Total Pass'].border }}>
            <div className="text-[9px] font-bold tracking-wide uppercase mb-1" style={{ color: AGREGADOR_COLORS['Total Pass'].text }}>Total Pass</div>
            <div className="text-[24px] font-black" style={{ color: AGREGADOR_COLORS['Total Pass'].text }}>{totalTP}</div>
          </div>
          <div className="border-[1.5px] rounded-[6px] p-3 text-center" style={{ backgroundColor: AGREGADOR_COLORS['Wellhub'].bg, borderColor: AGREGADOR_COLORS['Wellhub'].border }}>
            <div className="text-[9px] font-bold tracking-wide uppercase mb-1" style={{ color: AGREGADOR_COLORS['Wellhub'].text }}>Wellhub</div>
            <div className="text-[24px] font-black" style={{ color: AGREGADOR_COLORS['Wellhub'].text }}>{totalWH}</div>
          </div>
        </div>

        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] p-3">
          <div className="text-[10px] font-bold text-[#6B7280] tracking-wide uppercase mb-2.5">Se cambiaron a</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
            <div className="bg-[#DBEAFE] border-[1.5px] border-[#93C5FD] rounded-[6px] p-2.5 text-center">
              <div className="text-[9px] font-bold text-[#1E3A8A] tracking-wide uppercase mb-1">Mensuales</div>
              <div className="text-[20px] font-black text-[#1E3A8A]">{totalMen}</div>
              <div className="text-[9px] text-[#1E3A8A] mt-0.5">{exAgregadores.length > 0 ? Math.round((totalMen / exAgregadores.length) * 100) : 0}%</div>
            </div>
            <div className="bg-[#DCFCE7] border-[1.5px] border-[#86EFAC] rounded-[6px] p-2.5 text-center">
              <div className="text-[9px] font-bold text-[#14532D] tracking-wide uppercase mb-1">Anuales</div>
              <div className="text-[20px] font-black text-[#14532D]">{totalAnu}</div>
              <div className="text-[9px] text-[#14532D] mt-0.5">{exAgregadores.length > 0 ? Math.round((totalAnu / exAgregadores.length) * 100) : 0}%</div>
            </div>
            {Object.entries(planCounts)
              .filter(([p]) => !['Mensual', 'Anual', 'Reactivación Mensual', 'Reactivación Anual'].includes(p))
              .map(([plan, cnt]) => {
                const pc = PLAN_COLORS[plan] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
                return (
                  <div key={plan} className="border-[1.5px] rounded-[6px] p-2.5 text-center" style={{ backgroundColor: pc.bg, borderColor: pc.border }}>
                    <div className="text-[9px] font-bold tracking-wide uppercase mb-1" style={{ color: pc.text }}>{plan}</div>
                    <div className="text-[20px] font-black" style={{ color: pc.text }}>{cnt}</div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {!sorted.length ? (
        <div className="text-center p-[30px] text-[#6B7280] text-[12px]">
          <div className="text-[24px] mb-2 opacity-30">🔄</div>
          Sin migraciones registradas aún.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#1A1A1A]">
                <th className="p-2 text-white text-[9px] font-bold text-left tracking-wide uppercase">Fecha</th>
                <th className="p-2 text-white text-[9px] font-bold text-left tracking-wide uppercase">Nombre</th>
                <th className="p-2 text-white text-[9px] font-bold text-left tracking-wide uppercase">ID Socio</th>
                <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase">Venía de</th>
                <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase">Plan Station</th>
                <th className="p-2 text-white text-[9px] font-bold text-left tracking-wide uppercase">Notas</th>
                <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase">Acción</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e, i) => {
                const ac = AGREGADOR_COLORS[e.origen] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
                const pc = PLAN_COLORS[e.plan] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
                const bg = i % 2 === 0 ? '#fff' : '#F9FAFB';

                return (
                  <tr key={e.id} style={{ backgroundColor: bg }}>
                    <td className="p-2 text-[11px] font-semibold whitespace-nowrap border-b border-[#F3F4F6]">{fmtDate(e.fecha)}</td>
                    <td className="p-2 text-[11px] font-semibold border-b border-[#F3F4F6] min-w-[120px]">{e.nombre}</td>
                    <td className="p-2 text-[11px] text-[#6B7280] border-b border-[#F3F4F6]">{e.idSocio || '—'}</td>
                    <td className="p-2 text-center border-b border-[#F3F4F6]">
                      <span className="border rounded-[4px] px-2 py-0.5 text-[10px] font-bold whitespace-nowrap" style={{ backgroundColor: ac.bg, color: ac.text, borderColor: ac.border }}>
                        {e.origen}
                      </span>
                    </td>
                    <td className="p-2 text-center border-b border-[#F3F4F6]">
                      <span className="border rounded-[4px] px-2 py-0.5 text-[10px] font-bold whitespace-nowrap" style={{ backgroundColor: pc.bg, color: pc.text, borderColor: pc.border }}>
                        {e.plan}
                      </span>
                    </td>
                    <td className="p-2 text-[11px] text-[#6B7280] border-b border-[#F3F4F6]">{e.notas || '—'}</td>
                    <td className="p-2 text-center border-b border-[#F3F4F6]">
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'exag', id: e.id } }))}
                        className="bg-transparent border border-[#E5E7EB] rounded-[4px] px-2 py-0.5 text-[10px] cursor-pointer text-[#6B7280] hover:bg-[#F3F4F6]"
                      >
                        ✏
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
