import React, { useState } from 'react';
import { useStore } from '../store';
import { fmtDate } from '../utils';
import { TK_CAT_COLORS } from '../utils/constants';

export function Tickets() {
  const [filter, setFilter] = useState('todos');
  const tickets = useStore((state) => state.tickets);
  const toggleTicketStatus = useStore((state) => state.toggleTicketStatus);

  const totalAbiertos = tickets.filter(t => t.status === 'Abierto').length;
  const totalCerrados = tickets.filter(t => t.status !== 'Abierto').length;

  let filtered = filter === 'todos' ? tickets : tickets.filter(t => t.cat === filter);
  filtered = [...filtered].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'Abierto' ? -1 : 1;
    return b.fecha.localeCompare(a.fecha);
  });

  return (
    <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4">
      <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
        <div>
          <div className="text-[12px] font-bold tracking-wide uppercase m-0">🔧 Tickets de Sucursal</div>
          <div className="text-[11px] text-[#6B7280] mt-1">Registro de tickets de Mantenimiento, Tecnología y Equipo</div>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'tk', id: null } }))}
          className="bg-[#E8450A] text-white border-none rounded-[6px] px-5 py-2 text-[11px] font-bold cursor-pointer transition-all hover:brightness-90"
        >
          ＋ Nuevo ticket
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 mb-4">
        <div className="bg-[#1A1A1A] rounded-[6px] p-3 text-center">
          <div className="text-[9px] font-bold text-[#999] tracking-wide uppercase mb-1">Total tickets</div>
          <div className="text-[22px] font-black text-white">{tickets.length}</div>
        </div>
        <div className="bg-[#FEE2E2] border-[1.5px] border-[#FCA5A5] rounded-[6px] p-3 text-center">
          <div className="text-[9px] font-bold text-[#7F1D1D] tracking-wide uppercase mb-1">🔴 Abiertos</div>
          <div className="text-[22px] font-black text-[#7F1D1D]">{totalAbiertos}</div>
        </div>
        <div className="bg-[#DCFCE7] border-[1.5px] border-[#86EFAC] rounded-[6px] p-3 text-center">
          <div className="text-[9px] font-bold text-[#14532D] tracking-wide uppercase mb-1">✅ Cerrados</div>
          <div className="text-[22px] font-black text-[#14532D]">{totalCerrados}</div>
        </div>
        {['Mantenimiento', 'Tecnología', 'Equipo'].map(cat => {
          const cc = TK_CAT_COLORS[cat];
          const abiertos = tickets.filter(t => t.cat === cat && t.status === 'Abierto').length;
          const total = tickets.filter(t => t.cat === cat).length;
          return (
            <div key={cat} className="border-[1.5px] rounded-[6px] p-3 text-center" style={{ backgroundColor: cc.bg, borderColor: cc.border }}>
              <div className="text-[9px] font-bold tracking-wide uppercase mb-1" style={{ color: cc.text }}>{cc.ico} {cat}</div>
              <div className="text-[20px] font-black" style={{ color: cc.text }}>{total}</div>
              {abiertos > 0 ? (
                <div className="text-[9px] font-bold text-[#7F1D1D] mt-0.5">{abiertos} abierto{abiertos > 1 ? 's' : ''}</div>
              ) : (
                <div className="text-[9px] text-[#14532D] mt-0.5">✅ Al día</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-1.5 mb-3 flex-wrap">
        <button
          onClick={() => setFilter('todos')}
          className={`px-3.5 py-1.5 rounded-[6px] text-[10px] font-bold cursor-pointer text-white border-none transition-all ${filter === 'todos' ? 'bg-[#E8450A]' : 'bg-[#374151]'}`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('Mantenimiento')}
          className={`px-3.5 py-1.5 rounded-[6px] text-[10px] font-bold cursor-pointer text-white border-none transition-all ${filter === 'Mantenimiento' ? 'bg-[#E8450A]' : 'bg-[#374151]'}`}
        >
          🔨 Mantenimiento
        </button>
        <button
          onClick={() => setFilter('Tecnología')}
          className={`px-3.5 py-1.5 rounded-[6px] text-[10px] font-bold cursor-pointer text-white border-none transition-all ${filter === 'Tecnología' ? 'bg-[#E8450A]' : 'bg-[#374151]'}`}
        >
          💻 Tecnología
        </button>
        <button
          onClick={() => setFilter('Equipo')}
          className={`px-3.5 py-1.5 rounded-[6px] text-[10px] font-bold cursor-pointer text-white border-none transition-all ${filter === 'Equipo' ? 'bg-[#E8450A]' : 'bg-[#374151]'}`}
        >
          🏋️ Equipo
        </button>
      </div>

      {!filtered.length ? (
        <div className="text-center p-[30px] text-[#6B7280] text-[12px]">
          <div className="text-[24px] mb-2 opacity-30">🔧</div>
          Sin tickets registrados. ¡Agrega el primero!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#1A1A1A]">
                <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase whitespace-nowrap">Folio</th>
                <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase">Categoría</th>
                <th className="p-2 text-white text-[9px] font-bold text-left tracking-wide uppercase">Descripción</th>
                <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase">Estatus</th>
                <th className="p-2 text-white text-[9px] font-bold text-left tracking-wide uppercase">Comentarios</th>
                <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase whitespace-nowrap">Fecha</th>
                <th className="p-2 text-white text-[9px] font-bold text-left tracking-wide uppercase">Quién subió</th>
                <th className="p-2 text-white text-[9px] font-bold text-center tracking-wide uppercase">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const cc = TK_CAT_COLORS[t.cat] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB', ico: '📌' };
                const isOpen = t.status === 'Abierto';
                const bg = i % 2 === 0 ? '#fff' : '#F9FAFB';

                return (
                  <tr key={t.id} style={{ backgroundColor: bg }}>
                    <td className="p-2 text-center text-[11px] font-bold text-[#6B7280] whitespace-nowrap border-b border-[#F3F4F6]">{t.folio || '—'}</td>
                    <td className="p-2 text-center border-b border-[#F3F4F6]">
                      <span className="border rounded-[4px] px-2 py-0.5 text-[10px] font-bold whitespace-nowrap" style={{ backgroundColor: cc.bg, color: cc.text, borderColor: cc.border }}>
                        {cc.ico} {t.cat}
                      </span>
                    </td>
                    <td className="p-2 text-[11px] max-w-[200px] border-b border-[#F3F4F6]">{t.desc || '—'}</td>
                    <td className="p-2 text-center border-b border-[#F3F4F6]">
                      <button
                        onClick={() => toggleTicketStatus(t.id)}
                        className={`border rounded-[4px] px-2 py-0.5 text-[10px] font-bold whitespace-nowrap cursor-pointer ${isOpen ? 'bg-[#FEE2E2] text-[#7F1D1D] border-[#FCA5A5]' : 'bg-[#DCFCE7] text-[#14532D] border-[#86EFAC]'}`}
                      >
                        {isOpen ? '🔴 Abierto' : '✅ Cerrado'}
                      </button>
                    </td>
                    <td className="p-2 text-[11px] text-[#6B7280] max-w-[180px] border-b border-[#F3F4F6]">{t.comentarios || '—'}</td>
                    <td className="p-2 text-center text-[11px] whitespace-nowrap border-b border-[#F3F4F6]">{fmtDate(t.fecha)}</td>
                    <td className="p-2 text-[11px] border-b border-[#F3F4F6]">{t.quien || '—'}</td>
                    <td className="p-2 text-center border-b border-[#F3F4F6]">
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'tk', id: t.id } }))}
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
