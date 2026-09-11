import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { initSucursalesRealtimeSync } from '../services/sucursalesSync';
import { MapPin, ChevronRight } from 'lucide-react';

interface NavegacionCascadaProps {
  /** ID de la sucursal activa en el estado global de Zustand */
  activeSucursalId: string;
  /** Callback que actualiza Zustand y recarga datos de Firestore (SÓLO se dispara en el 3er select) */
  onSelectSucursal: (sucursalId: string) => void;
  /** Rol del usuario actual */
  userRole?: string;
  /** Región asignada al usuario (ej. 'NL', 'JAL') si aplica */
  userRegion?: string;
  /** Estado de carga de tablero para deshabilitar temporalmente */
  loading?: boolean;
}

const REGION_LABELS: Record<string, string> = {
  NL: 'Nuevo León (NL)',
  JAL: 'Jalisco (JAL)',
  QRO: 'Querétaro (QRO)',
  PUE: 'Puebla (PUE)',
  COAH: 'Coahuila (COAH)',
};

export function NavegacionCascada({
  activeSucursalId,
  onSelectSucursal,
  userRole,
  userRegion,
  loading = false,
}: NavegacionCascadaProps) {
  // ─────────────────────────────────────────────────────────────
  // 1. LECTURA 100% DINÁMICA DEL ESTADO GLOBAL DE FIRESTORE
  // El menú se alimenta de los usuarios operativos ('usuario' = Sucursal)
  // sincronizados en tiempo real en Zustand sin catálogos estáticos.
  // ─────────────────────────────────────────────────────────────
  const sucursales = useStore((state) => state.sucursales);

  // Sincronización en tiempo real con Firestore
  useEffect(() => {
    const unsub = initSucursalesRealtimeSync();
    return () => unsub();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 2. ESTADOS LOCALES PARA FILTRADO EN CASCADA
  // Regla de Oro: Cambiar región o zona NO toca activeSucursalId en Zustand ni Firestore.
  // ─────────────────────────────────────────────────────────────
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedZona, setSelectedZona] = useState<string>('');
  const [selectedSucursal, setSelectedSucursal] = useState<string>('');

  // Sincronizar los 3 selects dinámicamente si ya existe una sucursal activa en el store
  useEffect(() => {
    if (activeSucursalId) {
      const foundInStore = sucursales.find((s) => s.id === activeSucursalId);
      if (foundInStore) {
        if (foundInStore.region) setSelectedRegion(foundInStore.region);
        if (foundInStore.zona) setSelectedZona(foundInStore.zona);
        setSelectedSucursal(foundInStore.id);
        return;
      }
    }

    if (userRegion && !selectedRegion && userRole === 'lider_regional') {
      setSelectedRegion(userRegion);
    }
  }, [activeSucursalId, sucursales, userRegion, userRole]);

  // ─────────────────────────────────────────────────────────────
  // 3. OPCIONES DERIVADAS DINÁMICAMENTE DE FIRESTORE
  // Flujo estricto: Select 1 (Región) ➔ Select 2 (Zona) ➔ Select 3 (Sucursal)
  // ─────────────────────────────────────────────────────────────

  // Select 1: Regiones únicas disponibles en el estado global
  const regionesDisponibles = useMemo(() => {
    const regSet = new Set<string>();
    sucursales.forEach((s) => {
      if (s.region && s.region.trim()) {
        regSet.add(s.region.trim());
      }
    });

    return Array.from(regSet).map((r) => ({
      id: r,
      nombre: REGION_LABELS[r] || r,
    }));
  }, [sucursales]);

  // Select 2: Zonas que corresponden ÚNICAMENTE a la Región seleccionada en el estado global
  const zonasDisponibles = useMemo(() => {
    if (!selectedRegion) return [];
    const zonaSet = new Set<string>();

    sucursales
      .filter((s) => s.region === selectedRegion)
      .forEach((s) => {
        if (s.zona && s.zona.trim()) {
          zonaSet.add(s.zona.trim());
        }
      });

    return Array.from(zonaSet)
      .sort()
      .map((z) => ({
        id: z,
        nombre: z,
      }));
  }, [selectedRegion, sucursales]);

  // Select 3: Sucursales cuya propiedad zona coincide exactamente con el Select 2
  const sucursalesFiltradas = useMemo(() => {
    if (!selectedZona) return [];
    return sucursales.filter((s) => s.zona === selectedZona);
  }, [selectedZona, sucursales]);

  // ─────────────────────────────────────────────────────────────
  // 4. LIMPIEZA DE ESTADOS LOCALES AL CAMBIAR SELECTS
  // ─────────────────────────────────────────────────────────────

  // Select 1 (Región): Al cambiar, limpia Zona (Select 2) y Sucursal (Select 3)
  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRegion = e.target.value;
    setSelectedRegion(newRegion);
    setSelectedZona('');      // Limpia Select 2 (Zona)
    setSelectedSucursal('');  // Limpia Select 3 (Sucursal)
  };

  // Select 2 (Zona): Al cambiar, limpia Sucursal (Select 3)
  const handleZonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newZona = e.target.value;
    setSelectedZona(newZona);
    setSelectedSucursal('');  // Limpia Select 3 (Sucursal)
  };

  // Select 3 (Sucursal): Dispara actualización de Zustand y Firestore al seleccionar
  const handleSucursalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSucursal = e.target.value;
    setSelectedSucursal(newSucursal);

    if (newSucursal) {
      onSelectSucursal(newSucursal);
    }
  };

  return (
    <div
      id="navegacion-cascada-header"
      className="flex items-center gap-1.5 md:gap-2 flex-wrap bg-[#24262A] p-1.5 rounded-lg border border-gray-700/80 shadow-inner"
    >
      <div className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-gray-400 pl-1 pr-1.5">
        <MapPin className="w-3.5 h-3.5 text-[#E8450A]" />
        <span className="whitespace-nowrap">Navegación:</span>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SELECT 1: REGIÓN */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <select
          id="select-region"
          aria-label="Seleccionar Región"
          value={selectedRegion}
          onChange={handleRegionChange}
          disabled={loading}
          className="bg-[#1C1E22] hover:bg-[#2A2C31] text-gray-100 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border border-gray-700/80 outline-none focus:ring-1 focus:ring-[#E8450A] focus:border-[#E8450A] cursor-pointer transition-colors max-w-[130px] truncate"
        >
          <option value="" disabled>
            1. Región...
          </option>
          {regionesDisponibles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </select>
        <ChevronRight className="w-3 h-3 text-gray-500 hidden sm:block shrink-0" />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SELECT 2: ZONA (Dependiente de Región) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <select
          id="select-zona"
          aria-label="Seleccionar Zona"
          value={selectedZona}
          onChange={handleZonaChange}
          disabled={!selectedRegion || loading}
          className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-md border outline-none transition-colors max-w-[160px] truncate ${
            !selectedRegion || loading
              ? 'bg-[#18191C] border-gray-800 text-gray-500 opacity-50 cursor-not-allowed'
              : 'bg-[#1C1E22] hover:bg-[#2A2C31] text-gray-100 border-gray-700/80 focus:ring-1 focus:ring-[#E8450A] focus:border-[#E8450A] cursor-pointer'
          }`}
        >
          <option value="" disabled>
            {selectedRegion ? '2. Zona...' : '2. Elige Región'}
          </option>
          {zonasDisponibles.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}
            </option>
          ))}
        </select>
        <ChevronRight className="w-3 h-3 text-gray-500 hidden sm:block shrink-0" />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SELECT 3: SUCURSALES (Filtrado: user.zona === selectedZona && user.rol === 'usuario') */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <select
          id="select-sucursal"
          aria-label="Seleccionar Sucursal"
          value={selectedSucursal}
          onChange={handleSucursalChange}
          disabled={!selectedZona || loading || sucursalesFiltradas.length === 0}
          className={`text-[11px] font-bold px-3 py-1.5 rounded-md border outline-none transition-all max-w-[190px] truncate ${
            !selectedZona || loading || sucursalesFiltradas.length === 0
              ? 'bg-[#18191C] border-gray-800 text-gray-500 opacity-50 cursor-not-allowed'
              : 'bg-[#1C1E22] hover:bg-[#2A2C31] text-amber-300 border-amber-600/50 hover:border-amber-500 focus:ring-2 focus:ring-[#E8450A] cursor-pointer shadow-sm'
          }`}
        >
          <option value="" disabled>
            {!selectedZona
              ? '3. Elige Zona'
              : sucursalesFiltradas.length === 0
              ? 'Sin sucursales en esta zona'
              : 'Selecciona Sucursal'}
          </option>
          {sucursalesFiltradas.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-1 pl-1 text-[10px] font-bold text-amber-400 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="hidden xl:inline">Cargando...</span>
        </div>
      )}
    </div>
  );
}
