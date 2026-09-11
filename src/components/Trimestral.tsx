import React from 'react';
import { useStore } from '../store';
import { monthKey, semColor } from '../utils';
import { TRIMESTRES, PLAN_COLORS } from '../utils/constants';

export function Trimestral() {
  const indicators = useStore((state) => state.indicators);
  const ventas = useStore((state) => state.ventas);

  return (
    <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4">
      <div className="text-[12px] font-bold tracking-wide uppercase mb-1">📊 Datos Trimestrales 2026</div>
      <div className="text-[11px] text-[#6B7280] mb-4">Resumen automático de indicadores y ventas por trimestre. Los datos se calculan de lo registrado en cada mes.</div>

      {TRIMESTRES.map((q) => {
        let totalMensual = 0, totalAnual = 0, totalRen = 0, totalMonto = 0;
        let totalMrrMeta = 0, totalMrrAlc = 0, totalVentaMeta = 0, totalVentaAlc = 0;
        let mesesConDatos = 0;

        q.months.forEach(({ y, m }) => {
          const mk = monthKey(y, m);
          const ind = indicators[mk] || {};
          const mv = ventas.filter((v) => v.fecha && v.fecha.startsWith(mk));

          mv.forEach((v) => {
            totalMonto += parseFloat(v.monto as any) || 0;
            if (v.plan === 'Mensual') totalMensual++;
            else if (v.plan === 'Anual') totalAnual++;
            else if (v.plan === 'Renovación') totalRen++;
          });

          if (ind['mrr_meta']) totalMrrMeta += ind['mrr_meta'];
          if (ind['mrr']) totalMrrAlc += ind['mrr'];
          if (ind['venta_meta']) totalVentaMeta += ind['venta_meta'];
          if (ind['venta']) totalVentaAlc += ind['venta'];

          if (Object.keys(ind).length > 0) mesesConDatos++;
        });

        const mrrPct = totalMrrMeta > 0 ? Math.round((totalMrrAlc / totalMrrMeta) * 100) : null;
        const ventaPct = totalVentaMeta > 0 ? Math.round((totalVentaAlc / totalVentaMeta) * 100) : null;
        const mrrCol = semColor(mrrPct);
        const ventaCol = semColor(ventaPct);

        const totalVentas = totalMensual + totalAnual + totalRen;
        const ticketProm = totalVentas > 0 ? totalMonto / totalVentas : 0;

        return (
          <div key={q.label} className="mb-5">
            <div className="rounded-t-[10px] p-3 px-4 flex items-center justify-between" style={{ backgroundColor: q.color }}>
              <div className="text-[13px] font-bold text-white">{q.label}</div>
              <div className="text-[10px] text-white/70">
                {q.months.map(({ m }) => ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][m]).join(' · ')}
              </div>
            </div>
            
            <div className="border-[1.5px] border-t-0 rounded-b-[10px] p-3.5" style={{ backgroundColor: q.light, borderColor: q.color }}>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
                <div className="bg-white rounded-[6px] p-3 text-center border border-black/5">
                  <div className="text-[9px] font-bold tracking-wide uppercase mb-1" style={{ color: q.color }}>Ingreso total</div>
                  <div className="text-[18px] font-black" style={{ color: q.color }}>${Number(totalMonto.toFixed(0)).toLocaleString()}</div>
                  <div className="text-[10px] text-[#6B7280] mt-0.5">{totalVentas} ventas</div>
                </div>

                <div className="bg-white rounded-[6px] p-3 text-center border border-black/5">
                  <div className="text-[9px] font-bold tracking-wide uppercase mb-1" style={{ color: PLAN_COLORS['Mensual'].text }}>Mensuales</div>
                  <div className="text-[18px] font-black" style={{ color: PLAN_COLORS['Mensual'].text }}>{totalMensual}</div>
                </div>

                <div className="bg-white rounded-[6px] p-3 text-center border border-black/5">
                  <div className="text-[9px] font-bold tracking-wide uppercase mb-1" style={{ color: PLAN_COLORS['Anual'].text }}>Anuales</div>
                  <div className="text-[18px] font-black" style={{ color: PLAN_COLORS['Anual'].text }}>{totalAnual}</div>
                </div>

                <div className="bg-white rounded-[6px] p-3 text-center border border-black/5">
                  <div className="text-[9px] font-bold tracking-wide uppercase mb-1" style={{ color: PLAN_COLORS['Renovación'].text }}>Renovaciones</div>
                  <div className="text-[18px] font-black" style={{ color: PLAN_COLORS['Renovación'].text }}>{totalRen}</div>
                </div>

                <div className="border-[1.5px] rounded-[6px] p-3 text-center" style={{ backgroundColor: mrrCol.bg, borderColor: mrrCol.border }}>
                  <div className="text-[9px] font-bold tracking-wide uppercase mb-1" style={{ color: mrrCol.text }}>MRR acumulado</div>
                  <div className="text-[16px] font-black" style={{ color: mrrCol.text }}>${Number(totalMrrAlc.toFixed(0)).toLocaleString()}</div>
                  <div className="text-[10px]" style={{ color: mrrCol.text }}>Meta: ${Number(totalMrrMeta.toFixed(0)).toLocaleString()}</div>
                  {mrrPct !== null && <div className="text-[11px] font-bold mt-0.5" style={{ color: mrrCol.text }}>{mrrPct}%</div>}
                </div>

                <div className="border-[1.5px] rounded-[6px] p-3 text-center" style={{ backgroundColor: ventaCol.bg, borderColor: ventaCol.border }}>
                  <div className="text-[9px] font-bold tracking-wide uppercase mb-1" style={{ color: ventaCol.text }}>Venta nueva</div>
                  <div className="text-[16px] font-black" style={{ color: ventaCol.text }}>${Number(totalVentaAlc.toFixed(0)).toLocaleString()}</div>
                  <div className="text-[10px]" style={{ color: ventaCol.text }}>Meta: ${Number(totalVentaMeta.toFixed(0)).toLocaleString()}</div>
                  {ventaPct !== null && <div className="text-[11px] font-bold mt-0.5" style={{ color: ventaCol.text }}>{ventaPct}%</div>}
                </div>

                {totalVentas > 0 && (
                  <div className="bg-[#EDE9FE] border-[1.5px] border-[#A78BFA] rounded-[6px] p-3 text-center">
                    <div className="text-[9px] font-bold text-[#4C1D95] tracking-wide uppercase mb-1">Ticket promedio</div>
                    <div className="text-[16px] font-black text-[#4C1D95]">${Number(ticketProm.toFixed(2)).toLocaleString()}</div>
                    <div className="text-[10px] text-[#4C1D95] mt-0.5">{totalVentas} ventas</div>
                  </div>
                )}
              </div>

              {mesesConDatos === 0 && (
                <div className="text-center p-3 text-[11px] text-[#6B7280] mt-2">Sin datos registrados aún para este trimestre.</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
