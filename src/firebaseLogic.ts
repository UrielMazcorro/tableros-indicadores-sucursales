import { auth, db, provider, signInWithPopup, doc, getDoc, setDoc, serverTimestamp, collection, getDocs, onSnapshot } from './firebase';

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if user document exists
    const userRef = doc(db, 'usuarios', user.uid);
    const userSnap = await getDoc(userRef);
    
    const emailPrefix = user.email ? user.email.split('@')[0] : 'general';
    const defaultSucursalId = `sucursal_${emailPrefix}`;

    if (!userSnap.exists()) {
      // Registrar usuario con rol base 'usuario' pero sin región ni sucursal para activar el Onboarding
      const initialData = {
        uid: user.uid,
        email: user.email || '',
        nombre: user.displayName || 'Usuario Nuevo',
        rol: 'usuario',
        fechaRegistro: serverTimestamp(),
      };
      await setDoc(userRef, initialData);
      return { ...initialData, isNew: true };
    }
    
    return { uid: user.uid, ...userSnap.data(), isNew: false };
  } catch (error: any) {
    console.error("Error signing in: ", error);
    if (error.code === 'auth/unauthorized-domain' || error.message?.includes('org_internal') || error.message?.includes('403')) {
      alert("Acceso denegado: Tu cuenta no tiene permisos para acceder a este entorno (Tableros indicadores sucursales). Verifica que el correo pertenezca a la organización correcta o contacta al administrador.");
    } else {
      alert("Ocurrió un error al iniciar sesión en Tableros indicadores sucursales. Inténtalo de nuevo.");
    }
    throw error;
  }
}

export async function saveTableroData(id_sucursal: string, data: any) {
  if (!id_sucursal) {
    throw new Error('El usuario no tiene una sucursal asignada.');
  }

  try {
    const tableroRef = doc(db, 'tableros', id_sucursal);
    await setDoc(tableroRef, {
      id_sucursal,
      ...data,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    console.log("Tablero guardado con éxito.");
  } catch (error) {
    console.error("Error al guardar el tablero: ", error);
    throw error;
  }
}

export const INITIAL_DASHBOARD_STATE = {
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
  composicion: {}
};

export async function loadTableroData(id_sucursal: string) {
  if (!id_sucursal) return null;
  const tableroRef = doc(db, 'tableros', id_sucursal);
  
  try {
    const snap = await getDoc(tableroRef);
    if (!snap.exists()) {
      // 1. Guardia de Seguridad (Bloqueo por Prefijo)
      if (!id_sucursal.startsWith('sucursal_')) {
        console.warn(`[Guardia Eager] Bloqueo de creación prematura. ID inválido: ${id_sucursal}`);
        return null;
      }

      // 2. Inyección de Nombre Estético (Fallback)
      const rawName = id_sucursal.replace('sucursal_', '');
      const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
      const aestheticName = `Sucursal ${capitalizedName}`;

      const initialData = {
        id_sucursal,
        nombre: aestheticName,
        nombre_sucursal: aestheticName,
        ...INITIAL_DASHBOARD_STATE,
        lastUpdated: serverTimestamp()
      };
      
      console.log(`[Eager Initialization] Creando tablero inicial para la sucursal: ${id_sucursal}`);
      await setDoc(tableroRef, initialData, { merge: true });
      return initialData;
    }
    return snap.data();
  } catch (error) {
    console.error(`Error en loadTableroData para la sucursal ${id_sucursal}:`, error);
    // Return standard initial state structure so the application doesn't crash on network/permission temporary issues
    return {
      id_sucursal,
      ...INITIAL_DASHBOARD_STATE,
      lastUpdated: null
    };
  }
}

export async function getAllTablerosAsAdmin() {
  try {
    // Note: Assuming the security rules validate that only 'administrador' can read the entire collection
    const tablerosCol = collection(db, 'tableros');
    const snapshot = await getDocs(tablerosCol);
    
    const todosLosTableros: any[] = [];
    snapshot.forEach(doc => {
      todosLosTableros.push({ id: doc.id, ...doc.data() });
    });
    
    return todosLosTableros;
  } catch (error) {
    console.error("Error obteniendo los tableros (¿es administrador?): ", error);
    throw error;
  }
}
