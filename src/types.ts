export interface Venta {
  id: string;
  fecha: string;
  nombre: string;
  idSocio: string;
  plan: string;
  monto: number;
  medio: string;
  firma: string;
  dom: string;
  vendedor: string;
  notas: string;
  requiereRutina?: boolean;
  rutinaAsignada?: boolean;
  rutinaCoach?: string;
}

export interface Ticket {
  id: string;
  folio: string;
  cat: string;
  desc: string;
  status: string;
  comentarios: string;
  fecha: string;
  quien: string;
}

export interface ExAgregador {
  id: string;
  fecha: string;
  nombre: string;
  idSocio: string;
  origen: string;
  plan: string;
  notas: string;
}

export interface DirectorioContact {
  id: string;
  cat: string;
  name: string;
  tel: string;
  email: string;
  notes: string;
}

export interface CalEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  notes: string;
  recurring?: boolean;
  status?: string;
}

export interface BitacoraEntry {
  id: string;
  date: string;
  time: string;
  turno: string;
  nota: string;
  prio: string;
}

export interface ComposicionData {
  mensuales: number;
  anuales: number;
}
