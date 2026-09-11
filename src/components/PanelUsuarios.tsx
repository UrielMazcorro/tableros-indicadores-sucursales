import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, collection, onSnapshot, serverTimestamp, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { useStore, SucursalAsignada } from '../store';
import { 
  Users, 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  Search, 
  Building2, 
  CheckCircle2, 
  Crown,
  Award,
  Layers,
  Compass,
  Trash2
} from 'lucide-react';

export type RoleType = 'super_admin' | 'lider_regional' | 'lider_zona' | 'usuario';

interface UserItem {
  uid: string;
  email?: string;
  nombre?: string;
  displayName?: string;
  rol?: RoleType | 'administrador' | string;
  id_sucursal?: string;
  region?: string;
  zona?: string;
  solicitud_admin?: boolean;
  fechaRegistro?: any;
  fechaSolicitudAdmin?: any;
  updatedAt?: any;
}

interface PanelUsuariosProps {
  currentUser: {
    uid: string;
    email?: string;
    rol?: string;
    [key: string]: any;
  };
}

export const ROLES_CONFIG: Record<string, { label: string; badgeClass: string; icon: any }> = {
  super_admin: {
    label: 'Super Admin',
    badgeClass: 'bg-gray-900 text-amber-300 border border-gray-800 shadow-2xs',
    icon: Crown,
  },
  lider_regional: {
    label: 'Líder Regional',
    badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs',
    icon: Award,
  },
  lider_zona: {
    label: 'Líder de Zona',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs',
    icon: Compass,
  },
  usuario: {
    label: 'Sucursal',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs',
    icon: Building2,
  },
};

export function PanelUsuarios({ currentUser }: PanelUsuariosProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Zonas disponibles calculadas dinámicamente desde los usuarios de Firestore
  const availableZonas = useMemo(() => {
    const standardZonas = [
      'NL - Zona 1',
      'NL - Zona 2',
      'NL - Zona 3',
      'JAL - Zona 1',
      'JAL - Zona 2',
      'QRO - Zona 1',
      'PUE - Zona 1',
      'COAH - Zona 1',
    ];
    const set = new Set<string>(standardZonas);
    users.forEach((usr) => {
      if (usr.zona && typeof usr.zona === 'string' && usr.zona.trim()) {
        set.add(usr.zona.trim());
      }
    });
    return Array.from(set);
  }, [users]);

  // Estados locales para selección de rol al aprobar solicitudes pendientes
  const [approvalRoles, setApprovalRoles] = useState<Record<string, RoleType>>({});

  // Feedback visual temporal por usuario (ej. "Guardado", "Aprobado", etc.)
  const [feedbacks, setFeedbacks] = useState<Record<string, { type: 'success' | 'error'; message: string }>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'super_admin' | 'lider_regional' | 'lider_zona' | 'usuario'>('all');

  const isSuperAdmin = currentUser.rol === 'super_admin' || currentUser.rol === 'administrador';

  // Mostrar mensaje de feedback temporal (desaparece en 2.5s)
  const showFeedback = (uid: string, message: string, type: 'success' | 'error' = 'success') => {
    setFeedbacks((prev) => ({ ...prev, [uid]: { type, message } }));
    setTimeout(() => {
      setFeedbacks((prev) => {
        const next = { ...prev };
        delete next[uid];
        return next;
      });
    }, 2500);
  };

  const [userToDelete, setUserToDelete] = useState<{uid: string, id_sucursal?: string} | null>(null);

  // ─────────────────────────────────────────────────────────────
  // 1. CONSULTA EN TIEMPO REAL (onSnapshot) A LA COLECCIÓN "usuarios"
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSuperAdmin) {
      setError('Acceso denegado. Se requiere rol de Super Admin.');
      setLoading(false);
      return;
    }

    setLoading(true);
    const usersColRef = collection(db, 'usuarios');

    const unsubscribeUsers = onSnapshot(
      usersColRef,
      (snapshot) => {
        const userList: UserItem[] = [];
        snapshot.forEach((docSnap) => {
          userList.push({ uid: docSnap.id, ...docSnap.data() } as UserItem);
        });

        // Ordenar: primero los que tienen solicitud pendiente, luego por nombre/email
        userList.sort((a, b) => {
          if (a.solicitud_admin && !b.solicitud_admin) return -1;
          if (!a.solicitud_admin && b.solicitud_admin) return 1;
          const nameA = (a.nombre || a.email || '').toLowerCase();
          const nameB = (b.nombre || b.email || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setUsers(userList);
        setLoading(false);
      },
      (err) => {
        console.error('Error escuchando usuarios:', err);
        setError('Error al escuchar la colección de usuarios en tiempo real.');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeUsers();
    };
  }, [currentUser.rol, isSuperAdmin]);

  // ─────────────────────────────────────────────────────────────
  // 2. ASIGNACIÓN DIRECTA DE ZONA A SUCURSAL (Usuario = Sucursal)
  // Regla 1: Inyección exacta en usuarios/{uid} y tableros/{id_sucursal}
  // Regla 3: Actualización inmediata de UI y del estado global Zustand
  // ─────────────────────────────────────────────────────────────
  const handleSucursalChange = async (targetUid: string, selectedZona: string) => {
    setActionLoading((prev) => ({ ...prev, [targetUid]: true }));

    const targetUser = users.find((u) => u.uid === targetUid);
    const id_sucursal = targetUser?.id_sucursal || targetUid;
    const derivedRegion = selectedZona ? selectedZona.split(' ')[0] : (targetUser?.region || '');

    // 1. Lógica de Extracción y Capitalización del Nombre desde Email
    const rawName = targetUser?.email
      ? targetUser.email.split('@')[0]
      : (targetUser?.nombre || targetUser?.displayName || id_sucursal || '');
    const formattedName = rawName
      ? rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase()
      : '';

    // Actualización inmediata de UI en el componente
    setUsers((prev) =>
      prev.map((u) =>
        u.uid === targetUid
          ? { ...u, zona: selectedZona, region: derivedRegion, id_sucursal }
          : u
      )
    );

    // 2. Inyección Consistente del Nombre Formateado en Zustand (Header / NavegacionCascada)
    const currentSucursales = useStore.getState().sucursales;
    const existingIndex = currentSucursales.findIndex(
      (s) => s.id === id_sucursal || s.usuarioUid === targetUid
    );
    const updatedEntry: SucursalAsignada = {
      id: id_sucursal,
      nombre: formattedName || id_sucursal,
      region: derivedRegion,
      zona: selectedZona,
      usuarioUid: targetUid,
      usuarioNombre: formattedName || targetUser?.nombre || targetUser?.displayName || targetUser?.email,
      rol: (targetUser?.rol as any) || 'usuario',
    };

    const updatedSucursales =
      existingIndex >= 0
        ? currentSucursales.map((s, idx) => (idx === existingIndex ? { ...s, ...updatedEntry } : s))
        : [...currentSucursales, updatedEntry];
    useStore.getState().setSucursales(updatedSucursales);

    try {
      const userDocRef = doc(db, 'usuarios', targetUid);
      const tableroDocRef = doc(db, 'tableros', id_sucursal);

      const userPayload: Record<string, any> = {
        zona: selectedZona,
        updatedAt: serverTimestamp(),
      };
      if (derivedRegion) userPayload.region = derivedRegion;
      if (!targetUser?.id_sucursal) userPayload.id_sucursal = id_sucursal;

      // 3. Inyección Consistente del Nombre Formateado en Firestore (tableros)
      const tableroPayload: Record<string, any> = {
        id: id_sucursal,
        id_sucursal: id_sucursal,
        zona: selectedZona,
        nombre: formattedName,
        nombre_sucursal: formattedName,
        lastUpdated: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (derivedRegion) tableroPayload.region = derivedRegion;

      // Escritura dual en Firestore sin catálogos estáticos
      await Promise.all([
        setDoc(userDocRef, userPayload, { merge: true }),
        setDoc(tableroDocRef, tableroPayload, { merge: true }),
      ]);

      showFeedback(targetUid, 'Zona guardada y sincronizada');
    } catch (err: any) {
      console.error('Error al actualizar zona y tablero:', err);
      showFeedback(targetUid, 'Error al guardar', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUid]: false }));
    }
  };

  // Cambio directo de rol con sincronización opcional de tablero
  const handleRoleChange = async (targetUid: string, newRole: RoleType) => {
    setActionLoading((prev) => ({ ...prev, [targetUid]: true }));
    try {
      const targetUser = users.find((u) => u.uid === targetUid);
      const userDocRef = doc(db, 'usuarios', targetUid);
      const userPayload: Record<string, any> = {
        rol: newRole,
        updatedAt: serverTimestamp(),
      };

      const operations: Promise<any>[] = [
        setDoc(userDocRef, userPayload, { merge: true }),
      ];

      const sucursalId = targetUser?.id_sucursal || targetUid;
      if (sucursalId && targetUser?.zona) {
        const tableroDocRef = doc(db, 'tableros', sucursalId);
        const tableroPayload: Record<string, any> = {
          id: sucursalId,
          id_sucursal: sucursalId,
          zona: targetUser.zona,
          lastUpdated: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (targetUser.region) tableroPayload.region = targetUser.region;
        operations.push(setDoc(tableroDocRef, tableroPayload, { merge: true }));
      }

      await Promise.all(operations);
      const roleLabel = ROLES_CONFIG[newRole]?.label || newRole;
      showFeedback(targetUid, `Rol cambiado a ${roleLabel}`);
    } catch (err: any) {
      console.error('Error al cambiar rol:', err);
      showFeedback(targetUid, 'Error al cambiar rol', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUid]: false }));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. APROBACIÓN DE SOLICITUDES CON ACTUALIZACIÓN DUAL
  // ─────────────────────────────────────────────────────────────
  const handleAprobarSolicitud = async (targetUid: string) => {
    const chosenRole = approvalRoles[targetUid] || 'usuario';
    const targetUser = users.find((u) => u.uid === targetUid);
    setActionLoading((prev) => ({ ...prev, [targetUid]: true }));

    try {
      const userDocRef = doc(db, 'usuarios', targetUid);
      const userPayload: Record<string, any> = {
        rol: chosenRole,
        solicitud_admin: false,
        updatedAt: serverTimestamp(),
      };

      const sucursalId = targetUser?.id_sucursal || targetUid;
      const operations: Promise<any>[] = [];

      if (sucursalId && targetUser?.zona) {
        const tableroDocRef = doc(db, 'tableros', sucursalId);
        const tableroPayload: Record<string, any> = {
          id: sucursalId,
          id_sucursal: sucursalId,
          zona: targetUser.zona,
          lastUpdated: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (targetUser.region) tableroPayload.region = targetUser.region;
        operations.push(setDoc(tableroDocRef, tableroPayload, { merge: true }));
      }

      operations.push(setDoc(userDocRef, userPayload, { merge: true }));

      await Promise.all(operations);
      const roleLabel = ROLES_CONFIG[chosenRole]?.label || chosenRole;
      showFeedback(targetUid, `Aprobado como ${roleLabel}`);
    } catch (err: any) {
      console.error('Error al aprobar solicitud:', err);
      showFeedback(targetUid, 'Error al aprobar', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUid]: false }));
    }
  };

  // Rechazar Solicitud: queda con rol base 'usuario' (Sucursal)
  const handleRechazarSolicitud = async (targetUid: string) => {
    setActionLoading((prev) => ({ ...prev, [targetUid]: true }));
    try {
      const userDocRef = doc(db, 'usuarios', targetUid);
      await updateDoc(userDocRef, {
        rol: 'usuario',
        solicitud_admin: false,
        updatedAt: serverTimestamp(),
      });
      showFeedback(targetUid, 'Solicitud Rechazada');
    } catch (err: any) {
      console.error('Error al rechazar solicitud:', err);
      showFeedback(targetUid, 'Error al rechazar', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUid]: false }));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. AUTO-HEALING: Reparación de nombres corruptos de Sucursales
  // ─────────────────────────────────────────────────────────────
  const healCorruptedBranchNames = async () => {
    try {
      const batch = writeBatch(db);
      let count = 0;

      users.forEach((u) => {
        // Lógica de Detección (El Escáner)
        const isCorrupted = 
          (u.nombre === u.zona && u.nombre) || 
          (u.nombre && (u.nombre.startsWith('NL -') || u.nombre.startsWith('QRO -') || u.nombre.startsWith('JAL -') || u.nombre.startsWith('PUE -') || u.nombre.startsWith('COAH -')));

        if (isCorrupted && u.email) {
          // Lógica de Reparación
          const rawEmail = u.email.split('@')[0];
          const capitalizedName = rawEmail.charAt(0).toUpperCase() + rawEmail.slice(1).toLowerCase();
          const aestheticName = `Sucursal ${capitalizedName}`;

          // Actualizar documento del usuario
          const userRef = doc(db, 'usuarios', u.uid);
          batch.update(userRef, { nombre: aestheticName });

          // Actualizar documento del tablero
          const targetSucursalId = u.id_sucursal || u.uid;
          const tableroRef = doc(db, 'tableros', targetSucursalId);
          batch.update(tableroRef, {
            nombre: aestheticName,
            nombre_sucursal: aestheticName
          });
          
          // Actualizar Zustand para refresco visual instantáneo en la sesión activa si aplica
          const currentSucursales = useStore.getState().sucursales;
          const updatedSucursales = currentSucursales.map(s => 
            s.id === targetSucursalId || s.usuarioUid === u.uid 
              ? { ...s, nombre: aestheticName, usuarioNombre: aestheticName } 
              : s
          );
          useStore.getState().setSucursales(updatedSucursales);

          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        alert(`¡Sanación completada! Se repararon ${count} sucursales corruptas.`);
      } else {
        alert('No se encontraron sucursales corruptas. Todo está en orden.');
      }
    } catch (err) {
      console.error('Error al reparar nombres:', err);
      alert('Ocurrió un error durante la reparación.');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. ELIMINACIÓN DUAL Y ATÓMICA (Usuario + Tablero) - CUSTOM MODAL
  // ─────────────────────────────────────────────────────────────
  const confirmAndDelete = async () => {
    if (!userToDelete) return;
    
    const { uid, id_sucursal } = userToDelete;
    
    try {
      setActionLoading((prev) => ({ ...prev, [uid]: true }));
      setUserToDelete(null); // Close modal immediately to show loading on table
      
      const deletePromises = [];
      deletePromises.push(deleteDoc(doc(db, 'usuarios', uid)));
      
      const sucursalIdToDelete = id_sucursal || uid;
      if (sucursalIdToDelete) {
        deletePromises.push(deleteDoc(doc(db, 'tableros', sucursalIdToDelete)));
      }

      await Promise.all(deletePromises);

      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      
      const currentSucursales = useStore.getState().sucursales;
      useStore.getState().setSucursales(
        currentSucursales.filter((s) => s.id !== sucursalIdToDelete && s.usuarioUid !== uid)
      );

      showFeedback(uid, 'Usuario eliminado', 'success');
      console.log('Usuario eliminado con éxito');
    } catch (error: any) {
      console.error("🔥 Error de Firebase:", error);
      showFeedback(uid, 'Error al eliminar', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [uid]: false }));
    }
  };

  const requestDeleteUser = (uid: string, id_sucursal?: string) => {
    setUserToDelete({ uid, id_sucursal });
  };

  // Normalizar rol para display / comparaciones
  const getNormalizedRole = (rol?: string): RoleType => {
    if (rol === 'super_admin' || rol === 'administrador') return 'super_admin';
    if (rol === 'lider_regional') return 'lider_regional';
    if (rol === 'lider_zona') return 'lider_zona';
    return 'usuario';
  };

  // Filtrado de usuarios
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      (u.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.id_sucursal || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.region || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const normRole = getNormalizedRole(u.rol);

    if (filterType === 'pending') return Boolean(u.solicitud_admin);
    if (filterType === 'super_admin') return normRole === 'super_admin';
    if (filterType === 'lider_regional') return normRole === 'lider_regional';
    if (filterType === 'lider_zona') return normRole === 'lider_zona';
    if (filterType === 'usuario') return normRole === 'usuario';

    return true;
  });

  const pendingCount = users.filter((u) => u.solicitud_admin).length;
  const superAdminCount = users.filter((u) => getNormalizedRole(u.rol) === 'super_admin').length;
  const liderRegionalCount = users.filter((u) => getNormalizedRole(u.rol) === 'lider_regional').length;
  const liderZonaCount = users.filter((u) => getNormalizedRole(u.rol) === 'lider_zona').length;
  const usuarioSucursalCount = users.filter((u) => getNormalizedRole(u.rol) === 'usuario').length;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#E8450A] rounded-full animate-spin" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cargando Gestión de Usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Error de Acceso</h4>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* ENCABEZADO Y RESUMEN ESTRATÉGICO */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#E8450A] text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
              Panel Corporativo
            </span>
            <span className="text-gray-400 text-xs">• 4 Niveles de Roles</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#E8450A]" />
            Gestión de Usuarios y Permisos
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            Control centralizado de acceso. Asigna y audita los 4 niveles operativos: Super Admin, Líder Regional, Líder de Zona y Sucursal.
          </p>
          <button
            onClick={healCorruptedBranchNames}
            className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
            Reparar Nombres de Sucursales
          </button>
        </div>

        {/* Tarjetas de Conteo */}
        <div className="flex items-center gap-2 flex-wrap">
          {pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-300 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-2xs animate-pulse">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-amber-800">Pendientes</p>
                <p className="text-base font-black text-amber-900 leading-tight">{pendingCount}</p>
              </div>
            </div>
          )}
          <div className="bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5">
            <Crown className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-500">Super Admins</p>
              <p className="text-base font-black text-gray-900 leading-tight">{superAdminCount}</p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5">
            <Award className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-500">Regionales</p>
              <p className="text-base font-black text-gray-900 leading-tight">{liderRegionalCount}</p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5">
            <Compass className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-500">Zonas</p>
              <p className="text-base font-black text-gray-900 leading-tight">{liderZonaCount}</p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-500">Sucursales</p>
              <p className="text-base font-black text-gray-900 leading-tight">{usuarioSucursalCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o sucursal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#E8450A] focus:border-transparent transition-all"
          />
        </div>

        {/* Pestañas de Filtro Rápido */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterType === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({users.length})
          </button>
          <button
            onClick={() => setFilterType('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              filterType === 'pending'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            Pendientes ({pendingCount})
          </button>
          <button
            onClick={() => setFilterType('super_admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterType === 'super_admin'
                ? 'bg-gray-900 text-amber-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Super Admins
          </button>
          <button
            onClick={() => setFilterType('lider_regional')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterType === 'lider_regional'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Líder Regional
          </button>
          <button
            onClick={() => setFilterType('lider_zona')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterType === 'lider_zona'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Líder de Zona
          </button>
          <button
            onClick={() => setFilterType('usuario')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterType === 'usuario'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Sucursal
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TABLA DE AUDITORÍA Y GESTIÓN EN TIEMPO REAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-700">No se encontraron usuarios</p>
            <p className="text-xs text-gray-400 mt-0.5">Intenta con otro término de búsqueda o limpia los filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Usuario / Email</th>
                  <th className="py-3.5 px-4">Rol Operativo (Jerárquico)</th>
                  <th className="py-3.5 px-4">Asignación de Zona / Sucursal</th>
                  <th className="py-3.5 px-4">Estatus</th>
                  <th className="py-3.5 px-4 text-right">Aprobación / Privilegios</th>
                  <th className="py-3.5 px-4 text-center w-16">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredUsers.map((u) => {
                  const isPending = Boolean(u.solicitud_admin);
                  const normRole = getNormalizedRole(u.rol);
                  const roleConfig = ROLES_CONFIG[normRole] || ROLES_CONFIG['usuario'];
                  const RoleIcon = roleConfig.icon;
                  const feedback = feedbacks[u.uid];
                  const isLoadingAction = actionLoading[u.uid];

                  return (
                    <tr
                      key={u.uid}
                      className={`transition-colors duration-150 ${
                        isPending
                          ? 'bg-amber-50/70 border-l-4 border-l-amber-500 hover:bg-amber-100/50'
                          : 'hover:bg-gray-50/80'
                      }`}
                    >
                      {/* Columna 1: Usuario / Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                            normRole === 'super_admin'
                              ? 'bg-gray-900 text-amber-400'
                              : normRole === 'lider_regional'
                              ? 'bg-indigo-600 text-white'
                              : normRole === 'lider_zona'
                              ? 'bg-blue-600 text-white'
                              : isPending
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {(u.nombre || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate">
                              {u.nombre || u.displayName || 'Sin nombre'}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate font-mono">
                              {u.email || 'Sin correo'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Columna 2: Rol Actual (Super Admin > Líder Regional > Líder de Zona > Sucursal) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black ${roleConfig.badgeClass}`}>
                            <RoleIcon className="w-3.5 h-3.5 shrink-0" />
                            {roleConfig.label}
                          </span>

                          {/* Selector rápido para modificar rol directamente (Super Admin > Líder Regional > Líder de Zona > Sucursal) */}
                          {!isPending && u.uid !== currentUser.uid && (
                            <select
                              value={normRole}
                              onChange={(e) => handleRoleChange(u.uid, e.target.value as RoleType)}
                              disabled={isLoadingAction}
                              className="text-[10px] font-semibold bg-transparent border border-gray-300 rounded px-1.5 py-0.5 text-gray-600 outline-none hover:bg-gray-100 cursor-pointer"
                              title="Cambiar rol operativo"
                            >
                              <option value="super_admin">Super Admin</option>
                              <option value="lider_regional">Líder Regional</option>
                              <option value="lider_zona">Líder de Zona</option>
                              <option value="usuario">Sucursal</option>
                            </select>
                          )}
                        </div>
                      </td>

                      {/* Columna 3: Asignación de Sucursal/Zona (Agrupado por Zona usando <optgroup>) */}
                      <td className="py-3.5 px-4">
                        {normRole === 'super_admin' ? (
                          <span className="text-[11px] font-bold text-gray-400 italic flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            Control Total (Todas las Zonas)
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              value={u.zona || ''}
                              disabled={isLoadingAction}
                              onChange={(e) => handleSucursalChange(u.uid, e.target.value)}
                              className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-[#E8450A] focus:border-transparent cursor-pointer shadow-2xs max-w-[240px]"
                            >
                              <option value="" disabled>-- Asignar Zona --</option>
                              {availableZonas.map((zonaStr) => (
                                <option key={zonaStr} value={zonaStr}>
                                  📍 {zonaStr}
                                </option>
                              ))}
                            </select>

                            {/* Feedback visual de guardado */}
                            {feedback && (
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${
                                  feedback.type === 'success'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                {feedback.message}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Columna 4: Estatus */}
                      <td className="py-3.5 px-4">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Solicitud Pendiente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Activo
                          </span>
                        )}
                      </td>

                      {/* Columna 5: Aprobación de Solicitudes (4 Roles: Super Admin > Líder Regional > Líder de Zona > Sucursal) */}
                      <td className="py-3.5 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Selector del rol a conceder */}
                            <select
                              value={approvalRoles[u.uid] || 'usuario'}
                              onChange={(e) =>
                                setApprovalRoles((prev) => ({
                                  ...prev,
                                  [u.uid]: e.target.value as RoleType,
                                }))
                              }
                              disabled={isLoadingAction}
                              className="bg-white border border-amber-300 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-800 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
                              title="Selecciona el rol con el que se aprobará"
                            >
                              <option value="super_admin">Super Admin</option>
                              <option value="lider_regional">Líder Regional</option>
                              <option value="lider_zona">Líder de Zona</option>
                              <option value="usuario">Sucursal</option>
                            </select>

                            {/* Botón Aprobar */}
                            <button
                              onClick={() => handleAprobarSolicitud(u.uid)}
                              disabled={isLoadingAction}
                              title="Aprobar solicitud con el rol seleccionado"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aprobar</span>
                            </button>

                            {/* Botón Rechazar */}
                            <button
                              onClick={() => handleRechazarSolicitud(u.uid)}
                              disabled={isLoadingAction}
                              title="Rechazar solicitud y asignar rol Sucursal"
                              className="bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-700 border border-gray-200 font-bold px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Rechazar</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium">
                            {normRole === 'super_admin' ? 'Total' : normRole === 'lider_regional' ? 'Regional' : normRole === 'lider_zona' ? 'Zona' : 'Sucursal'}
                          </span>
                        )}
                      </td>

                      {/* Columna 6: Acciones destructivas */}
                      <td className="py-3.5 px-4 text-center">
                        <button 
                          onClick={(e) => { 
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            requestDeleteUser(u.uid, u.id_sucursal); 
                          }}
                          title="Eliminar usuario definitivamente"
                          className="relative z-50 pointer-events-auto inline-flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors cursor-pointer shadow-sm hover:shadow-md"
                        >
                          <Trash2 className="w-4 h-4 pointer-events-none" />
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
      {/* MODAL DE ELIMINACIÓN CUSTOM (Bypass de iframes restrictivos) */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[999999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full border border-red-100">
            <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              ¿Eliminar Usuario?
            </h3>
            <p className="text-sm text-gray-600 mb-6 font-medium leading-relaxed">
              Estás a punto de eliminar permanentemente a este usuario y destruir su tablero operativo. <span className="text-red-600 font-bold">Esta acción no se puede deshacer.</span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAndDelete}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
