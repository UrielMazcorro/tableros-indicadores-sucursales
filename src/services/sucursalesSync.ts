import { db, collection, onSnapshot } from '../firebase';
import { useStore, SucursalAsignada } from '../store';

/**
 * Cruza los usuarios operativos ('usuario' = Sucursal/Tablero) y tableros
 * desde Firestore hacia el estado global de Zustand sin depender de catálogos estáticos.
 */
export function buildSucursalesCruzadas(
  usuarios: any[] = [],
  tableros: any[] = []
): SucursalAsignada[] {
  const sucursalesMap = new Map<string, SucursalAsignada>();

  // 1. Poblado dinámico desde la colección 'usuarios' (Usuarios con rol 'usuario' SON las sucursales)
  usuarios.forEach((u) => {
    // Si el usuario tiene id_sucursal o es usuario operativo
    const sucursalId = u.id_sucursal || u.uid;
    if (!sucursalId) return;

    let region = u.region || '';
    const zona = u.zona || '';
    if (!region && zona) {
      region = zona.split(' ')[0] || '';
    }

    const rawEmail = u.email ? u.email.split('@')[0] : '';
    const cleanRaw = u.nombre && !u.nombre.includes('@')
      ? u.nombre
      : u.displayName && !u.displayName.includes('@')
      ? u.displayName
      : rawEmail || sucursalId;
    const displayName = cleanRaw
      ? cleanRaw.charAt(0).toUpperCase() + cleanRaw.slice(1).toLowerCase()
      : sucursalId;

    sucursalesMap.set(sucursalId, {
      id: sucursalId,
      nombre: displayName,
      region: region,
      zona: zona,
      usuarioUid: u.uid,
      usuarioNombre: u.nombre || u.displayName || u.email,
      rol: u.rol || 'usuario',
    });
  });

  // 2. Cruzar con tableros en Firestore
  tableros.forEach((t) => {
    if (!t.id) return;
    const existing = sucursalesMap.get(t.id);
    if (existing) {
      if (t.zona) existing.zona = t.zona;
      if (t.region) existing.region = t.region;
      if (t.nombre || t.nombre_sucursal) {
        existing.nombre = t.nombre || t.nombre_sucursal;
      }
    } else {
      let region = t.region || '';
      if (!region && t.zona) {
        region = t.zona.split(' ')[0] || '';
      }
      sucursalesMap.set(t.id, {
        id: t.id,
        nombre: t.nombre || t.nombre_sucursal || t.id,
        region: region,
        zona: t.zona || '',
        rol: 'usuario',
      });
    }
  });

  return Array.from(sucursalesMap.values());
}

/**
 * Inicia el listener en tiempo real de Firestore para mantener el estado
 * global en Zustand (`useStore.getState().sucursales`) sincronizado
 * permanentemente con los datos de Firestore.
 */
export function initSucursalesRealtimeSync() {
  let currentUsers: any[] = [];
  let currentTableros: any[] = [];

  const updateStore = () => {
    const list = buildSucursalesCruzadas(currentUsers, currentTableros);
    useStore.getState().setSucursales(list);
  };

  // Carga inicial
  updateStore();

  let unsubUsers = () => {};
  let unsubTableros = () => {};

  try {
    unsubUsers = onSnapshot(
      collection(db, 'usuarios'),
      (snap) => {
        const users: any[] = [];
        snap.forEach((doc) => {
          users.push({ uid: doc.id, ...doc.data() });
        });
        currentUsers = users;
        updateStore();
      },
      (err) => {
        console.warn('Advertencia al escuchar usuarios en realtime:', err.message);
      }
    );
  } catch (e) {
    console.warn('Error inicializando listener usuarios:', e);
  }

  try {
    unsubTableros = onSnapshot(
      collection(db, 'tableros'),
      (snap) => {
        const tableros: any[] = [];
        snap.forEach((doc) => {
          tableros.push({ id: doc.id, ...doc.data() });
        });
        currentTableros = tableros;
        updateStore();
      },
      (err) => {
        console.warn('Advertencia al escuchar tableros en realtime:', err.message);
      }
    );
  } catch (e) {
    console.warn('Error inicializando listener tableros:', e);
  }

  return () => {
    unsubUsers();
    unsubTableros();
  };
}
