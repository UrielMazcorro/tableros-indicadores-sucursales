import React, { useState, useEffect } from 'react';
import { getToday, MONTHS_ES, monthKey, dateKey } from './utils';
import { LS_ACTS, CA_ACTS } from './utils/constants';
import { Dashboard } from './components/Dashboard';
import { Checklist } from './components/Checklist';
import { Indicadores } from './components/Indicadores';
import { RegistroVenta } from './components/RegistroVenta';
import { Calendario } from './components/Calendario';
import { Tickets } from './components/Tickets';
import { ExAgregadores } from './components/ExAgregadores';
import { SeguimientoRenovaciones } from './components/SeguimientoRenovaciones';
import { DirectorioEnlaces } from './components/DirectorioEnlaces';
import { OnboardingMenu } from './components/OnboardingMenu';
import { PanelUsuarios } from './components/PanelUsuarios';
import { NavegacionCascada } from './components/NavegacionCascada';
import { getNombreSucursal } from './data/catalogoSucursales';
import { initSucursalesRealtimeSync } from './services/sucursalesSync';
import { ModalsManager } from './components/ModalsManager';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { loginWithGoogle, saveTableroData } from './firebaseLogic';
import { doc, getDoc } from 'firebase/firestore';
import { useStore } from './store';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentDateStr, setCurrentDateStr] = useState('');
  
  const [user, setUser] = useState<any>(null);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentSucursal, setCurrentSucursal] = useState<string>('');

  const activeSucursalId = useStore((state) => state.activeSucursalId);

  useEffect(() => {
    setCurrentDateStr(
      getToday().toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    );
  }, []);

  const loadAndApplyBoardData = async (sucursal: string) => {
    setLoadingBoard(true);
    setCurrentSucursal(sucursal);
    useStore.setState({ activeSucursalId: sucursal });
    try {
      const { loadTableroData } = await import('./firebaseLogic');
      const data = await loadTableroData(sucursal);
      if (data) {
        const { id_sucursal, lastUpdated, ...storeData } = data;
        useStore.setState({
          activeSucursalId: sucursal,
          ventas: storeData.ventas || [],
          tickets: storeData.tickets || [],
          chkLS: storeData.chkLS || {},
          chkCA: storeData.chkCA || {},
          indicators: storeData.indicators || {},
          proyeccion: storeData.proyeccion || {},
          calEvents: storeData.calEvents || [],
          bitLS: storeData.bitLS || [],
          bitCA: storeData.bitCA || [],
          directorio: storeData.directorio || [],
          exAgregadores: storeData.exAgregadores || [],
          composicion: storeData.composicion || {},
        });
      } else {
        // Vaciar estado si no hay datos
        useStore.setState({
          activeSucursalId: sucursal,
          ventas: [], tickets: [], chkLS: {}, chkCA: {}, indicators: {},
          proyeccion: {}, calEvents: [], bitLS: [], bitCA: [],
          directorio: [], exAgregadores: [], composicion: {}
        });
      }
    } catch (e) {
      console.error(e);
      alert('Error cargando el tablero de la sucursal.');
    } finally {
      setLoadingBoard(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // fetch user role & sucursal
        const uRef = doc(db, 'usuarios', currentUser.uid);
        const uSnap = await getDoc(uRef);
        let userData: any = {
          uid: currentUser.uid,
          email: currentUser.email,
          nombre: currentUser.displayName || 'Usuario',
          rol: 'usuario',
        };
        if (uSnap.exists()) {
          userData = { ...userData, ...uSnap.data() };
        }
        setUser(userData);

        if (userData.rol === 'super_admin' || userData.rol === 'administrador' || userData.rol === 'lider_regional' || userData.rol === 'lider_zona') {
          try {
            // Inicializar con la sucursal asignada o por defecto 'NL - Zona 1'
            const initialSuc = userData.id_sucursal || 'NL - Zona 1';
            setCurrentSucursal(initialSuc);
            useStore.setState({ activeSucursalId: initialSuc });
            loadAndApplyBoardData(initialSuc);
          } catch (e) {
            console.error(e);
          }
        } else if (userData.solicitud_admin) {
          // Solicitud de admin pendiente: no cargar tablero todavía
          setLoadingBoard(false);
        } else if (userData.id_sucursal && userData.region) {
          // Perfil completo: cargar datos de la sucursal
          const userSuc = userData.id_sucursal;
          setCurrentSucursal(userSuc);
          useStore.setState({ activeSucursalId: userSuc });
          loadAndApplyBoardData(userSuc);
        } else {
          // Perfil incompleto: no tiene sucursal o región asignada
          setLoadingBoard(false);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) {
      const unsub = initSucursalesRealtimeSync();
      return () => unsub();
    }
  }, [user]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error(e);
      alert('Error al iniciar sesión');
    }
  };

  const handleSaveToCloud = async () => {
    if (!user) {
      alert('No hay un usuario logueado.');
      return;
    }
    const sucursalTarget = user.rol === 'administrador' ? activeSucursalId : (user.id_sucursal || 'Central');
    if (!sucursalTarget) {
      alert('No tienes una sucursal activa seleccionada.');
      return;
    }
    setSaving(true);
    try {
      const state = useStore.getState();
      const payload = {
        ventas: state.ventas,
        tickets: state.tickets,
        chkLS: state.chkLS,
        chkCA: state.chkCA,
        indicators: state.indicators,
        proyeccion: state.proyeccion,
        calEvents: state.calEvents,
        bitLS: state.bitLS,
        bitCA: state.bitCA,
        directorio: state.directorio,
        exAgregadores: state.exAgregadores,
        composicion: state.composicion,
      };
      await saveTableroData(sucursalTarget, payload);
      alert('Tablero guardado en la nube exitosamente');
    } catch (e) {
      console.error(e);
      alert('Error al guardar en la nube');
    } finally {
      setSaving(false);
    }
  };

  const formatSucursalName = (id: string) => {
    if (!id) return 'Sucursal';
    
    // Si el ID coincide con el usuario activo, extraemos el nombre basado en su correo (para forzar "Sucursal [Prefijo]")
    if (user && (user.id_sucursal === id || user.uid === id)) {
      const email = user.email || auth.currentUser?.email || '';
      let baseName = '';
      
      if (email) {
        const prefix = email.split('@')[0];
        baseName = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
      } else if (user.nombre && user.nombre !== id) {
        baseName = user.nombre;
      }

      if (baseName) {
        return baseName.toLowerCase().startsWith('sucursal') ? baseName : `Sucursal ${baseName}`;
      }
    }

    const fromCatalog = getNombreSucursal(id);
    
    // Si fromCatalog devolvió el ID crudo (no se encontró) y parece ser un UID (largo, sin espacios)
    if (fromCatalog === id || fromCatalog === `Sucursal ${id.charAt(0).toUpperCase() + id.slice(1)}`) {
       if (id.length > 20 && !id.includes(' ')) {
         const fallback = user?.nombre && user.nombre !== id ? user.nombre : 'Nueva';
         return fallback.toLowerCase().startsWith('sucursal') ? fallback : `Sucursal ${fallback}`;
       }
    }
    
    // Si viene del catálogo, nos aseguramos de que diga Sucursal (a menos que sea Central u otra zona especial)
    if (fromCatalog && !fromCatalog.toLowerCase().startsWith('sucursal') && fromCatalog !== 'Central' && !fromCatalog.toLowerCase().includes('zona')) {
        return `Sucursal ${fromCatalog}`;
    }

    return fromCatalog;
  };

  const exportarExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const store = useStore.getState();
      const wb = XLSX.utils.book_new();

      const today = getToday();
      const sucursalNombre = formatSucursalName(activeSucursalId || user?.id_sucursal || 'Domena') || 'Sucursal';
      const currentMonthKey = monthKey(today.getFullYear(), today.getMonth());

      // ─────────────────────────────────────────────
      // 1. HOJA: "Dashboard" (Resumen General)
      // ─────────────────────────────────────────────
      const indData = (store.indicators?.[currentMonthKey] || {}) as any;
      const compData = (store.composicion?.[currentMonthKey] || {}) as any;

      const mrrVal = indData.mrr ?? 0;
      const mrrMeta = indData.mrr_meta ?? 0;
      const ventaVal = indData.venta ?? 0;
      const ventaMeta = indData.venta_meta ?? 0;
      const ingresoVal = indData.ingreso ?? (mrrVal + ventaVal);
      const ingresoMeta = indData.ingreso_meta ?? (mrrMeta + ventaMeta);
      const usuariosVal = indData.usuarios ?? 0;
      const usuariosMeta = indData.usuarios_meta ?? 1500;
      const ticketVal = indData.ticket ?? (usuariosVal > 0 ? ingresoVal / usuariosVal : 0);
      const churnVal = indData.churn ?? 0;
      const churnMeta = indData.churn_meta ?? 0;

      const mensualVal = indData.mensual ?? 0;
      const mensualMeta = indData.mensual_meta ?? 0;
      const anualVal = indData.anual ?? 0;
      const anualMeta = indData.anual_meta ?? 0;
      const renovVal = indData.renovacion ?? 0;
      const renovMeta = indData.renovacion_meta ?? 0;

      const compMen = compData.mensuales ?? 0;
      const compAnu = compData.anuales ?? 0;
      const compTotal = compMen + compAnu;
      const compPctMen = compTotal > 0 ? ((compMen / compTotal) * 100).toFixed(1) + '%' : '0%';
      const compPctAnu = compTotal > 0 ? ((compAnu / compTotal) * 100).toFixed(1) + '%' : '0%';

      const todayDk = dateKey(today);
      const lsTodayState = store.chkLS[todayDk] || {};
      const lsDone = LS_ACTS.filter((a) => lsTodayState[a.n]?.done).length;
      const caTodayState = store.chkCA[todayDk] || {};
      const caDone = CA_ACTS.filter((a) => caTodayState[a.n]?.done).length;

      const monthVentas = store.ventas.filter((v) => v.fecha && v.fecha.startsWith(currentMonthKey));
      const totalVentasMonto = monthVentas.reduce((acc, v) => acc + (parseFloat(v.monto as any) || 0), 0);

      const openTickets = store.tickets.filter((t) => t.status === 'Abierto').length;
      const closedTickets = store.tickets.filter((t) => t.status === 'Cerrado').length;

      const dashRows: any[][] = [
        ['REPORTE CONSOLIDADO — DASHBOARD', '', '', ''],
        ['Sucursal:', sucursalNombre, 'Periodo:', `${MONTHS_ES[today.getMonth()]} ${today.getFullYear()}`],
        ['Fecha de Generación:', today.toLocaleDateString('es-MX'), '', ''],
        [],
        ['INDICADORES FINANCIEROS', 'ALCANCE REAL', 'META DEL MES', '% CUMPLIMIENTO / ESTATUS'],
        ['MRR (Ingreso Recurrente)', mrrVal, mrrMeta, mrrMeta > 0 ? ((mrrVal / mrrMeta) * 100).toFixed(1) + '%' : '—'],
        ['Venta Nueva', ventaVal, ventaMeta, ventaMeta > 0 ? ((ventaVal / ventaMeta) * 100).toFixed(1) + '%' : '—'],
        ['Ingreso Total', ingresoVal, ingresoMeta, ingresoMeta > 0 ? ((ingresoVal / ingresoMeta) * 100).toFixed(1) + '%' : '—'],
        ['Usuarios Activos', usuariosVal, usuariosMeta, usuariosMeta > 0 ? ((usuariosVal / usuariosMeta) * 100).toFixed(1) + '%' : '—'],
        ['Ticket Promedio', ticketVal > 0 ? Number(ticketVal.toFixed(2)) : 0, '—', 'Calculado (Ingreso / Usuarios)'],
        ['Churn Rate (Cancelación)', churnVal + '%', churnMeta + '%', churnMeta > 0 ? (churnVal <= churnMeta ? 'Dentro de objetivo' : 'Excede objetivo') : '—'],
        [],
        ['METAS DE MEMBRESÍAS', 'ALCANCE REAL', 'META DEL MES', '% CUMPLIMIENTO'],
        ['Membresías Mensuales', mensualVal, mensualMeta, mensualMeta > 0 ? ((mensualVal / mensualMeta) * 100).toFixed(1) + '%' : '—'],
        ['Membresías Anuales', anualVal, anualMeta, anualMeta > 0 ? ((anualVal / anualMeta) * 100).toFixed(1) + '%' : '—'],
        ['Renovaciones', renovVal, renovMeta, renovMeta > 0 ? ((renovVal / renovMeta) * 100).toFixed(1) + '%' : '—'],
        [],
        ['COMPOSICIÓN DE MEMBRESÍAS', 'CANTIDAD SOCIOS', 'DISTRIBUCIÓN (%)', 'ESTATUS'],
        ['Socios Mensuales', compMen, compPctMen, 'Padrón activo'],
        ['Socios Anuales', compAnu, compPctAnu, 'Padrón activo'],
        ['Total Padrón Socios', compTotal, '100%', 'Total acumulado'],
        [],
        ['AVANCE DE CHECKLISTS (HOY)', 'ACTIVIDADES COMPLETADAS', 'TOTAL ACTIVIDADES', '% AVANCE'],
        ['Líder de Sucursal (LS)', lsDone, LS_ACTS.length, ((lsDone / LS_ACTS.length) * 100).toFixed(1) + '%'],
        ['Club Assistance (CA)', caDone, CA_ACTS.length, ((caDone / CA_ACTS.length) * 100).toFixed(1) + '%'],
        [],
        ['RESUMEN OPERATIVO DEL MES', 'CANTIDAD', 'MONTO ($)', 'OBSERVACIONES'],
        ['Ventas Registradas este Mes', monthVentas.length, totalVentasMonto, 'Transacciones en curso'],
        ['Tickets Abiertos (Pendientes)', openTickets, '—', 'Atención requerida'],
        ['Tickets Cerrados (Completados)', closedTickets, '—', 'Incidencias resueltas'],
        ['Total Ex-Agregadores Migrados', store.exAgregadores.length, '—', 'Socios captados'],
      ];

      const wsDash = XLSX.utils.aoa_to_sheet(dashRows);
      wsDash['!cols'] = [{ wch: 32 }, { wch: 22 }, { wch: 22 }, { wch: 26 }];
      XLSX.utils.book_append_sheet(wb, wsDash, 'Dashboard');

      // ─────────────────────────────────────────────
      // 2. HOJA: "Checklist"
      // ─────────────────────────────────────────────
      const chkRows: any[][] = [
        ['Rol / Responsable', 'Fecha', '# Actividad', 'Actividad', 'Horario Sugerido', 'Completada', 'Nota']
      ];

      const recordedDates = Array.from(new Set([
        ...Object.keys(store.chkLS),
        ...Object.keys(store.chkCA),
        todayDk
      ])).sort().reverse();

      recordedDates.forEach((dk) => {
        const lsState = store.chkLS[dk] || {};
        LS_ACTS.forEach((a) => {
          const isDone = !!lsState[a.n]?.done;
          const note = lsState[a.n]?.note || '';
          chkRows.push(['Líder de Sucursal (LS)', dk, a.n, a.act, a.hora, isDone ? 'Sí' : 'No', note]);
        });

        const caState = store.chkCA[dk] || {};
        CA_ACTS.forEach((a) => {
          const isDone = !!caState[a.n]?.done;
          const note = caState[a.n]?.note || '';
          chkRows.push(['Club Assistance (CA)', dk, a.n, a.act, a.hora, isDone ? 'Sí' : 'No', note]);
        });
      });

      const wsChk = XLSX.utils.aoa_to_sheet(chkRows);
      wsChk['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 65 }, { wch: 16 }, { wch: 14 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsChk, 'Checklist');

      // ─────────────────────────────────────────────
      // 3. HOJA: "Indicadores"
      // ─────────────────────────────────────────────
      const indRows: any[][] = [
        ['Mes', 'Año', 'Indicador', 'Categoría', 'Alcance Real', 'Meta del Mes', '% Cumplimiento / Estatus']
      ];

      const recordedMonths = Array.from(new Set([
        ...Object.keys(store.indicators),
        currentMonthKey
      ])).sort().reverse();

      recordedMonths.forEach((mk) => {
        const [yStr, mStr] = mk.split('-');
        const y = parseInt(yStr, 10);
        const mIndex = parseInt(mStr, 10) - 1;
        const mesLabel = MONTHS_ES[mIndex] || `Mes ${mStr}`;
        const data = store.indicators[mk] || {};

        const metrics = [
          { name: 'MRR', cat: 'Financiero', val: data.mrr, meta: data.mrr_meta, isChurn: false, unit: '$' },
          { name: 'Venta Nueva', cat: 'Financiero', val: data.venta, meta: data.venta_meta, isChurn: false, unit: '$' },
          { name: 'Ingreso Total', cat: 'Financiero', val: data.ingreso ?? ((data.mrr || 0) + (data.venta || 0)), meta: data.ingreso_meta ?? ((data.mrr_meta || 0) + (data.venta_meta || 0)), isChurn: false, unit: '$' },
          { name: 'Usuarios', cat: 'Financiero', val: data.usuarios, meta: data.usuarios_meta ?? 1500, isChurn: false, unit: '' },
          { name: 'Ticket Promedio', cat: 'Financiero', val: data.ticket, meta: null, isChurn: false, unit: '$' },
          { name: 'Churn Rate', cat: 'Financiero', val: data.churn, meta: data.churn_meta, isChurn: true, unit: '%' },
          { name: 'Membresías Mensuales', cat: 'Membresías', val: data.mensual, meta: data.mensual_meta, isChurn: false, unit: '' },
          { name: 'Membresías Anuales', cat: 'Membresías', val: data.anual, meta: data.anual_meta, isChurn: false, unit: '' },
          { name: 'Renovaciones', cat: 'Membresías', val: data.renovacion, meta: data.renovacion_meta, isChurn: false, unit: '' },
        ];

        metrics.forEach((met) => {
          let estatus = '—';
          if (met.meta != null && met.meta > 0 && met.val != null) {
            if (met.isChurn) {
              estatus = met.val <= met.meta ? 'Dentro de objetivo' : `Sobre objetivo (+${(met.val - met.meta).toFixed(1)}%)`;
            } else {
              const pct = ((met.val / met.meta) * 100).toFixed(1);
              estatus = `${pct}%`;
            }
          }
          indRows.push([
            mesLabel,
            y,
            met.name,
            met.cat,
            met.val != null ? (met.unit === '$' ? `$${Number(met.val).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : `${met.val}${met.unit}`) : '—',
            met.meta != null ? (met.unit === '$' ? `$${Number(met.meta).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : `${met.meta}${met.unit}`) : '—',
            estatus
          ]);
        });
      });

      const wsInd = XLSX.utils.aoa_to_sheet(indRows);
      wsInd['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(wb, wsInd, 'Indicadores');

      // ─────────────────────────────────────────────
      // 4. HOJA: "Registro Venta"
      // ─────────────────────────────────────────────
      const regRows: any[][] = [
        ['Fecha', 'Nombre Completo', 'ID Socio', 'Plan', 'Monto ($)', 'Medio de Pago', 'Firma Contrato', 'Tarjeta Domiciliada', 'Quién Vendió', 'Requiere Rutina', 'Rutina Asignada', 'Coach Asignado', 'Notas']
      ];

      if (store.ventas && store.ventas.length) {
        const sortedVentas = [...store.ventas].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        sortedVentas.forEach((v) => {
          regRows.push([
            v.fecha || '',
            v.nombre || '',
            v.idSocio || '',
            v.plan || '',
            v.monto != null ? Number(v.monto) : 0,
            v.medio || '',
            v.firma || '',
            v.dom || '',
            v.vendedor || '',
            v.requiereRutina === false ? 'No' : 'Sí',
            v.rutinaAsignada ? 'Sí' : 'No',
            v.rutinaCoach || '',
            v.notas || '',
          ]);
        });
      } else {
        regRows.push(['Sin ventas registradas']);
      }

      const wsReg = XLSX.utils.aoa_to_sheet(regRows);
      wsReg['!cols'] = [
        { wch: 12 }, { wch: 26 }, { wch: 12 }, { wch: 20 }, { wch: 14 },
        { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 16 },
        { wch: 16 }, { wch: 20 }, { wch: 28 }
      ];
      XLSX.utils.book_append_sheet(wb, wsReg, 'Registro Venta');

      // ─────────────────────────────────────────────
      // 5. HOJA: "Tickets"
      // ─────────────────────────────────────────────
      const tkRows: any[][] = [
        ['Folio', 'Categoría', 'Descripción', 'Estatus', 'Comentarios', 'Fecha', 'Quién Subió']
      ];

      if (store.tickets && store.tickets.length) {
        const sortedTickets = [...store.tickets].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        sortedTickets.forEach((t) => {
          tkRows.push([
            t.folio || '',
            t.cat || '',
            t.desc || '',
            t.status || '',
            t.comentarios || '',
            t.fecha || '',
            t.quien || '',
          ]);
        });
      } else {
        tkRows.push(['Sin tickets registrados']);
      }

      const wsTK = XLSX.utils.aoa_to_sheet(tkRows);
      wsTK['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 45 }, { wch: 14 }, { wch: 35 }, { wch: 12 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsTK, 'Tickets');

      // ─────────────────────────────────────────────
      // 6. HOJA: "Ex-Agregadores"
      // ─────────────────────────────────────────────
      const exRows: any[][] = [
        ['Fecha', 'Nombre Completo', 'ID Socio', 'Plataforma Origen', 'Plan Station Contratado', 'Notas']
      ];

      if (store.exAgregadores && store.exAgregadores.length) {
        const sortedEx = [...store.exAgregadores].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        sortedEx.forEach((e) => {
          exRows.push([
            e.fecha || '',
            e.nombre || '',
            e.idSocio || '',
            e.origen || '',
            e.plan || '',
            e.notas || '',
          ]);
        });
      } else {
        exRows.push(['Sin registros de ex-agregadores']);
      }

      const wsEx = XLSX.utils.aoa_to_sheet(exRows);
      wsEx['!cols'] = [{ wch: 12 }, { wch: 26 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(wb, wsEx, 'Ex-Agregadores');

      // ─────────────────────────────────────────────
      // Descargar con Nombre Dinámico:
      // "Tablero " + [Sucursal] + " " + [Mes] + " " + [Año] + ".xlsx"
      // ─────────────────────────────────────────────
      const mesNombre = MONTHS_ES[today.getMonth()];
      const anio = today.getFullYear();
      const nombreArchivo = `Tablero ${sucursalNombre} ${mesNombre} ${anio}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);
    } catch (e) {
      console.error(e);
      alert('Error al exportar Excel');
    }
  };

  const isSuperAdmin = user?.rol === 'super_admin' || user?.rol === 'administrador';
  const isLiderRegional = user?.rol === 'lider_regional';
  const isLiderZona = user?.rol === 'lider_zona';
  const isMultiSucursal = isSuperAdmin || isLiderRegional || isLiderZona;

  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'checklist', label: '✅ Checklist' },
    { id: 'indicadores', label: '📈 Indicadores' },
    { id: 'registro', label: '💰 Registro de Venta' },
    { id: 'renovaciones', label: '🔁 Seguimiento a Renovaciones' },
    { id: 'calendario', label: '📅 Calendario' },
    { id: 'tickets', label: '🔧 Tickets' },
    { id: 'exagregadores', label: '🔄 Ex-Agregadores' },
    { id: 'directorio', label: '📁 Directorio' },
    ...(isSuperAdmin ? [{ id: 'usuarios', label: '👥 Gestión de Usuarios' }] : []),
  ];

  // Renderizado condicional exclusivo de la vista activa (Full-Screen View)
  const renderCurrentView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'checklist':
        return <Checklist />;
      case 'indicadores':
        return <Indicadores />;
      case 'registro':
        return <RegistroVenta />;
      case 'renovaciones':
        return <SeguimientoRenovaciones />;
      case 'calendario':
        return <Calendario />;
      case 'tickets':
        return <Tickets />;
      case 'exagregadores':
        return <ExAgregadores />;
      case 'directorio':
        return (
          <DirectorioEnlaces
            sucursalName={formatSucursalName(activeSucursalId || user?.id_sucursal || 'Domena')}
          />
        );
      case 'usuarios':
        return isSuperAdmin ? <PanelUsuarios currentUser={user!} /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500 bg-[#FAFAFA]">Cargando...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] font-sans">
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 max-w-sm w-full text-center">
          <h1 className="text-2xl font-black text-[#111827] mb-2 tracking-tighter">
            Tableros<span className="text-[#E8450A]">Indicadores</span>
          </h1>
          <p className="text-[13px] text-gray-500 mb-8">Ingresa con tu cuenta de Google para acceder a tu tablero.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-[#111827] text-white font-bold py-3 px-4 rounded-[6px] transition-colors hover:bg-gray-800 text-[14px]"
          >
            Continuar con Google
          </button>
        </div>
      </div>
    );
  }

  // Interceptar al usuario si su perfil está incompleto (sin región o sucursal) o si tiene solicitud de admin en revisión
  // (Los usuarios con privilegios super_admin, lider_regional o lider_zona no requieren onboarding)
  const needsOnboarding = !isOnboardingCompleted && !isSuperAdmin && !isLiderRegional && !isLiderZona && (!user.region || !user.id_sucursal || user.solicitud_admin);

  if (needsOnboarding) {
    return (
      <OnboardingMenu
        user={user}
        onProfileCompleted={async (updatedProfile) => {
          setIsOnboardingCompleted(true);
          setUser(updatedProfile);
          useStore.setState({ isOnboarding: false });

          if (updatedProfile.rol === 'super_admin' || updatedProfile.rol === 'administrador' || updatedProfile.rol === 'lider_regional' || updatedProfile.rol === 'lider_zona') {
            try {
              const initialSuc = updatedProfile.id_sucursal || 'NL - Zona 1';
              setCurrentSucursal(initialSuc);
              useStore.setState({ activeSucursalId: initialSuc });
              loadAndApplyBoardData(initialSuc);
            } catch (e) {
              console.error(e);
            }
          } else {
            const userSuc = updatedProfile.id_sucursal || updatedProfile.uid;
            if (userSuc) {
              setCurrentSucursal(userSuc);
              useStore.setState({ activeSucursalId: userSuc });
              loadAndApplyBoardData(userSuc);
            }
          }
        }}
        onLogout={async () => {
          await signOut(auth);
          setIsOnboardingCompleted(false);
          setUser(null);
        }}
      />
    );
  }

  return (
    <div className="font-sans bg-[#F3F4F6] text-[#111827] min-h-screen">
      {/* Header */}
      <div className="bg-[#1A1A1A] px-5 py-3 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="text-xl font-black text-white tracking-tighter shrink-0">
            Tableros<span className="text-[#E8450A]">Indicadores</span><span className="text-gray-400 font-normal"> sucursales</span>
          </div>
          <div className="flex items-center text-[13px] sm:text-[14px] font-bold text-white border-l border-gray-700 pl-4 gap-2 whitespace-nowrap shrink-0">
            {isSuperAdmin ? (
              <>
                <span className="bg-[#E8450A] text-white text-[10px] px-2 py-0.5 rounded-[4px] uppercase tracking-wide">
                  👑 Super Admin
                </span>
                <span className="text-gray-400 font-normal mx-1">|</span>
                <span>{formatSucursalName(activeSucursalId)}</span>
              </>
            ) : isLiderRegional ? (
              <>
                <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-[4px] uppercase tracking-wide">
                  ⭐ Líder Regional
                </span>
                {user.region && (
                  <span className="bg-[#262626] text-gray-300 text-[10px] px-2 py-0.5 rounded-[4px] uppercase tracking-wide border border-gray-700">
                    Región {user.region}
                  </span>
                )}
                <span className="text-gray-400 font-normal mx-1">|</span>
                <span>{formatSucursalName(activeSucursalId || user.id_sucursal || '')}</span>
              </>
            ) : isLiderZona ? (
              <>
                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-[4px] uppercase tracking-wide">
                  🧭 Líder de Zona
                </span>
                {user.region && (
                  <span className="bg-[#262626] text-gray-300 text-[10px] px-2 py-0.5 rounded-[4px] uppercase tracking-wide border border-gray-700">
                    Región {user.region}
                  </span>
                )}
                <span className="text-gray-400 font-normal mx-1">|</span>
                <span>{formatSucursalName(activeSucursalId || user.id_sucursal || '')}</span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="bg-emerald-700 text-white text-[10px] px-2 py-0.5 rounded-[4px] uppercase tracking-wide">
                  🏢 Sucursal
                </span>
                {user.region && (
                  <span className="bg-[#262626] text-gray-300 text-[10px] px-2 py-0.5 rounded-[4px] uppercase tracking-wide border border-gray-700">
                    Región {user.region}
                  </span>
                )}
                <span>{formatSucursalName(user.id_sucursal || '')}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-end w-full md:w-auto">
          {isMultiSucursal && (
            <NavegacionCascada
              activeSucursalId={activeSucursalId}
              onSelectSucursal={(newSucursalId) => {
                loadAndApplyBoardData(newSucursalId);
              }}
              userRole={user?.rol}
              userRegion={user?.region}
              loading={loadingBoard}
            />
          )}
          <button
            onClick={exportarExcel}
            className="bg-[#E8450A] text-white border-none rounded-[5px] px-3.5 py-1.5 text-[11px] font-bold cursor-pointer transition-colors hover:bg-[#D03D08]"
          >
            📥 Exportar Excel
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="text-[10px] text-gray-400 font-bold ml-2 underline hover:text-white"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 flex gap-0 overflow-x-auto touch-pan-x">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={
              "px-4 py-3 text-[11px] font-bold cursor-pointer border-b-[3px] whitespace-nowrap transition-all duration-150 tracking-wide shrink-0 " +
              (activeTab === tab.id
                ? "text-[#E8450A] border-[#E8450A]"
                : "text-[#6B7280] border-transparent hover:text-[#111827] hover:bg-[#FAFAFA]")
            }
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Main Content (Full-Screen View) */}
      <div className="max-w-[1280px] mx-auto p-4 sm:p-2 sm:px-2 mt-4">
        {loadingBoard ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8450A] mb-4"></div>
            <span className="font-bold text-[13px]">Cargando tablero...</span>
          </div>
        ) : (
          renderCurrentView()
        )}
      </div>

      {/* Modals Manager handles all popups globally */}
      <ModalsManager />
    </div>
  );
}
