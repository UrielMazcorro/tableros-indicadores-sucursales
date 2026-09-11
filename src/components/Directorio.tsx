import React from 'react';
import { useStore } from '../store';

export function Directorio() {
  const directorio = useStore((state) => state.directorio);
  const dirCats = useStore((state) => state.dirCats);

  const sorted = [...directorio].sort((a, b) => dirCats.indexOf(a.cat) - dirCats.indexOf(b.cat));

  return (
    <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4">
      <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
        <div className="text-[12px] font-bold tracking-wide uppercase m-0">📋 Directorio operativo</div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'dirCat' } }))}
            className="bg-[#1A1A1A] text-white border-none rounded-[6px] px-3 py-1.5 text-[10px] font-bold cursor-pointer transition-all hover:brightness-90"
          >
            ⚙ Gestionar puestos
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'dir', id: null } }))}
            className="bg-[#E8450A] text-white border-none rounded-[6px] px-3 py-1.5 text-[10px] font-bold cursor-pointer transition-all hover:brightness-90"
          >
            ＋ Agregar contacto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
        {!sorted.length ? (
          <div className="text-[#6B7280] text-[12px] col-span-full py-2">Sin contactos aún. Agrega el primero.</div>
        ) : (
          sorted.map((c) => (
            <div
              key={c.id}
              onClick={() => window.dispatchEvent(new CustomEvent('openModal', { detail: { modal: 'dir', id: c.id } }))}
              className="border-[1.5px] border-[#E5E7EB] rounded-[6px] p-3 cursor-pointer transition-all duration-150 hover:border-[#E8450A] hover:bg-[#FFFAF8]"
            >
              <div className="text-[9px] font-bold text-[#E8450A] tracking-wide uppercase mb-1">{c.cat}</div>
              <div className="text-[13px] font-bold mb-1">{c.name}</div>
              {c.tel && <div className="text-[11px] text-[#6B7280] mb-0.5">📞 {c.tel}</div>}
              {c.email && <div className="text-[11px] text-[#6B7280] mb-0.5">✉️ {c.email}</div>}
              {c.notes && <div className="text-[11px] text-[#6B7280] mb-0.5">💬 {c.notes}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
