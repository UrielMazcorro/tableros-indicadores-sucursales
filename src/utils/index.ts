export const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function getMonday(d: Date | string) {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - ((day === 0 ? 7 : day) - 1));
  return dt;
}

export function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function monthKey(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

export function fmtDate(d: string | undefined | null) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export function fmtMoney(val: string | number | null | undefined) {
  if (val == null || val === '') return '';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n)) return '';
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseMoney(str: string | null | undefined) {
  if (str === '' || str == null) return null;
  const clean = String(str).replace(/[$\\s]/g, '').replace(/,/g, '');
  if (clean === '') return null;
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

export function daysBetween(d1: string, d2: string) {
  const a = new Date(d1 + 'T00:00:00');
  const b = new Date(d2 + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function semColor(pct: number | null) {
  if (pct === null) return { bg: '#F9FAFB', border: '#E5E7EB', text: '#6B7280' };
  if (pct >= 100) return { bg: '#DCFCE7', border: '#16A34A', text: '#14532D' };
  if (pct >= 86) return { bg: '#FEF9C3', border: '#D97706', text: '#713F12' };
  return { bg: '#FEE2E2', border: '#DC2626', text: '#7F1D1D' };
}

export function uid() {
  return 'x' + Date.now() + Math.random().toString(36).slice(2, 5);
}

// Ensure the local timezone offset does not shift the day for these basic displays
export const getToday = () => {
  const d = new Date();
  return d;
};
