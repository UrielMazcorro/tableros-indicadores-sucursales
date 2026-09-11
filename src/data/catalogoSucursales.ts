// Catálogo Jerárquico Oficial (Región > Zona > Sucursal)
// Estructura oficial estricta: 5 Regiones, Zonas oficiales y Sucursales correspondientes

export interface SucursalItem {
  id: string;      // ID único de la sucursal en Firestore (ej: 'sucursal_valle')
  nombre: string;  // Nombre visual de la sucursal (ej: 'Sucursal Valle')
}

export interface ZonaItem {
  id: string;               // Identificador literal de zona (ej: 'NL - Zona 1')
  nombre: string;           // Nombre visible idéntico al ID oficial
  sucursales: SucursalItem[]; // Lista de sucursales que pertenecen a esta zona
}

export interface RegionItem {
  id: string;         // Código oficial de región ('NL', 'JAL', 'QRO', 'PUE', 'COAH')
  nombre: string;     // Nombre oficial idéntico al código
  zonas: ZonaItem[];  // Zonas oficiales de la región
}

/**
 * Formatea un id de sucursal de Firestore a un nombre legible de sucursal.
 * Ejemplo: 'sucursal_valle' -> 'Sucursal Valle'
 */
export function formatBranchDisplayName(id: string): string {
  if (!id) return '';
  if (id.startsWith('sucursal_')) {
    const raw = id.replace(/^sucursal_/, '');
    const formatted = raw
      .split(/[_\.]/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return `Sucursal ${formatted}`;
  }
  return id;
}

/**
 * Catálogo base predeterminado con zonas oficiales y sucursales base (ej. sucursal_valle).
 */
export const CATALOGO_REGIONES: RegionItem[] = [
  {
    id: 'NL',
    nombre: 'NL',
    zonas: [
      {
        id: 'NL - Zona 1',
        nombre: 'NL - Zona 1',
        sucursales: [
          { id: 'sucursal_valle', nombre: 'Sucursal Valle' },
        ],
      },
      {
        id: 'NL - Zona 2',
        nombre: 'NL - Zona 2',
        sucursales: [],
      },
      {
        id: 'NL - Zona 3',
        nombre: 'NL - Zona 3',
        sucursales: [],
      },
    ],
  },
  {
    id: 'JAL',
    nombre: 'JAL',
    zonas: [
      {
        id: 'JAL - Zona 1',
        nombre: 'JAL - Zona 1',
        sucursales: [],
      },
      {
        id: 'JAL - Zona 2',
        nombre: 'JAL - Zona 2',
        sucursales: [],
      },
    ],
  },
  {
    id: 'QRO',
    nombre: 'QRO',
    zonas: [
      {
        id: 'QRO - Zona 1',
        nombre: 'QRO - Zona 1',
        sucursales: [],
      },
    ],
  },
  {
    id: 'PUE',
    nombre: 'PUE',
    zonas: [
      {
        id: 'PUE - Zona 1',
        nombre: 'PUE - Zona 1',
        sucursales: [],
      },
    ],
  },
  {
    id: 'COAH',
    nombre: 'COAH',
    zonas: [
      {
        id: 'COAH - Zona 1',
        nombre: 'COAH - Zona 1',
        sucursales: [],
      },
    ],
  },
];

/**
 * Combina el catálogo estático con las sucursales leídas en tiempo real desde Firestore
 * asegurando que cada sucursal se agrupe bajo su Zona correspondiente sin duplicarse
 * y sin confundir sucursales con nombres de zonas.
 */
export function buildDynamicCatalog(
  firestoreSucursales: Array<{ id: string; region?: string; zona?: string; nombre?: string }>
): RegionItem[] {
  // Clon profundo del catálogo base
  const catalog: RegionItem[] = CATALOGO_REGIONES.map((reg) => ({
    ...reg,
    zonas: reg.zonas.map((zona) => ({
      ...zona,
      sucursales: [...zona.sucursales],
    })),
  }));

  // Conjunto de IDs de zonas para no agregarlas como sucursales por error
  const allZonaIds = new Set<string>();
  catalog.forEach((reg) => {
    reg.zonas.forEach((z) => allZonaIds.add(z.id));
  });

  // Agregar sucursales de Firestore
  firestoreSucursales.forEach((item) => {
    if (!item.id || allZonaIds.has(item.id)) return; // Evitar que una zona se añada como sucursal

    const displayName = item.nombre || formatBranchDisplayName(item.id);

    // 1. Si viene con zona explícita
    if (item.zona) {
      for (const reg of catalog) {
        const foundZona = reg.zonas.find((z) => z.id === item.zona);
        if (foundZona) {
          if (!foundZona.sucursales.some((s) => s.id === item.id)) {
            foundZona.sucursales.push({ id: item.id, nombre: displayName });
          }
          return;
        }
      }
    }

    // 2. Si viene con región explícita
    if (item.region) {
      const foundReg = catalog.find((r) => r.id === item.region);
      if (foundReg && foundReg.zonas.length > 0) {
        const targetZona = foundReg.zonas[0];
        if (!targetZona.sucursales.some((s) => s.id === item.id)) {
          targetZona.sucursales.push({ id: item.id, nombre: displayName });
        }
        return;
      }
    }

    // 3. Inferencia por nombre o ID (ej. 'sucursal_valle' -> NL - Zona 1)
    const lowerId = item.id.toLowerCase();
    let targetRegId = 'NL';
    let targetZonaId = 'NL - Zona 1';

    if (lowerId.includes('jal') || lowerId.includes('gdl') || lowerId.includes('zapopan')) {
      targetRegId = 'JAL';
      targetZonaId = 'JAL - Zona 1';
    } else if (lowerId.includes('qro') || lowerId.includes('juriquilla')) {
      targetRegId = 'QRO';
      targetZonaId = 'QRO - Zona 1';
    } else if (lowerId.includes('pue') || lowerId.includes('angelopolis')) {
      targetRegId = 'PUE';
      targetZonaId = 'PUE - Zona 1';
    } else if (lowerId.includes('coah') || lowerId.includes('saltillo')) {
      targetRegId = 'COAH';
      targetZonaId = 'COAH - Zona 1';
    }

    for (const reg of catalog) {
      if (reg.id === targetRegId) {
        const targetZona = reg.zonas.find((z) => z.id === targetZonaId) || reg.zonas[0];
        if (targetZona && !targetZona.sucursales.some((s) => s.id === item.id)) {
          targetZona.sucursales.push({ id: item.id, nombre: displayName });
        }
        return;
      }
    }
  });

  return catalog;
}

/**
 * Busca la jerarquía (región y zona) de una sucursal o zona por su ID.
 */
export function findHierarchyBySucursalId(
  targetId: string,
  customCatalog?: RegionItem[]
): {
  regionId: string;
  zonaId: string;
  sucursal?: SucursalItem;
} | null {
  if (!targetId) return null;
  const catalog = customCatalog || CATALOGO_REGIONES;

  for (const reg of catalog) {
    for (const zona of reg.zonas) {
      const suc = zona.sucursales.find((s) => s.id === targetId);
      if (suc) {
        return {
          regionId: reg.id,
          zonaId: zona.id,
          sucursal: suc,
        };
      }
      if (zona.id === targetId) {
        return {
          regionId: reg.id,
          zonaId: zona.id,
          sucursal: zona.sucursales[0],
        };
      }
    }
  }

  // Si no se encontró pero empieza con sucursal_valle o similar
  if (targetId.startsWith('sucursal_')) {
    return {
      regionId: 'NL',
      zonaId: 'NL - Zona 1',
      sucursal: { id: targetId, nombre: formatBranchDisplayName(targetId) },
    };
  }

  return null;
}

/**
 * Obtiene el nombre visual de la sucursal o zona.
 */
export function getNombreSucursal(targetId: string, customCatalog?: RegionItem[]): string {
  if (!targetId) return '';
  const hierarchy = findHierarchyBySucursalId(targetId, customCatalog);
  if (hierarchy?.sucursal) {
    return hierarchy.sucursal.nombre;
  }
  return formatBranchDisplayName(targetId);
}
