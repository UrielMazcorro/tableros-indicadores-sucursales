import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db, doc, setDoc, serverTimestamp } from '../firebase';
import {
  Venta,
  Ticket,
  ExAgregador,
  DirectorioContact,
  CalEvent,
  BitacoraEntry,
  ComposicionData,
} from '../types';

export interface SucursalAsignada {
  id: string;              // ej: 'sucursal_valle'
  nombre: string;          // ej: 'Sucursal Valle'
  region: string;          // ej: 'NL'
  zona: string;            // ej: 'NL - Zona 1'
  usuarioUid?: string;     // UID del líder asignado
  usuarioNombre?: string;  // Nombre del líder/usuario
  rol?: string;            // Rol del usuario ('usuario' = Sucursal, 'lider_zona', etc.)
}

interface AppState {
  ventas: Venta[];
  tickets: Ticket[];
  chkLS: Record<string, Record<number, { done: boolean; note: string }>>;
  chkCA: Record<string, Record<number, { done: boolean; note: string }>>;
  indicators: Record<string, Record<string, number>>;
  proyeccion: Record<string, Record<string, number>>;
  calEvents: CalEvent[];
  bitLS: BitacoraEntry[];
  bitCA: BitacoraEntry[];
  directorio: DirectorioContact[];
  exAgregadores: ExAgregador[];
  composicion: Record<string, ComposicionData>;
  hiddenEvents: string[];
  evtStatuses: Record<string, string>;
  spvStatuses: Record<string, string>;
  dirCats: string[];
  activeSucursalId: string;
  sucursales: SucursalAsignada[];
  isOnboarding: boolean;

  // Actions
  setIsOnboarding: (isOnboarding: boolean) => void;
  setActiveSucursalId: (id: string) => void;
  setSucursales: (sucursales: SucursalAsignada[]) => void;
  toggleSPVStatus: (id: string) => void;
  addVenta: (venta: Venta) => void;
  updateVenta: (id: string, venta: Venta) => void;
  deleteVenta: (id: string) => void;
  
  toggleChk: (type: 'ls' | 'ca', date: string, id: number, checked: boolean) => void;
  saveChkNote: (type: 'ls' | 'ca', date: string, id: number, note: string) => void;
  
  saveIndicators: (monthKey: string, data: Record<string, number>) => void;
  clearIndicators: (monthKey: string) => void;
  
  saveProyeccion: (monthKey: string, data: Record<string, number>) => void;
  
  addTicket: (ticket: Ticket) => void;
  updateTicket: (id: string, ticket: Ticket) => void;
  deleteTicket: (id: string) => void;
  toggleTicketStatus: (id: string) => void;

  addBitacora: (type: 'ls' | 'ca', entry: BitacoraEntry) => void;
  deleteBitacora: (type: 'ls' | 'ca', id: string) => void;

  addCalEvent: (event: CalEvent) => void;
  updateCalEvent: (id: string, event: CalEvent) => void;
  deleteCalEvent: (id: string) => void;
  hideCalEvent: (id: string) => void;
  restoreHiddenEvents: () => void;
  toggleEvtStatus: (id: string, currentStatus: string) => void;

  addDirContact: (contact: DirectorioContact) => void;
  updateDirContact: (id: string, contact: DirectorioContact) => void;
  deleteDirContact: (id: string) => void;
  addDirCat: (cat: string) => void;
  deleteDirCat: (cat: string) => void;

  addExAgregador: (ex: ExAgregador) => void;
  updateExAgregador: (id: string, ex: ExAgregador) => void;
  deleteExAgregador: (id: string) => void;

  saveComposicion: (monthKey: string, mensuales: number, anuales: number) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      ventas: [],
      tickets: [],
      chkLS: {},
      chkCA: {},
      indicators: {},
      proyeccion: {},
      calEvents: [],
      bitLS: [],
      bitCA: [],
      directorio: [],
      exAgregadores: [],
      composicion: {},
      hiddenEvents: [],
      evtStatuses: {},
      spvStatuses: {},
      dirCats: ['Sucursal', 'Líder Regional', 'Líder de Zona Norte', 'Mantenimiento', 'TI', 'Capital Humano', 'Otro'],
      activeSucursalId: '',
      sucursales: [
        { id: 'sucursal_valle', nombre: 'Sucursal Valle', region: 'NL', zona: 'NL - Zona 1' },
      ],
      isOnboarding: false,

      setIsOnboarding: (isOnboarding) => set({ isOnboarding }),
      setActiveSucursalId: (id) => set({ activeSucursalId: id }),
      setSucursales: (sucursales) => set({ sucursales }),
      toggleSPVStatus: (id) =>
        set((state) => {
          const current = state.spvStatuses[id] || 'pendiente';
          return {
            spvStatuses: {
              ...state.spvStatuses,
              [id]: current === 'pendiente' ? 'realizado' : 'pendiente',
            },
          };
        }),
      addVenta: (venta) => set((state) => ({ ventas: [venta, ...state.ventas] })),
      updateVenta: (id, venta) => set((state) => ({ ventas: state.ventas.map((v) => (v.id === id ? venta : v)) })),
      deleteVenta: (id) => set((state) => ({ ventas: state.ventas.filter((v) => v.id !== id) })),

      toggleChk: (type, date, id, checked) =>
        set((state) => {
          const key = type === 'ls' ? 'chkLS' : 'chkCA';
          const currentData = state[key];
          const dateData = currentData[date] || {};
          const itemData = dateData[id] || { done: false, note: '' };
          return {
            [key]: {
              ...currentData,
              [date]: {
                ...dateData,
                [id]: { ...itemData, done: checked },
              },
            },
          };
        }),
      saveChkNote: (type, date, id, note) =>
        set((state) => {
          const key = type === 'ls' ? 'chkLS' : 'chkCA';
          const currentData = state[key];
          const dateData = currentData[date] || {};
          const itemData = dateData[id] || { done: false, note: '' };
          return {
            [key]: {
              ...currentData,
              [date]: {
                ...dateData,
                [id]: { ...itemData, note },
              },
            },
          };
        }),

      saveIndicators: (monthKey, data) =>
        set((state) => ({
          indicators: { ...state.indicators, [monthKey]: data },
        })),
      clearIndicators: (monthKey) =>
        set((state) => {
          const newInd = { ...state.indicators };
          delete newInd[monthKey];
          return { indicators: newInd };
        }),

      saveProyeccion: (monthKey, data) =>
        set((state) => ({
          proyeccion: { ...state.proyeccion, [monthKey]: data },
        })),

      addTicket: (ticket) => set((state) => ({ tickets: [ticket, ...state.tickets] })),
      updateTicket: (id, ticket) => set((state) => ({ tickets: state.tickets.map((t) => (t.id === id ? ticket : t)) })),
      deleteTicket: (id) => set((state) => ({ tickets: state.tickets.filter((t) => t.id !== id) })),
      toggleTicketStatus: (id) =>
        set((state) => ({
          tickets: state.tickets.map((t) => (t.id === id ? { ...t, status: t.status === 'Abierto' ? 'Cerrado' : 'Abierto' } : t)),
        })),

      addBitacora: (type, entry) =>
        set((state) => {
          const key = type === 'ls' ? 'bitLS' : 'bitCA';
          return { [key]: [entry, ...state[key]] };
        }),
      deleteBitacora: (type, id) =>
        set((state) => {
          const key = type === 'ls' ? 'bitLS' : 'bitCA';
          return { [key]: state[key].filter((b) => b.id !== id) };
        }),

      addCalEvent: (event) => set((state) => ({ calEvents: [...state.calEvents, event] })),
      updateCalEvent: (id, event) => set((state) => ({ calEvents: state.calEvents.map((e) => (e.id === id ? event : e)) })),
      deleteCalEvent: (id) => set((state) => ({ calEvents: state.calEvents.filter((e) => e.id !== id) })),
      hideCalEvent: (id) => set((state) => ({ hiddenEvents: [...state.hiddenEvents, id] })),
      restoreHiddenEvents: () => set({ hiddenEvents: [] }),
      toggleEvtStatus: (id, currentStatus) =>
        set((state) => ({
          evtStatuses: { ...state.evtStatuses, [id]: currentStatus === 'realizado' ? 'pendiente' : 'realizado' },
        })),

      addDirContact: (contact) => set((state) => ({ directorio: [...state.directorio, contact] })),
      updateDirContact: (id, contact) => set((state) => ({ directorio: state.directorio.map((c) => (c.id === id ? contact : c)) })),
      deleteDirContact: (id) => set((state) => ({ directorio: state.directorio.filter((c) => c.id !== id) })),
      addDirCat: (cat) => set((state) => ({ dirCats: [...state.dirCats, cat] })),
      deleteDirCat: (cat) => set((state) => ({ dirCats: state.dirCats.filter((c) => c !== cat) })),

      addExAgregador: (ex) => set((state) => ({ exAgregadores: [ex, ...state.exAgregadores] })),
      updateExAgregador: (id, ex) => set((state) => ({ exAgregadores: state.exAgregadores.map((e) => (e.id === id ? ex : e)) })),
      deleteExAgregador: (id) => set((state) => ({ exAgregadores: state.exAgregadores.filter((e) => e.id !== id) })),

      saveComposicion: (monthKey, mensuales, anuales) =>
        set((state) => ({
          composicion: { ...state.composicion, [monthKey]: { mensuales, anuales } },
        })),
    }),
    {
      name: 'domena_v3_store',
    }
  )
);

export async function saveActiveTableroToCloud() {
  const state = useStore.getState();
  const sucursalId = state.activeSucursalId;
  if (!sucursalId) {
    console.warn("No active sucursal selected to save to cloud.");
    return;
  }
  
  try {
    const docRef = doc(db, 'tableros', sucursalId);
    await setDoc(docRef, {
      id_sucursal: sucursalId,
      ventas: state.ventas || [],
      tickets: state.tickets || [],
      chkLS: state.chkLS || {},
      chkCA: state.chkCA || {},
      indicators: state.indicators || {},
      proyeccion: state.proyeccion || {},
      calEvents: state.calEvents || [],
      bitLS: state.bitLS || [],
      bitCA: state.bitCA || [],
      directorio: state.directorio || [],
      exAgregadores: state.exAgregadores || [],
      composicion: state.composicion || {},
      spvStatuses: state.spvStatuses || {},
      lastUpdated: serverTimestamp()
    }, { merge: true });
    console.log(`[Cloud Save] Tablero ${sucursalId} guardado con éxito en Firebase.`);
  } catch (error) {
    console.error("Error al guardar tablero en la nube:", error);
    throw error;
  }
}
