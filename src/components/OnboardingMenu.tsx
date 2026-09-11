import React, { useState } from 'react';
import { auth, db, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '../firebase';
import { useStore } from '../store';
import { 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  LogOut, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export const REGIONES = [
  { id: 'NL', nombre: 'NL — Nuevo León' },
  { id: 'JAL', nombre: 'JAL — Jalisco' },
  { id: 'QRO', nombre: 'QRO — Querétaro' },
  { id: 'PUE', nombre: 'PUE — Puebla' },
  { id: 'COAH', nombre: 'COAH — Coahuila' },
];

export const SUCURSALES_POR_REGION: Record<string, { id: string; nombre: string }[]> = {
  NL: [
    { id: 'NL - Zona 1', nombre: 'NL - Zona 1' },
    { id: 'NL - Zona 2', nombre: 'NL - Zona 2' },
    { id: 'NL - Zona 3', nombre: 'NL - Zona 3' },
  ],
  JAL: [
    { id: 'JAL - Zona 1', nombre: 'JAL - Zona 1' },
    { id: 'JAL - Zona 2', nombre: 'JAL - Zona 2' },
  ],
  QRO: [
    { id: 'QRO - Zona 1', nombre: 'QRO - Zona 1' },
  ],
  PUE: [
    { id: 'PUE - Zona 1', nombre: 'PUE - Zona 1' },
  ],
  COAH: [
    { id: 'COAH - Zona 1', nombre: 'COAH - Zona 1' },
  ],
};

export const ZONAS_POR_REGION = SUCURSALES_POR_REGION;

interface OnboardingMenuProps {
  user: {
    uid: string;
    email?: string;
    nombre?: string;
    displayName?: string;
    rol?: string;
    region?: string;
    id_sucursal?: string;
    solicitud_admin?: boolean;
    fechaRegistro?: any;
    [key: string]: any;
  };
  onProfileCompleted: (updatedUser: any) => void;
  onLogout: () => void;
}

export function OnboardingMenu({ user, onProfileCompleted, onLogout }: OnboardingMenuProps) {
  const [selectedRegion, setSelectedRegion] = useState<string>(user.region || '');
  const [selectedZona, setSelectedZona] = useState<string>(user.zona || user.id_sucursal || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [showAdminConfirmModal, setShowAdminConfirmModal] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Determinar si ya tiene solicitud de admin activa (solo si no es super_admin, administrador ni lider_regional)
  const isPrivileged = user.rol === 'super_admin' || user.rol === 'administrador' || user.rol === 'lider_regional';
  const isPendingAdmin = Boolean(user.solicitud_admin && !isPrivileged);
  const [currentView, setCurrentView] = useState<'selection' | 'pending_admin'>(
    isPendingAdmin ? 'pending_admin' : 'selection'
  );

  // Manejador de cambio de región (cascada)
  const handleRegionChange = (newRegion: string) => {
    setSelectedRegion(newRegion);
    setSelectedZona(''); // Resetear zona al cambiar de región
    setErrorMsg(null);
  };

  // Guardar y entrar como Líder de Sucursal (Región y Zona a cargo)
  const handleGuardarYEntrar = async () => {
    if (!selectedRegion || !selectedZona) {
      setErrorMsg('Por favor selecciona tanto tu Región como tu Zona a cargo para continuar.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const userRef = doc(db, 'usuarios', user.uid);

      // 1. Blindaje de Extracción del Email (Evitar Fallbacks a UID y displayName)
      const effectiveEmail = user.email || auth.currentUser?.email || '';
      const rawEmailName = effectiveEmail ? effectiveEmail.split('@')[0] : 'nueva';
      
      const emailPrefixLower = rawEmailName.toLowerCase();
      const emailPrefixCapitalized = rawEmailName.charAt(0).toUpperCase() + rawEmailName.slice(1).toLowerCase();

      // Generación Estándar del ID de Sucursal basado ÚNICAMENTE en el correo
      const targetSucursalId = `sucursal_${emailPrefixLower}`;

      // Asignación del Nombre Estético
      const formattedBranchName = `Sucursal ${emailPrefixCapitalized}`;

      const updateData = {
        nombre: formattedBranchName,
        region: selectedRegion,
        zona: selectedZona, // Se guarda exclusivamente en 'zona'
        id_sucursal: targetSucursalId, // ID forzado en base al correo electrónico
        solicitud_admin: false,
        updatedAt: serverTimestamp(),
      };

      // 1. Ejecutar updateDoc en el perfil del usuario en Firestore (con fallback a setDoc)
      try {
        await updateDoc(userRef, updateData);
      } catch (err: any) {
        await setDoc(userRef, {
          uid: user.uid,
          email: effectiveEmail,
          rol: user.rol || 'usuario',
          ...updateData,
          fechaRegistro: user.fechaRegistro || serverTimestamp(),
        }, { merge: true });
      }

      // 2. Inicialización/actualización no bloqueante del documento del tablero
      const tableroRef = doc(db, 'tableros', targetSucursalId);
      await setDoc(tableroRef, {
        id: targetSucursalId,
        id_sucursal: targetSucursalId,
        region: selectedRegion,
        zona: selectedZona,
        nombre: formattedBranchName,
        nombre_sucursal: formattedBranchName,
        lastUpdated: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch((err) => {
        console.warn('Aviso inicializando tablero:', err);
      });

      // 3. ACTUALIZACIÓN INMEDIATA DEL ESTADO EN ZUSTAND
      useStore.setState({
        activeSucursalId: targetSucursalId,
        isOnboarding: false,
        // (La lógica del header en App.tsx extraerá el nombre directamente del objeto user o catálogo)
      });

      // 4. ACTUALIZACIÓN DEL ESTADO DE REACT Y ENRUTAMIENTO INMEDIATO
      onProfileCompleted({
        ...user,
        email: effectiveEmail,
        nombre: formattedBranchName,
        region: selectedRegion,
        zona: selectedZona,
        id_sucursal: targetSucursalId,
        solicitud_admin: false,
      });
    } catch (error: any) {
      console.error('Error al guardar perfil:', error);
      setErrorMsg('No se pudo guardar la asignación. Intenta de nuevo o verifica tu conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Solicitar ser Administrador
  const handleConfirmAdminRequest = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const userRef = doc(db, 'usuarios', user.uid);
      const adminRequestData = {
        solicitud_admin: true,
        rol: 'usuario', // Asegurar que su rol se mantenga como "usuario"
        fechaSolicitudAdmin: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Actualizar documento en la colección usuarios con updateDoc
      try {
        await updateDoc(userRef, adminRequestData);
      } catch (err: any) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          nombre: user.displayName || user.nombre || 'Usuario',
          ...adminRequestData,
          fechaRegistro: user.fechaRegistro || serverTimestamp(),
        }, { merge: true });
      }

      setShowAdminConfirmModal(false);
      setCurrentView('pending_admin');
    } catch (error: any) {
      console.error('Error al solicitar rol de administrador:', error);
      setErrorMsg('Error al enviar la solicitud de administrador. Inténtalo más tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verificar si un administrador ya aprobó la cuenta
  const handleCheckApproval = async () => {
    setIsCheckingStatus(true);
    setStatusMessage(null);
    try {
      const userRef = doc(db, 'usuarios', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const freshData = snap.data();
        if (freshData.rol === 'super_admin' || freshData.rol === 'administrador' || freshData.rol === 'lider_regional') {
          const roleLabel = freshData.rol === 'super_admin' ? 'Super Admin' : freshData.rol === 'lider_regional' ? 'Líder Regional' : 'Administrador';
          setStatusMessage(`¡Tu cuenta ha sido aprobada como ${roleLabel}! Redirigiendo...`);
          setTimeout(() => {
            onProfileCompleted({ uid: user.uid, ...freshData });
          }, 1200);
          return;
        } else if (!freshData.solicitud_admin && freshData.id_sucursal && freshData.region) {
          setStatusMessage('¡Se ha configurado tu asignación de sucursal! Redirigiendo...');
          setTimeout(() => {
            onProfileCompleted({ uid: user.uid, ...freshData });
          }, 1200);
          return;
        } else {
          setStatusMessage('Tu solicitud sigue en revisión por el Administrador Central.');
        }
      } else {
        setStatusMessage('No se encontró el registro. Vuelve a iniciar sesión.');
      }
    } catch (e) {
      console.error(e);
      setStatusMessage('Error al verificar el estado en la nube.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // VISTA 1: PANTALLA BLOQUEADA DE "ACCESO PENDIENTE"
  // ─────────────────────────────────────────────────────────────
  if (currentView === 'pending_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-xl border border-[#E5E7EB] max-w-md w-full p-8 text-center relative overflow-hidden">
          {/* Barra superior de acento */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />

          {/* Icono de estado */}
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-200 shadow-sm">
            <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            Acceso Pendiente
          </div>

          <h2 className="text-2xl font-black text-[#111827] tracking-tight mb-2">
            Solicitud en Revisión
          </h2>

          <p className="text-[13.5px] text-[#4B5563] leading-relaxed mb-6 font-medium">
            Tu solicitud como administrador está en revisión. Contacta a soporte para su aprobación.
          </p>

          {/* Tarjeta de detalles del usuario */}
          <div className="bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] p-4 text-left mb-6 text-[12px] space-y-2">
            <div className="flex justify-between items-center py-1 border-b border-[#E5E7EB]">
              <span className="text-gray-500 font-medium">Usuario:</span>
              <span className="font-bold text-[#111827] truncate max-w-[200px]">{user.email}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#E5E7EB]">
              <span className="text-gray-500 font-medium">Rol Actual:</span>
              <span className="font-bold text-gray-700 bg-gray-200 px-2 py-0.5 rounded text-[11px]">
                {user.rol || 'usuario'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 font-medium">Estado de Solicitud:</span>
              <span className="font-bold text-amber-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-ping" />
                Pendiente de Aprobación
              </span>
            </div>
          </div>

          {statusMessage && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-[12px] font-medium text-center">
              {statusMessage}
            </div>
          )}

          {/* Acciones */}
          <div className="space-y-2.5">
            <button
              onClick={handleCheckApproval}
              disabled={isCheckingStatus}
              className="w-full bg-[#111827] text-white hover:bg-black font-bold py-3 px-4 rounded-xl text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
              {isCheckingStatus ? 'Verificando estatus...' : 'Verificar Aprobación Ahora'}
            </button>

            <button
              onClick={onLogout}
              className="w-full bg-white hover:bg-[#F9FAFB] text-[#4B5563] hover:text-[#111827] font-bold py-2.5 px-4 rounded-xl text-[12px] border border-[#E5E7EB] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>

          <div className="mt-5 text-[11px] text-gray-400">
            La pantalla permanecerá bloqueada hasta que un administrador autorice el rol desde la base de datos.
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VISTA 2: FORMULARIO DE ONBOARDING (REGIÓN Y ZONA A CARGO)
  // ─────────────────────────────────────────────────────────────
  const sucursalesDisponibles = selectedRegion ? SUCURSALES_POR_REGION[selectedRegion] || [] : [];

  // Nombre de usuario estético (solo prefijo de correo capitalizado)
  const effectiveEmail = user.email || auth.currentUser?.email || '';
  const rawEmail = effectiveEmail ? effectiveEmail.split('@')[0] : 'Nueva';
  const cleanUserName = rawEmail.charAt(0).toUpperCase() + rawEmail.slice(1).toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl border border-[#E5E7EB] max-w-lg w-full p-8 relative overflow-hidden">
        {/* Barra superior de acento con color de marca */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E8450A]" />

        {/* Encabezado */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FFF5F0] border border-[#FCD9CC] mb-3 text-[#E8450A] shadow-sm">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight">
            Tableros<span className="text-[#E8450A]">Indicadores</span>
          </h1>
          <p className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">
            Configuración Inicial de Perfil
          </p>
          <p className="text-[13.5px] text-gray-600 mt-2 max-w-sm mx-auto leading-relaxed">
            Bienvenido. Para acceder, selecciona tu región y tu zona a cargo.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[12px] flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario en Cascada */}
        <div className="space-y-4">
          {/* Paso 1: Región */}
          <div>
            <label className="block text-[12px] font-bold text-[#374151] mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#E8450A]" />
              1. Selecciona tu Región
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="w-full bg-[#FAFAFA] border border-[#D1D5DB] rounded-xl px-3.5 py-3 text-[13px] font-bold text-[#111827] outline-none focus:ring-2 focus:ring-[#E8450A] focus:border-transparent transition-all cursor-pointer"
            >
              <option value="">-- Selecciona una Región (5 Regiones) --</option>
              {REGIONES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Paso 2: Zona a Cargo (Dependiente de Región) */}
          <div>
            <label className="block text-[12px] font-bold text-[#374151] mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#E8450A]" />
              Zona
            </label>
            <select
              value={selectedZona}
              onChange={(e) => {
                setSelectedZona(e.target.value);
                setErrorMsg(null);
              }}
              disabled={!selectedRegion}
              className={`w-full border rounded-xl px-3.5 py-3 text-[13px] font-bold outline-none transition-all cursor-pointer ${
                !selectedRegion
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[#FAFAFA] border-[#D1D5DB] text-[#111827] focus:ring-2 focus:ring-[#E8450A] focus:border-transparent'
              }`}
            >
              <option value="">-- Selecciona tu Zona --</option>
              {sucursalesDisponibles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Botón Principal: Guardar y Entrar */}
          <button
            onClick={handleGuardarYEntrar}
            disabled={!selectedRegion || !selectedZona || isSubmitting}
            className="w-full mt-2 bg-[#E8450A] hover:bg-[#D03D08] text-white font-bold py-3.5 px-4 rounded-xl text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Guardando configuración...</span>
              </div>
            ) : (
              <>
                <span>Guardar y Entrar al Tablero</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Separador */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E5E7EB]" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-white px-3 text-gray-400 font-bold">Opciones Avanzadas</span>
          </div>
        </div>

        {/* Enlace Sutil para Solicitar Administrador */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowAdminConfirmModal(true)}
            className="text-[12px] text-gray-500 hover:text-[#E8450A] font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer hover:underline"
          >
            <ShieldCheck className="w-4 h-4 text-gray-400 hover:text-[#E8450A]" />
            ¿Eres Administrador Regional/Global? Solicita acceso aquí
          </button>
        </div>

        {/* Botón secundario para salir */}
        <div className="mt-5 pt-4 border-t border-[#F3F4F6] flex justify-center">
          <button
            onClick={onLogout}
            className="text-[11px] font-bold text-gray-400 hover:text-gray-700 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión e ingresar con otra cuenta
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE SOLICITUD DE ADMIN */}
      {showAdminConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-[#FFF5F0] rounded-xl flex items-center justify-center mx-auto mb-4 border border-[#FCD9CC] text-[#E8450A]">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-[#111827] mb-2">
              Solicitar Rol de Administrador
            </h3>

            <p className="text-[12.5px] text-gray-600 leading-relaxed mb-6 font-normal">
              Esta opción es exclusiva para Directores y Administradores Regionales con supervisión sobre múltiples sucursales.
              <br /><br />
              Al solicitar acceso, tu cuenta pasará a estado de <strong className="text-amber-700 font-bold">Revisión</strong> y quedará bloqueada hasta que el equipo de soporte o administración central apruebe tus permisos en la base de datos.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowAdminConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl text-[12.5px] cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAdminRequest}
                disabled={isSubmitting}
                className="flex-1 bg-[#111827] hover:bg-black text-white font-bold py-2.5 px-4 rounded-xl text-[12.5px] cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Solicitud
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
