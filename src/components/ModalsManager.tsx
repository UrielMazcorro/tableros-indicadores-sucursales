import React, { useState, useEffect } from 'react';
import { useStore, saveActiveTableroToCloud } from '../store';
import { getToday, uid, dateKey } from '../utils';

// Modal component wrapper
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/45 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[10px] p-5 w-full max-w-[500px] max-h-[90vh] overflow-y-auto relative shadow-xl">
        <button onClick={onClose} className="absolute top-3.5 right-3.5 bg-transparent border-none text-[15px] cursor-pointer text-[#6B7280] font-bold">✕</button>
        <h3 className="text-[14px] font-bold mb-3.5 pr-[22px]">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function ModalsManager() {
  const [modalState, setModalState] = useState<{ modal: string | null; id?: string | null; prefillDate?: string | null; type?: 'ls' | 'ca' }>({ modal: null });
  
  const close = () => setModalState({ modal: null });

  useEffect(() => {
    const handleOpenModal = (e: CustomEvent) => setModalState(e.detail);
    const handleOpenBitacora = (e: CustomEvent) => setModalState({ modal: 'bit', type: e.detail });
    
    window.addEventListener('openModal', handleOpenModal as EventListener);
    window.addEventListener('openBitacora', handleOpenBitacora as EventListener);
    return () => {
      window.removeEventListener('openModal', handleOpenModal as EventListener);
      window.removeEventListener('openBitacora', handleOpenBitacora as EventListener);
    };
  }, []);

  return (
    <>
      <RegModal isOpen={modalState.modal === 'reg'} onClose={close} editId={modalState.id} currentMonthDate={modalState.prefillDate as unknown as Date} />
      <TicketModal isOpen={modalState.modal === 'tk'} onClose={close} editId={modalState.id} />
      <ExAgModal isOpen={modalState.modal === 'exag'} onClose={close} editId={modalState.id} />
      <BitacoraModal isOpen={modalState.modal === 'bit'} onClose={close} type={modalState.type || 'ls'} />
      <CalModal isOpen={modalState.modal === 'cal'} onClose={close} editId={modalState.id} prefillDate={modalState.prefillDate} />
      <DirModal isOpen={modalState.modal === 'dir'} onClose={close} editId={modalState.id} />
      <DirCatModal isOpen={modalState.modal === 'dirCat'} onClose={close} />
    </>
  );
}

function Input({ label, ...props }: any) {
  return (
    <div className="mb-2.5">
      <label className="text-[10px] font-bold text-[#6B7280] tracking-wide uppercase block mb-1">{label}</label>
      <input className="w-full p-2 border-[1.5px] border-[#E5E7EB] rounded-[6px] text-[12px] outline-none focus:border-[#E8450A]" {...props} />
    </div>
  );
}
function Select({ label, children, ...props }: any) {
  return (
    <div className="mb-2.5">
      <label className="text-[10px] font-bold text-[#6B7280] tracking-wide uppercase block mb-1">{label}</label>
      <select className="w-full p-2 border-[1.5px] border-[#E5E7EB] rounded-[6px] text-[12px] outline-none focus:border-[#E8450A]" {...props}>
        {children}
      </select>
    </div>
  );
}
function Textarea({ label, ...props }: any) {
  return (
    <div className="mb-2.5">
      <label className="text-[10px] font-bold text-[#6B7280] tracking-wide uppercase block mb-1">{label}</label>
      <textarea className="w-full p-2 border-[1.5px] border-[#E5E7EB] rounded-[6px] text-[12px] outline-none focus:border-[#E8450A] min-h-[60px]" {...props} />
    </div>
  );
}

// -------------------------------------------------------------
// BITACORA MODAL
// -------------------------------------------------------------
function BitacoraModal({ isOpen, onClose, type }: { isOpen: boolean; onClose: () => void; type: 'ls' | 'ca' }) {
  const [turno, setTurno] = useState('Matutino');
  const [nota, setNota] = useState('');
  const [prio, setPrio] = useState('normal');
  const addBitacora = useStore(state => state.addBitacora);

  useEffect(() => { if (isOpen) { setTurno('Matutino'); setNota(''); setPrio('normal'); } }, [isOpen]);

  const save = async () => {
    if (!nota.trim()) return alert('Escribe una nota.');
    addBitacora(type, {
      id: uid(),
      date: dateKey(getToday()),
      time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      turno, nota, prio
    });
    try {
      await saveActiveTableroToCloud();
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Agregar nota — ${type === 'ls' ? 'Líder de Sucursal' : 'Club Assistance'}`}>
      <Select label="Turno" value={turno} onChange={(e: any) => setTurno(e.target.value)}>
        <option>Matutino</option><option>Vespertino</option><option>Nocturno</option>
      </Select>
      <Textarea label="Nota / pendiente" placeholder="Describe el pendiente o nota del turno..." value={nota} onChange={(e: any) => setNota(e.target.value)} />
      <Select label="Prioridad" value={prio} onChange={(e: any) => setPrio(e.target.value)}>
        <option value="normal">Normal</option>
        <option value="urgente">🔴 Urgente</option>
        <option value="info">ℹ️ Informativo</option>
        <option value="seguimiento">🔔 Favor de dar seguimiento</option>
      </Select>
      <div className="flex gap-2 mt-3.5">
        <button onClick={onClose} className="bg-transparent text-[#6B7280] border-[1.5px] border-[#E5E7EB] rounded-[6px] px-4 py-2 text-[11px] font-bold w-1/2">Cancelar</button>
        <button onClick={save} className="bg-[#E8450A] text-white border-none rounded-[6px] px-4 py-2 text-[11px] font-bold w-1/2">Guardar</button>
      </div>
    </Modal>
  );
}

// -------------------------------------------------------------
// REGISTRO MODAL
// -------------------------------------------------------------
function RegModal({ isOpen, onClose, editId, currentMonthDate }: { isOpen: boolean; onClose: () => void; editId?: string | null; currentMonthDate?: Date }) {
  const ventas = useStore(state => state.ventas);
  const addVenta = useStore(state => state.addVenta);
  const updateVenta = useStore(state => state.updateVenta);
  const deleteVenta = useStore(state => state.deleteVenta);

  const [formData, setFormData] = useState({
    fecha: '', nombre: '', idSocio: '', plan: 'Mensual', monto: '', medio: 'Terminal', firma: '', dom: '', vendedor: '', notas: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (editId) {
        const v = ventas.find(x => x.id === editId);
        if (v) setFormData({ ...v, monto: String(v.monto) });
      } else {
        const d = currentMonthDate || getToday();
        setFormData({ fecha: dateKey(d), nombre: '', idSocio: '', plan: 'Mensual', monto: '', medio: 'Terminal', firma: '', dom: '', vendedor: '', notas: '' });
      }
    }
  }, [isOpen, editId, currentMonthDate, ventas]);

  const save = async () => {
    if (!formData.nombre.trim() || !formData.fecha) return alert('Completa la fecha y el nombre del socio.');
    const data = { ...formData, monto: parseFloat(formData.monto) || 0, id: editId || uid() };
    if (editId) updateVenta(editId, data);
    else addVenta(data);
    try {
      await saveActiveTableroToCloud();
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editId ? 'Editar venta' : 'Registrar venta'}>
      <Input label="Fecha" type="date" value={formData.fecha} onChange={(e: any) => setFormData(f => ({ ...f, fecha: e.target.value }))} />
      <Input label="Nombre completo del socio" placeholder="Ej. Juan García López" value={formData.nombre} onChange={(e: any) => setFormData(f => ({ ...f, nombre: e.target.value }))} />
      <Input label="ID del socio" placeholder="Ej. 123456" value={formData.idSocio} onChange={(e: any) => setFormData(f => ({ ...f, idSocio: e.target.value }))} />
      <Select label="Plan contratado" value={formData.plan} onChange={(e: any) => setFormData(f => ({ ...f, plan: e.target.value }))}>
        <option>Mensual</option><option>Anual</option><option>Renovación</option><option>Reactivación Mensual</option><option>Reactivación Anual</option><option>Upgrade</option><option>Day Pass</option><option>Week Pass</option>
      </Select>
      <Input label="Monto pagado ($)" type="number" step="0.01" placeholder="0.00" value={formData.monto} onChange={(e: any) => setFormData(f => ({ ...f, monto: e.target.value }))} />
      <Select label="Medio de pago" value={formData.medio} onChange={(e: any) => setFormData(f => ({ ...f, medio: e.target.value }))}>
        <option value="Terminal">💳 Terminal</option><option value="Pin Pad">📟 Pin Pad</option><option value="Link de pago">🔗 Link de pago</option><option value="Transferencia">📲 Transferencia</option><option value="Automático Evo">🔄 Automático Evo</option>
      </Select>
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <div>
          <label className="text-[10px] font-bold text-[#6B7280] tracking-wide uppercase block mb-1">Firma de contrato</label>
          <div className="flex gap-2">
            <label className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-[5px] border-[1.5px] cursor-pointer text-[12px] font-bold ${formData.firma === 'Sí' ? 'border-[#E8450A] bg-[#FFF8F5]' : 'border-[#E5E7EB] bg-white'}`}>
              <input type="radio" name="firma" className="hidden" checked={formData.firma === 'Sí'} onChange={() => setFormData(f => ({ ...f, firma: 'Sí' }))} /> Sí
            </label>
            <label className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-[5px] border-[1.5px] cursor-pointer text-[12px] font-bold ${formData.firma === 'No' ? 'border-[#E8450A] bg-[#FFF8F5]' : 'border-[#E5E7EB] bg-white'}`}>
              <input type="radio" name="firma" className="hidden" checked={formData.firma === 'No'} onChange={() => setFormData(f => ({ ...f, firma: 'No' }))} /> No
            </label>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#6B7280] tracking-wide uppercase block mb-1">Tarjeta domiciliada</label>
          <div className="flex gap-2">
            <label className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-[5px] border-[1.5px] cursor-pointer text-[12px] font-bold ${formData.dom === 'Sí' ? 'border-[#E8450A] bg-[#FFF8F5]' : 'border-[#E5E7EB] bg-white'}`}>
              <input type="radio" name="dom" className="hidden" checked={formData.dom === 'Sí'} onChange={() => setFormData(f => ({ ...f, dom: 'Sí' }))} /> Sí
            </label>
            <label className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-[5px] border-[1.5px] cursor-pointer text-[12px] font-bold ${formData.dom === 'No' ? 'border-[#E8450A] bg-[#FFF8F5]' : 'border-[#E5E7EB] bg-white'}`}>
              <input type="radio" name="dom" className="hidden" checked={formData.dom === 'No'} onChange={() => setFormData(f => ({ ...f, dom: 'No' }))} /> No
            </label>
            <label className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-[5px] border-[1.5px] cursor-pointer text-[12px] font-bold ${formData.dom === 'No aplica' ? 'border-[#E8450A] bg-[#FFF8F5]' : 'border-[#E5E7EB] bg-white'}`}>
              <input type="radio" name="dom" className="hidden" checked={formData.dom === 'No aplica'} onChange={() => setFormData(f => ({ ...f, dom: 'No aplica' }))} /> N/A
            </label>
          </div>
        </div>
      </div>
      <Input label="Quién vendió" placeholder="Nombre del colaborador" value={formData.vendedor} onChange={(e: any) => setFormData(f => ({ ...f, vendedor: e.target.value }))} />
      <Input label="Notas (opcional)" placeholder="Ej. Promoción especial..." value={formData.notas} onChange={(e: any) => setFormData(f => ({ ...f, notas: e.target.value }))} />
      
      <div className="flex gap-2 mt-3.5">
        <button onClick={onClose} className="bg-transparent text-[#6B7280] border-[1.5px] border-[#E5E7EB] rounded-[6px] px-4 py-2 text-[11px] font-bold flex-1">Cancelar</button>
        {editId && <button onClick={async () => { if (confirm('¿Eliminar?')) { deleteVenta(editId); try { await saveActiveTableroToCloud(); } catch (e) { console.error(e); } onClose(); } }} className="bg-[#FEE2E2] text-[#7F1D1D] border-none rounded-[6px] px-4 py-2 text-[11px] font-bold">Eliminar</button>}
        <button onClick={save} className="bg-[#E8450A] text-white border-none rounded-[6px] px-4 py-2 text-[11px] font-bold flex-1">Guardar</button>
      </div>
    </Modal>
  );
}

// -------------------------------------------------------------
// TICKET MODAL
// -------------------------------------------------------------
function TicketModal({ isOpen, onClose, editId }: { isOpen: boolean; onClose: () => void; editId?: string | null }) {
  const tickets = useStore(state => state.tickets);
  const addTicket = useStore(state => state.addTicket);
  const updateTicket = useStore(state => state.updateTicket);
  const deleteTicket = useStore(state => state.deleteTicket);

  const [f, setF] = useState({ folio: '', cat: 'Mantenimiento', desc: '', status: 'Abierto', comentarios: '', fecha: '', quien: '' });

  useEffect(() => {
    if (isOpen) {
      if (editId) { const t = tickets.find(x => x.id === editId); if (t) setF(t); }
      else setF({ folio: '', cat: 'Mantenimiento', desc: '', status: 'Abierto', comentarios: '', fecha: dateKey(getToday()), quien: '' });
    }
  }, [isOpen, editId, tickets]);

  const save = async () => {
    if (!f.desc.trim() || !f.fecha) return alert('Completa la descripción y la fecha.');
    const data = { ...f, id: editId || uid() };
    if (editId) updateTicket(editId, data); else addTicket(data);
    try {
      await saveActiveTableroToCloud();
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editId ? 'Editar ticket' : 'Nuevo ticket'}>
      <Input label="Folio" placeholder="Ej. TK-001" value={f.folio} onChange={(e: any) => setF({ ...f, folio: e.target.value })} />
      <Select label="Categoría" value={f.cat} onChange={(e: any) => setF({ ...f, cat: e.target.value })}>
        <option value="Mantenimiento">🔨 Mantenimiento</option><option value="Tecnología">💻 Tecnología</option><option value="Equipo">🏋️ Equipo</option>
      </Select>
      <Textarea label="Descripción del problema" placeholder="Describe detalladamente..." value={f.desc} onChange={(e: any) => setF({ ...f, desc: e.target.value })} />
      <div className="mb-2.5">
        <label className="text-[10px] font-bold text-[#6B7280] tracking-wide uppercase block mb-1">Estatus</label>
        <div className="flex gap-2">
          <label className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-[5px] border-[1.5px] cursor-pointer text-[12px] font-bold ${f.status === 'Abierto' ? 'border-[#E8450A] bg-[#FFF8F5]' : 'border-[#E5E7EB] bg-white'}`}>
            <input type="radio" className="hidden" checked={f.status === 'Abierto'} onChange={() => setF({ ...f, status: 'Abierto' })} /> 🔴 Abierto
          </label>
          <label className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-[5px] border-[1.5px] cursor-pointer text-[12px] font-bold ${f.status === 'Cerrado' ? 'border-[#E8450A] bg-[#FFF8F5]' : 'border-[#E5E7EB] bg-white'}`}>
            <input type="radio" className="hidden" checked={f.status === 'Cerrado'} onChange={() => setF({ ...f, status: 'Cerrado' })} /> ✅ Cerrado
          </label>
        </div>
      </div>
      <Textarea label="Comentarios / Seguimiento" placeholder="Agrega notas de seguimiento..." value={f.comentarios} onChange={(e: any) => setF({ ...f, comentarios: e.target.value })} />
      <Input label="Fecha" type="date" value={f.fecha} onChange={(e: any) => setF({ ...f, fecha: e.target.value })} />
      <Input label="Quién subió el ticket" placeholder="Nombre del colaborador" value={f.quien} onChange={(e: any) => setF({ ...f, quien: e.target.value })} />
      
      <div className="flex gap-2 mt-3.5">
        <button onClick={onClose} className="bg-transparent text-[#6B7280] border-[1.5px] border-[#E5E7EB] rounded-[6px] px-4 py-2 text-[11px] font-bold flex-1">Cancelar</button>
        {editId && <button onClick={async () => { if (confirm('¿Eliminar?')) { deleteTicket(editId); try { await saveActiveTableroToCloud(); } catch (e) { console.error(e); } onClose(); } }} className="bg-[#FEE2E2] text-[#7F1D1D] border-none rounded-[6px] px-4 py-2 text-[11px] font-bold">Eliminar</button>}
        <button onClick={save} className="bg-[#E8450A] text-white border-none rounded-[6px] px-4 py-2 text-[11px] font-bold flex-1">Guardar</button>
      </div>
    </Modal>
  );
}

// -------------------------------------------------------------
// EX-AGREGADOR MODAL
// -------------------------------------------------------------
function ExAgModal({ isOpen, onClose, editId }: { isOpen: boolean; onClose: () => void; editId?: string | null }) {
  const ex = useStore(state => state.exAgregadores);
  const add = useStore(state => state.addExAgregador);
  const update = useStore(state => state.updateExAgregador);
  const del = useStore(state => state.deleteExAgregador);

  const [f, setF] = useState({ fecha: '', nombre: '', idSocio: '', origen: 'Total Pass', plan: 'Mensual', notas: '' });

  useEffect(() => {
    if (isOpen) {
      if (editId) { const e = ex.find(x => x.id === editId); if (e) setF(e); }
      else setF({ fecha: dateKey(getToday()), nombre: '', idSocio: '', origen: 'Total Pass', plan: 'Mensual', notas: '' });
    }
  }, [isOpen, editId, ex]);

  const save = async () => {
    if (!f.nombre.trim() || !f.fecha) return alert('Completa la fecha y el nombre.');
    const data = { ...f, id: editId || uid() };
    if (editId) update(editId, data); else add(data);
    try {
      await saveActiveTableroToCloud();
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editId ? 'Editar migración' : 'Registrar migración'}>
      <Input label="Fecha" type="date" value={f.fecha} onChange={(e: any) => setF({ ...f, fecha: e.target.value })} />
      <Input label="Nombre completo" placeholder="Nombre del socio" value={f.nombre} onChange={(e: any) => setF({ ...f, nombre: e.target.value })} />
      <Input label="ID del socio" placeholder="Ej. 123456" value={f.idSocio} onChange={(e: any) => setF({ ...f, idSocio: e.target.value })} />
      <Select label="Venía de" value={f.origen} onChange={(e: any) => setF({ ...f, origen: e.target.value })}>
        <option>Total Pass</option><option>Wellhub</option>
      </Select>
      <Select label="Plan Station contratado" value={f.plan} onChange={(e: any) => setF({ ...f, plan: e.target.value })}>
        <option>Mensual</option><option>Anual</option><option>Renovación</option><option>Reactivación Mensual</option><option>Reactivación Anual</option><option>Upgrade</option>
      </Select>
      <Input label="Notas (opcional)" value={f.notas} onChange={(e: any) => setF({ ...f, notas: e.target.value })} />
      
      <div className="flex gap-2 mt-3.5">
        <button onClick={onClose} className="bg-transparent text-[#6B7280] border-[1.5px] border-[#E5E7EB] rounded-[6px] px-4 py-2 text-[11px] font-bold flex-1">Cancelar</button>
        {editId && <button onClick={async () => { if (confirm('¿Eliminar?')) { del(editId); try { await saveActiveTableroToCloud(); } catch (e) { console.error(e); } onClose(); } }} className="bg-[#FEE2E2] text-[#7F1D1D] border-none rounded-[6px] px-4 py-2 text-[11px] font-bold">Eliminar</button>}
        <button onClick={save} className="bg-[#E8450A] text-white border-none rounded-[6px] px-4 py-2 text-[11px] font-bold flex-1">Guardar</button>
      </div>
    </Modal>
  );
}

// -------------------------------------------------------------
// CALENDARIO MODAL
// -------------------------------------------------------------
function CalModal({ isOpen, onClose, editId, prefillDate }: { isOpen: boolean; onClose: () => void; editId?: string | null; prefillDate?: string | null }) {
  const cal = useStore(state => state.calEvents);
  const add = useStore(state => state.addCalEvent);
  const update = useStore(state => state.updateCalEvent);
  const del = useStore(state => state.deleteCalEvent);

  const [f, setF] = useState({ title: '', date: '', type: 'correo', notes: '', recurring: false });

  useEffect(() => {
    if (isOpen) {
      if (editId) { 
        // Just find in user events, since recurring events editing creates an override (user event)
        const e = cal.find(x => x.id === editId); 
        if (e) setF({ title: e.title, date: e.date, type: e.type, notes: e.notes, recurring: !!e.recurring });
        else setF({ title: '', date: '', type: 'correo', notes: '', recurring: false }); // Should not happen easily for pure add 
      }
      else setF({ title: '', date: prefillDate || '', type: 'correo', notes: '', recurring: false });
    }
  }, [isOpen, editId, prefillDate, cal]);

  const save = async () => {
    if (!f.title.trim() || !f.date) return alert('Completa el título y la fecha.');
    const data = { ...f, id: editId || uid() };
    if (editId) {
      const exists = cal.find(x => x.id === editId);
      if (exists) update(editId, data);
      else add(data); // saving an override of a recurring event
    } else {
      add(data);
    }
    try {
      await saveActiveTableroToCloud();
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editId ? 'Editar actividad' : 'Agregar actividad'}>
      <Input label="Título" placeholder="Ej. Correo de productividad..." value={f.title} onChange={(e: any) => setF({ ...f, title: e.target.value })} />
      <Input label="Fecha" type="date" value={f.date} onChange={(e: any) => setF({ ...f, date: e.target.value })} />
      <Select label="Tipo" value={f.type} onChange={(e: any) => setF({ ...f, type: e.target.value })}>
        <option value="correo">📧 Correo</option>
        <option value="informe">📊 Informe</option>
        <option value="inventario">📦 Inventario</option>
        <option value="visita">👤 Visita regional</option>
        <option value="reunion">💬 Reunión</option>
        <option value="otro">📌 Otro</option>
      </Select>
      <Textarea label="Notas" placeholder="Detalles adicionales..." value={f.notes} onChange={(e: any) => setF({ ...f, notes: e.target.value })} />
      
      <div className="flex gap-2 mt-3.5">
        <button onClick={onClose} className="bg-transparent text-[#6B7280] border-[1.5px] border-[#E5E7EB] rounded-[6px] px-4 py-2 text-[11px] font-bold flex-1">Cancelar</button>
        {editId && !f.recurring && <button onClick={async () => { if (confirm('¿Eliminar?')) { del(editId); try { await saveActiveTableroToCloud(); } catch (e) { console.error(e); } onClose(); } }} className="bg-[#FEE2E2] text-[#7F1D1D] border-none rounded-[6px] px-4 py-2 text-[11px] font-bold">Eliminar</button>}
        <button onClick={save} className="bg-[#E8450A] text-white border-none rounded-[6px] px-4 py-2 text-[11px] font-bold flex-1">Guardar</button>
      </div>
    </Modal>
  );
}

// -------------------------------------------------------------
// DIRECTORIO MODAL
// -------------------------------------------------------------
function DirModal({ isOpen, onClose, editId }: { isOpen: boolean; onClose: () => void; editId?: string | null }) {
  const dir = useStore(state => state.directorio);
  const cats = useStore(state => state.dirCats);
  const add = useStore(state => state.addDirContact);
  const update = useStore(state => state.updateDirContact);
  const del = useStore(state => state.deleteDirContact);

  const [f, setF] = useState({ cat: cats[0] || 'Otro', name: '', tel: '', email: '', notes: '' });

  useEffect(() => {
    if (isOpen) {
      if (editId) { const c = dir.find(x => x.id === editId); if (c) setF(c); }
      else setF({ cat: cats[0] || 'Otro', name: '', tel: '', email: '', notes: '' });
    }
  }, [isOpen, editId, dir, cats]);

  const save = async () => {
    if (!f.name.trim()) return alert('Escribe el nombre.');
    const data = { ...f, id: editId || uid() };
    if (editId) update(editId, data); else add(data);
    try {
      await saveActiveTableroToCloud();
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editId ? 'Editar contacto' : 'Agregar contacto'}>
      <Select label="Puesto / Categoría" value={f.cat} onChange={(e: any) => setF({ ...f, cat: e.target.value })}>
        {cats.map(c => <option key={c}>{c}</option>)}
      </Select>
      <Input label="Nombre" placeholder="Nombre completo" value={f.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} />
      <Input label="Teléfono" placeholder="81 xxxx xxxx" value={f.tel} onChange={(e: any) => setF({ ...f, tel: e.target.value })} />
      <Input label="Correo" type="email" placeholder="correo@station.mx" value={f.email} onChange={(e: any) => setF({ ...f, email: e.target.value })} />
      <Input label="Notas" placeholder="Ej. Ext. 123, horario..." value={f.notes} onChange={(e: any) => setF({ ...f, notes: e.target.value })} />
      
      <div className="flex gap-2 mt-3.5">
        <button onClick={onClose} className="bg-transparent text-[#6B7280] border-[1.5px] border-[#E5E7EB] rounded-[6px] px-4 py-2 text-[11px] font-bold flex-1">Cancelar</button>
        {editId && <button onClick={async () => { if (confirm('¿Eliminar?')) { del(editId); try { await saveActiveTableroToCloud(); } catch (e) { console.error(e); } onClose(); } }} className="bg-[#FEE2E2] text-[#7F1D1D] border-none rounded-[6px] px-4 py-2 text-[11px] font-bold">Eliminar</button>}
        <button onClick={save} className="bg-[#E8450A] text-white border-none rounded-[6px] px-4 py-2 text-[11px] font-bold flex-1">Guardar</button>
      </div>
    </Modal>
  );
}

// -------------------------------------------------------------
// DIR CATS MODAL
// -------------------------------------------------------------
function DirCatModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
  const cats = useStore(state => state.dirCats);
  const add = useStore(state => state.addDirCat);
  const del = useStore(state => state.deleteDirCat);
  const [newCat, setNewCat] = useState('');

  const saveCat = async () => {
    if (newCat.trim() && !cats.includes(newCat.trim())) {
      add(newCat.trim());
      setNewCat('');
      try {
        await saveActiveTableroToCloud();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestionar puestos del directorio">
      <div className="text-[11px] text-[#6B7280] mb-3">Agrega o elimina los puestos que aparecen en el directorio.</div>
      <div className="mb-3 max-h-[200px] overflow-y-auto">
        {cats.map((c) => (
          <div key={c} className="flex items-center gap-2 py-1.5 border-b border-[#E5E7EB]">
            <div className="flex-1 text-[12px] font-semibold">{c}</div>
            <button onClick={async () => { if (confirm(`¿Eliminar el puesto "${c}"?`)) { del(c); try { await saveActiveTableroToCloud(); } catch (e) { console.error(e); } } }} className="bg-transparent border-none cursor-pointer text-[#7F1D1D] text-[12px] font-bold">✕</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="flex-1 p-2 border-[1.5px] border-[#E5E7EB] rounded-[6px] text-[12px] outline-none focus:border-[#E8450A]" placeholder="Nuevo puesto..." value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveCat()} />
        <button onClick={saveCat} className="bg-[#E8450A] text-white border-none rounded-[6px] px-4 py-2 text-[11px] font-bold whitespace-nowrap">+ Agregar</button>
      </div>
    </Modal>
  );
}
