import React, { useState } from 'react';
import { useStore, saveActiveTableroToCloud } from '../store';
import { MonthNav } from './MonthNav';
import { monthKey, getToday, fmtMoney, fmtDate, dateKey, daysBetween } from '../utils';
import { PLAN_COLORS } from '../utils/constants';
import { Venta } from '../types';

const SPV_HITOS_MENSUAL_ANUAL = [
  { dia: 1, mensaje: '¡Hola {nombre}! Bienvenido(a) a Station, qué gusto tenerte con nosotros 🎉 Recuerda que estamos para acompañarte en este proceso.' },
  { dia: 4, mensaje: 'Hola {nombre}, ¿cómo vas con tu rutina? Cuéntanos si necesitas ajustar algo 💪' },
  { dia: 10, mensaje: '{nombre}, cuéntame, ¿cómo te has sentido con nosotros hasta ahora?' },
  { dia: 20, mensaje: '{nombre}, ¿cómo van tus resultados? Cuéntanos qué te gustaría mejorar 💪' },
  { dia: 30, mensaje: '¡Felicidades {nombre}! Cumpliste tu primer mes con nosotros, ¿cómo ha sido tu experiencia? 🎉' },
];

const SPV_HITOS_RENOVACION = [
  { dia: 1, mensaje: 'Gracias por renovar tu membresía con nosotros, {nombre}. Recuerda que estamos para acompañarte.' },
  { dia: 10, mensaje: '{nombre}, ¿cómo vas con tu entrenamiento? ¿Ya conoces nuestras clases?' },
  { dia: 20, mensaje: '{nombre}, quiero escucharte, dime cómo podemos mejorar para ti.' },
  { dia: 30, mensaje: 'Gracias por permanecer en Station, {nombre}.' },
];

const SPV_PLANES_MENSUAL_ANUAL = ['Mensual', 'Anual', 'Reactivación Mensual', 'Reactivación Anual'];
const SPV_PLANES_RENOVACION = ['Renovación'];
const RUT_PLANES = ['Mensual', 'Anual', 'Reactivación Mensual', 'Reactivación Anual'];

export function RegistroVenta() {
  const [date, setDate] = useState(() => getToday());
  const [spvFilter, setSPVFilter] = useState<'pendientes' | 'todos'>('pendientes');

  const month = date.getMonth();
  const year = date.getFullYear();
  const mk = monthKey(year, month);
  
  const ventas = useStore((state) => state.ventas);
  const updateVenta = useStore((state) => state.updateVenta);
  const spvStatuses = useStore((state) => state.spvStatuses);
  const toggleSPVStatus = useStore((state) => state.toggleSPVStatus);

  const monthVentas = ventas
    .filter((v) => v.fecha && v.fecha.startsWith(mk))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  let totalMonto = 0;
  const planCounts: Record<string, number> = {};
  let firmasSi = 0, firmasNo = 0, domSi = 0, domNo = 0, domNA = 0;

  monthVentas.forEach((v) => {
    totalMonto += parseFloat(v.monto as any) || 0;
    planCounts[v.plan] = (planCounts[v.plan] || 0) + 1;
    if (v.firma === 'Sí') firmasSi++;
    else if (v.firma === 'No') firmasNo++;
    if (v.dom === 'Sí') domSi++;
    else if (v.dom === 'No') domNo++;
    else if (v.dom === 'No aplica') domNA++;
  });

  // --- SEGUIMIENTO POST-VENTA LOGIC ---
  const todayKey = dateKey(getToday());
  const allSPVAlerts: Array<{
    id: string;
    ventaId: string;
    nombre: string;
    idSocio: string;
    plan: string;
    dia: number;
    mensaje: string;
    fechaVenta: string;
    diasTranscurridos: number;
    status: string;
  }> = [];

  ventas.forEach((v) => {
    if (!v.fecha) return;
    let hitos = null;
    if (SPV_PLANES_MENSUAL_ANUAL.includes(v.plan)) hitos = SPV_HITOS_MENSUAL_ANUAL;
    else if (SPV_PLANES_RENOVACION.includes(v.plan)) hitos = SPV_HITOS_RENOVACION;
    if (!hitos) return;

    const dias = daysBetween(v.fecha, todayKey);
    hitos.forEach((h) => {
      if (dias >= h.dia) {
        const alertId = `spv-${v.id}-${h.dia}`;
        const primerNombre = (v.nombre || '').trim().split(' ')[0] || v.nombre;
        allSPVAlerts.push({
          id: alertId,
          ventaId: v.id,
          nombre: v.nombre,
          idSocio: v.idSocio,
          plan: v.plan,
          dia: h.dia,
          mensaje: h.mensaje.replace(/\{nombre\}/g, primerNombre),
          fechaVenta: v.fecha,
          diasTranscurridos: dias,
          status: spvStatuses[alertId] || 'pendiente',
        });
      }
    });
  });

  allSPVAlerts.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pendiente' ? -1 : 1;
    return b.diasTranscurridos - a.diasTranscurridos;
  });

  const spvPendientes = allSPVAlerts.filter((a) => a.status === 'pendiente');
  const spvRealizadas = allSPVAlerts.filter((a) => a.status === 'realizado');
  const spvToShow = spvFilter === 'pendientes' ? spvPendientes : allSPVAlerts;

  const handleToggleSPV = async (alertId: string) => {
    toggleSPVStatus(alertId);
    try {
      await saveActiveTableroToCloud();
    } catch (e) {
      console.error(e);
    }
  };

  // --- RUTINAS LOGIC ---
  const rutMonthVentas = monthVentas.filter((v) => RUT_PLANES.includes(v.plan));
  const coachCounts: Record<string, number> = {};
  let sinAsignarCount = 0;

  rutMonthVentas.forEach((v) => {
    const requiere = v.requiereRutina !== false;
    if (!requiere) return;
    if (v.rutinaAsignada && v.rutinaCoach && v.rutinaCoach.trim()) {
      const c = v.rutinaCoach.trim();
      coachCounts[c] = (coachCounts[c] || 0) + 1;
    } else if (!v.rutinaAsignada) {
      sinAsignarCount++;
    }
  });

  const coachEntries = Object.entries(coachCounts).sort((a, b) => b[1] - a[1]);

  const handleToggleRequiere = async (v: Venta) => {
    const current = v.requiereRutina !== false;
    updateVenta(v.id, { ...v, requiereRutina: !current });
    try {
      await saveActiveTableroToCloud();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAsignada = async (v: Venta) => {
    updateVenta(v.id, { ...v, rutinaAsignada: !v.rutinaAsignada });
    try {
      await saveActiveTableroToCloud();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCoach = async (v: Venta, coach: string) => {
    const trimmed = coach.trim();
    updateVenta(v.id, {
      ...v,
      rutinaCoach: trimmed,
      rutinaAsignada: trimmed ? true : v.rutinaAsignada,
    });
    try {
      await saveActiveTableroToCloud();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* CARD 1: REGISTRO DE VENTA */}
      <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4">
        <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
          <div className="text-[12px] font-bold tracking-wide uppercase m-0">💰 Registro de Venta</div>
          <MonthNav year={year} month={month} onChange={(dir) => { const nd = new Date(date); nd.setMonth(nd.getMonth() + dir); setDate(nd); }} />
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'reg', id: null, currentMonthDate: new Date(year, month, getToday().getDate()) } }))}
            className="bg-[#E8450A] text-white border-none rounded-[6px] px-5 py-2 text-[11px] font-bold cursor-pointer transition-all hover:brightness-90"
          >
            ＋ Registrar venta
          </button>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2 mb-2.5">
          <div className="bg-[#1A1A1A] rounded-[6px] p-3 text-center">
            <div className="text-[9px] font-bold text-[#999] tracking-wide uppercase mb-1">Total del mes</div>
            <div className="text-[20px] font-black text-white">${fmtMoney(totalMonto)}</div>
            <div className="text-[10px] text-[#888] mt-0.5">{monthVentas.length} ventas</div>
          </div>
          {Object.entries(planCounts).map(([plan, cnt]) => {
            const pc = PLAN_COLORS[plan] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
            return (
              <div key={plan} className="border-[1.5px] rounded-[6px] p-2.5 text-center" style={{ backgroundColor: pc.bg, borderColor: pc.border }}>
                <div className="text-[9px] font-bold tracking-wide uppercase mb-[3px]" style={{ color: pc.text }}>{plan}</div>
                <div className="text-[20px] font-black" style={{ color: pc.text }}>{cnt}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          <div className="bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[6px] p-3">
            <div className="text-[10px] font-bold text-[#6B7280] tracking-wide uppercase mb-2">📋 Firma de contrato</div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 bg-[#DCFCE7] border border-[#86EFAC] rounded-[5px] px-3 py-1.5 text-center">
                <div className="text-[16px] font-black text-[#14532D]">{firmasSi}</div>
                <div className="text-[9px] font-bold text-[#14532D]">Con firma</div>
              </div>
              <div className={`flex-1 border rounded-[5px] px-3 py-1.5 text-center ${firmasNo > 0 ? 'bg-[#FEE2E2] border-[#FCA5A5]' : 'bg-[#F9FAFB] border-[#E5E7EB]'}`}>
                <div className={`text-[16px] font-black ${firmasNo > 0 ? 'text-[#7F1D1D]' : 'text-[#6B7280]'}`}>{firmasNo}</div>
                <div className={`text-[9px] font-bold ${firmasNo > 0 ? 'text-[#7F1D1D]' : 'text-[#6B7280]'}`}>Pendientes</div>
              </div>
            </div>
            {firmasNo > 0 ? (
              <div className="mt-2 text-[11px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2.5 py-1.5 rounded-[4px]">
                ⚠️ {firmasNo} contrato{firmasNo > 1 ? 's' : ''} sin firma
              </div>
            ) : (
              <div className="mt-2 text-[11px] font-bold text-[#16A34A]">✅ Todos los contratos firmados</div>
            )}
          </div>
          
          <div className="bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[6px] p-3">
            <div className="text-[10px] font-bold text-[#6B7280] tracking-wide uppercase mb-2">🔄 Tarjeta domiciliada</div>
            <div className="flex gap-1.5 flex-wrap">
              <div className="flex-1 bg-[#DCFCE7] border border-[#86EFAC] rounded-[5px] px-2.5 py-1.5 text-center">
                <div className="text-[16px] font-black text-[#14532D]">{domSi}</div>
                <div className="text-[9px] font-bold text-[#14532D]">Domiciliadas</div>
              </div>
              <div className={`flex-1 border rounded-[5px] px-2.5 py-1.5 text-center ${domNo > 0 ? 'bg-[#FEE2E2] border-[#FCA5A5]' : 'bg-[#F9FAFB] border-[#E5E7EB]'}`}>
                <div className={`text-[16px] font-black ${domNo > 0 ? 'text-[#7F1D1D]' : 'text-[#6B7280]'}`}>{domNo}</div>
                <div className={`text-[9px] font-bold ${domNo > 0 ? 'text-[#7F1D1D]' : 'text-[#6B7280]'}`}>Pendientes</div>
              </div>
              <div className="flex-1 bg-[#F3F4F6] border border-[#E5E7EB] rounded-[5px] px-2.5 py-1.5 text-center">
                <div className="text-[16px] font-black text-[#6B7280]">{domNA}</div>
                <div className="text-[9px] font-bold text-[#6B7280]">N/A</div>
              </div>
            </div>
            {domNo > 0 ? (
              <div className="mt-2 text-[11px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2.5 py-1.5 rounded-[4px]">
                ⚠️ {domNo} tarjeta{domNo > 1 ? 's' : ''} sin domiciliar
              </div>
            ) : (
              <div className="mt-2 text-[11px] font-bold text-[#16A34A]">✅ Sin pendientes de domiciliación</div>
            )}
          </div>
        </div>

        {!monthVentas.length ? (
          <div className="text-center p-[30px] text-[#6B7280] text-[12px]">
            <div className="text-[24px] mb-2 opacity-30">💰</div>
            Sin ventas registradas este mes. ¡Registra la primera!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#1A1A1A]">
                  <th className="p-2 text-white text-[9px] font-bold text-left tracking-wide uppercase whitespace-nowrap">Fecha</th>
                  <th className="p-2 text-white text-[9px] font-bold text-left tracking-wide uppercase">Nombre completo</th>
                  <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase">ID</th>
                  <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase">Plan</th>
                  <th className="p-2 text-white text-[9px] font-bold text-right tracking-wide uppercase">Monto</th>
                  <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase hidden md:table-cell">Medio de pago</th>
                  <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase">Firma</th>
                  <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase">Dom.</th>
                  <th className="p-2 text-white text-[9px] font-bold text-left tracking-wide uppercase hidden sm:table-cell">Quién vendió</th>
                  <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase">Acción</th>
                </tr>
              </thead>
              <tbody>
                {monthVentas.map((v, i) => {
                  const pc = PLAN_COLORS[v.plan] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
                  const bg = i % 2 === 0 ? '#fff' : '#F9FAFB';
                  return (
                    <tr key={v.id} style={{ backgroundColor: bg }}>
                      <td className="p-2 text-[11px] whitespace-nowrap font-semibold border-b border-[#F3F4F6]">{fmtDate(v.fecha)}</td>
                      <td className="p-2 text-[11px] font-semibold border-b border-[#F3F4F6] min-w-[120px]">{v.nombre}</td>
                      <td className="p-2 text-center text-[11px] text-[#6B7280] border-b border-[#F3F4F6]">{v.idSocio || '—'}</td>
                      <td className="p-2 text-center border-b border-[#F3F4F6]">
                        <span className="border rounded-[4px] px-2 py-0.5 text-[10px] font-bold whitespace-nowrap" style={{ backgroundColor: pc.bg, color: pc.text, borderColor: pc.border }}>
                          {v.plan}
                        </span>
                      </td>
                      <td className="p-2 text-right text-[11px] font-bold text-[#16A34A] border-b border-[#F3F4F6]">${fmtMoney(v.monto)}</td>
                      <td className="p-2 text-center text-[11px] text-[#6B7280] border-b border-[#F3F4F6] hidden md:table-cell">{v.medio || '—'}</td>
                      <td className="p-2 text-center border-b border-[#F3F4F6]">
                        {v.firma === 'Sí' ? <span className="text-[#16A34A] font-bold text-[13px]">✓</span> : v.firma === 'No' ? <span className="text-[#DC2626] text-[11px]">✕</span> : <span className="text-[#6B7280] text-[10px]">—</span>}
                      </td>
                      <td className="p-2 text-center border-b border-[#F3F4F6]">
                        {v.dom === 'Sí' ? <span className="text-[#16A34A] font-bold text-[13px]">✓</span> : v.dom === 'No' ? <span className="text-[#DC2626] text-[11px]">✕</span> : <span className="text-[#6B7280] text-[10px]">—</span>}
                      </td>
                      <td className="p-2 text-[11px] border-b border-[#F3F4F6] hidden sm:table-cell">{v.vendedor || '—'}</td>
                      <td className="p-2 text-center border-b border-[#F3F4F6]">
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'reg', id: v.id } }))}
                          className="bg-transparent border border-[#E5E7EB] rounded-[4px] px-2 py-0.5 text-[10px] cursor-pointer text-[#6B7280] hover:bg-[#F3F4F6]"
                        >
                          ✏
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-[#1A1A1A]">
                  <td colSpan={4} className="p-2.5 text-[11px] font-bold text-white text-right hidden sm:table-cell">TOTAL DEL MES</td>
                  <td className="p-2.5 text-right text-[14px] font-black text-[#E8450A]">${fmtMoney(totalMonto)}</td>
                  <td colSpan={5} className="p-2.5 text-[10px] text-[#999] text-center hidden md:table-cell">{monthVentas.length} ventas registradas</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CARD 2: SEGUIMIENTO POST-VENTA */}
      <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="text-[12px] font-bold tracking-wide uppercase m-0">🔔 Seguimiento post-venta</div>
            <div className="text-[11px] text-[#6B7280] mt-1">Alertas automáticas de contacto según los días desde la inscripción</div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSPVFilter('pendientes')}
              className={`px-3.5 py-1.5 rounded-[6px] text-[10px] font-bold cursor-pointer transition-all border-none ${spvFilter === 'pendientes' ? 'bg-[#E8450A] text-white' : 'bg-[#6B7280] text-white'}`}
            >
              🔔 Pendientes
            </button>
            <button
              onClick={() => setSPVFilter('todos')}
              className={`px-3.5 py-1.5 rounded-[6px] text-[10px] font-bold cursor-pointer transition-all border-none ${spvFilter === 'todos' ? 'bg-[#E8450A] text-white' : 'bg-[#6B7280] text-white'}`}
            >
              Todos
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-3 flex-wrap">
          <div className={`flex-1 min-w-[100px] border-[1.5px] rounded-[6px] p-2.5 text-center ${spvPendientes.length > 0 ? 'bg-[#FEE2E2] border-[#FCA5A5]' : 'bg-[#DCFCE7] border-[#86EFAC]'}`}>
            <div className={`text-[20px] font-black ${spvPendientes.length > 0 ? 'text-[#7F1D1D]' : 'text-[#14532D]'}`}>{spvPendientes.length}</div>
            <div className={`text-[9px] font-bold uppercase tracking-wide ${spvPendientes.length > 0 ? 'text-[#7F1D1D]' : 'text-[#14532D]'}`}>Pendientes</div>
          </div>
          <div className="flex-1 min-w-[100px] bg-[#DCFCE7] border-[1.5px] border-[#86EFAC] rounded-[6px] p-2.5 text-center">
            <div className="text-[20px] font-black text-[#14532D]">{spvRealizadas.length}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-[#14532D]">Realizadas</div>
          </div>
        </div>

        {!spvToShow.length ? (
          <div className="text-center p-6 text-[#6B7280] text-[12px]">
            <div className="text-[22px] mb-1.5 opacity-30">🔔</div>
            No hay alertas de seguimiento por ahora.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {spvToShow.map((a) => {
              const isPend = a.status === 'pendiente';
              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between gap-2.5 p-2.5 border-[1.5px] rounded-[6px] flex-wrap ${isPend ? 'bg-[#FFF8F0] border-[#FDBA74]' : 'bg-[#F9FAFB] border-[#E5E7EB]'}`}
                >
                  <div className="flex-1 min-w-[180px]">
                    <div className="text-[12px] font-bold">
                      {a.nombre} <span className="font-medium text-[#6B7280] text-[10px]">({a.plan})</span>
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5">Día {a.dia} — {a.mensaje}</div>
                    <div className="text-[9px] text-[#6B7280] mt-0.5">Inscrito el {fmtDate(a.fechaVenta)} · {a.diasTranscurridos} días</div>
                  </div>
                  <button
                    onClick={() => handleToggleSPV(a.id)}
                    className={`border-[1.5px] rounded-[5px] px-3.5 py-1.5 text-[10px] font-bold cursor-pointer whitespace-nowrap ${isPend ? 'bg-[#FEF9C3] text-[#713F12] border-[#FCD34D]' : 'bg-[#DCFCE7] text-[#14532D] border-[#86EFAC]'}`}
                  >
                    {isPend ? '⏳ Pendiente' : '✅ Realizado'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CARD 3: RUTINAS DE ENTRENAMIENTO */}
      <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4">
        <div className="text-[12px] font-bold tracking-wide uppercase m-0">🏋️ Rutinas de Entrenamiento</div>
        <div className="text-[11px] text-[#6B7280] mt-1 mb-3.5">
          Socios con plan nuevo o reactivación (mensual/anual) del mes en curso — asignación de rutina y coach responsable
        </div>

        {rutMonthVentas.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {coachEntries.map(([coach, cnt]) => (
              <div key={coach} className="bg-[#DBEAFE] border-[1.5px] border-[#93C5FD] rounded-[6px] p-2.5 text-center min-w-[100px]">
                <div className="text-[18px] font-black text-[#1E3A8A]">{cnt}</div>
                <div className="text-[9px] font-bold text-[#1E3A8A] tracking-wide">{coach}</div>
              </div>
            ))}
            <div className={`border-[1.5px] rounded-[6px] p-2.5 text-center min-w-[100px] ${sinAsignarCount > 0 ? 'bg-[#FEE2E2] border-[#FCA5A5]' : 'bg-[#DCFCE7] border-[#86EFAC]'}`}>
              <div className={`text-[18px] font-black ${sinAsignarCount > 0 ? 'text-[#7F1D1D]' : 'text-[#14532D]'}`}>{sinAsignarCount}</div>
              <div className={`text-[9px] font-bold tracking-wide ${sinAsignarCount > 0 ? 'text-[#7F1D1D]' : 'text-[#14532D]'}`}>Sin asignar</div>
            </div>
          </div>
        )}

        {!rutMonthVentas.length ? (
          <div className="text-center p-6 text-[#6B7280] text-[12px]">
            <div className="text-[22px] mb-1.5 opacity-30">🏋️</div>
            Sin socios de plan nuevo o reactivación este mes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#1A1A1A]">
                  <th className="p-2 text-white text-[9px] font-bold text-left tracking-wide uppercase whitespace-nowrap">Fecha</th>
                  <th className="p-2 text-white text-[9px] font-bold text-left tracking-wide uppercase">Nombre</th>
                  <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase">Plan</th>
                  <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase">¿Requiere rutina?</th>
                  <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase">¿Rutina asignada?</th>
                  <th className="p-2 text-white text-[9px] font-bold text-left tracking-wide uppercase">Coach</th>
                </tr>
              </thead>
              <tbody>
                {rutMonthVentas.map((v, i) => {
                  const pc = PLAN_COLORS[v.plan] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
                  const bg = i % 2 === 0 ? '#fff' : '#F9FAFB';
                  const asignada = !!v.rutinaAsignada;
                  const requiere = v.requiereRutina !== false;

                  return (
                    <tr key={v.id} style={{ backgroundColor: bg }}>
                      <td className="p-2 text-[11px] font-semibold whitespace-nowrap border-b border-[#F3F4F6]">{fmtDate(v.fecha)}</td>
                      <td className="p-2 text-[11px] font-semibold border-b border-[#F3F4F6]">{v.nombre}</td>
                      <td className="p-2 text-center border-b border-[#F3F4F6]">
                        <span className="border rounded-[4px] px-2 py-0.5 text-[10px] font-bold whitespace-nowrap" style={{ backgroundColor: pc.bg, color: pc.text, borderColor: pc.border }}>
                          {v.plan}
                        </span>
                      </td>
                      <td className="p-2 text-center border-b border-[#F3F4F6]">
                        <button
                          onClick={() => handleToggleRequiere(v)}
                          className={`border rounded-[4px] px-2.5 py-1 text-[10px] font-bold whitespace-nowrap cursor-pointer ${requiere ? 'bg-[#DBEAFE] text-[#1E3A8A] border-[#93C5FD]' : 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]'}`}
                        >
                          {requiere ? '✅ Sí' : '❌ No'}
                        </button>
                      </td>
                      <td className="p-2 text-center border-b border-[#F3F4F6]">
                        {requiere ? (
                          <button
                            onClick={() => handleToggleAsignada(v)}
                            className={`border rounded-[4px] px-2.5 py-1 text-[10px] font-bold whitespace-nowrap cursor-pointer ${asignada ? 'bg-[#DCFCE7] text-[#14532D] border-[#86EFAC]' : 'bg-[#FEE2E2] text-[#7F1D1D] border-[#FCA5A5]'}`}
                          >
                            {asignada ? '✅ Sí' : '❌ No'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#6B7280]">— N/A</span>
                        )}
                      </td>
                      <td className="p-2 border-b border-[#F3F4F6]">
                        {requiere ? (
                          <input
                            type="text"
                            defaultValue={v.rutinaCoach || ''}
                            placeholder="Nombre del coach"
                            onBlur={(e) => handleSaveCoach(v, e.target.value)}
                            className="w-full p-1.5 border-[1.5px] border-[#E5E7EB] rounded-[4px] text-[11px] outline-none focus:border-[#E8450A]"
                          />
                        ) : (
                          <span className="text-[10px] text-[#6B7280]">—</span>
                        )}
                      </td>
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
