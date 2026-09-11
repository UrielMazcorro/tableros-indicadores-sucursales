import React, { useState, useEffect } from 'react';

interface DirectorioEnlacesProps {
  sucursalName?: string;
}

interface InstrSection {
  n: string;
  t: string;
  content: React.ReactNode;
}

const INSTR_SECTIONS: InstrSection[] = [
  {
    n: '1',
    t: 'Estructura general del tablero',
    content: (
      <>
        <p className="mb-2">El tablero está organizado en pestañas, agrupadas en dos filas para que sea más fácil de navegar:</p>
        <p className="mb-2"><b>Fila 1 — Operación diaria:</b> Dashboard, Indicadores, Checklist, Registro de Venta, Calendario, Seguimiento a Renovaciones, Tickets, Ex-Agregadores.</p>
        <p className="mb-2"><b>Fila 2 — Recursos y comunicación:</b> Links de Trabajo, Comunicación Interna, Directorio Laboral, Proveedores, Servicios Básicos, Notas, Dudas y Comentarios, Igualas de Mantenimiento, Instructivo de Uso.</p>
        <p className="mb-2">En la parte superior derecha encontrarás tres botones que aplican a todo el tablero:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li><b>Descargar respaldo</b> — guarda un archivo con toda la información capturada hasta ese momento.</li>
          <li><b>Restaurar respaldo</b> — carga un respaldo descargado previamente.</li>
          <li><b>Exportar Excel</b> — descarga en un archivo de Excel el Registro de Venta, los Checklists, Tickets y Ex-Agregadores.</li>
        </ul>
      </>
    ),
  },
  {
    n: '2',
    t: 'Dashboard',
    content: (
      <>
        <p className="mb-2">Es la pantalla principal — te da un resumen rápido de cómo va la sucursal en el mes: indicadores financieros, avance de los checklists de hoy, composición de membresías y las bitácoras de turno.</p>
        <ul className="list-disc ml-5 space-y-1 mb-2">
          <li><b>Tarjetas de indicadores</b> — muestran meta vs. alcance de MRR, Venta Nueva, Ingreso Total, Usuarios, Ticket Promedio y Churn Rate, más las membresías.</li>
          <li><b>Checklist LS y CA — Hoy</b> — cuántas actividades del día ya completó cada rol.</li>
          <li><b>Composición de membresías</b> — gráfica de qué porcentaje de tus socios son mensuales vs. anuales.</li>
          <li><b>Bitácora LS / CA</b> — notas de turno que puedes navegar por fecha (hasta 10 notas por día).</li>
        </ul>
        <p>Los colores de las tarjetas son un semáforo: <span className="text-[#16A34A] font-bold">verde (90% a 100% de la meta)</span>, <span className="text-[#D97706] font-bold">amarillo (70% a 89%)</span> y <span className="text-[#DC2626] font-bold">rojo (69% o menos)</span>.</p>
      </>
    ),
  },
  {
    n: '3',
    t: 'Indicadores',
    content: (
      <>
        <p className="mb-2">Aquí capturas, mes a mes, las metas y los resultados reales de la sucursal. Usa las flechas junto al mes para moverte entre meses.</p>
        <table className="w-full border-collapse text-[12px] my-2.5">
          <thead>
            <tr className="bg-[#1A1A1A] text-white">
              <th className="p-1.5 text-left">Indicador</th>
              <th className="p-1.5 text-left">Cómo se llena</th>
              <th className="p-1.5 text-left">Notas</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#F9FAFB]"><td className="p-1.5 font-semibold">MRR</td><td className="p-1.5">Meta y alcance manual</td><td className="p-1.5">Ingreso recurrente mensual</td></tr>
            <tr><td className="p-1.5 font-semibold">Venta Nueva</td><td className="p-1.5">Meta y alcance manual</td><td className="p-1.5">Ventas nuevas del mes</td></tr>
            <tr className="bg-[#F9FAFB]"><td className="p-1.5 font-semibold">Ingreso Total</td><td className="p-1.5">Se calcula solo</td><td className="p-1.5">MRR + Venta Nueva (no se edita)</td></tr>
            <tr><td className="p-1.5 font-semibold">Usuarios</td><td className="p-1.5">Meta fija en 1,500 + alcance manual</td><td className="p-1.5">Puedes cambiar la meta si es necesario</td></tr>
            <tr className="bg-[#F9FAFB]"><td className="p-1.5 font-semibold">Ticket Promedio</td><td className="p-1.5">Se calcula solo</td><td className="p-1.5">(MRR + Venta Nueva) / Usuarios</td></tr>
            <tr><td className="p-1.5 font-semibold">Churn Rate</td><td className="p-1.5">Meta y alcance manual</td><td className="p-1.5">Porcentaje de cancelación del mes</td></tr>
          </tbody>
        </table>
        <p className="mb-1"><b>Membresías:</b> Membresías Mensuales, Membresías Anuales, Renovaciones — cada una con su meta y alcance.</p>
        <p className="mb-1"><b>Botones:</b> "Guardar indicadores" guarda lo capturado; "Limpiar mes" borra todos los datos de ese mes (no se puede deshacer).</p>
        <p><b>Historial:</b> debajo de los indicadores hay una tabla con el resumen de los últimos 6 meses.</p>
      </>
    ),
  },
  {
    n: '4',
    t: 'Checklist (Líder de Sucursal y Club Assistance)',
    content: (
      <>
        <p className="mb-2">Contiene las actividades diarias del Líder de Sucursal (LS) y el Club Assistance (CA), con su horario sugerido.</p>
        <ul className="list-disc ml-5 space-y-1 mb-2">
          <li>Usa los botones Checklist LS / Checklist CA para cambiar entre los dos checklists.</li>
          <li>Navega entre semanas con las flechas y selecciona el día que quieres capturar.</li>
          <li>Marca la casilla conforme completas cada actividad — se guarda al instante.</li>
          <li>Puedes agregar una nota corta a cada actividad en la columna "Nota".</li>
        </ul>
        <p>Las filas ya completadas se muestran tachadas y en gris, para ver de un vistazo qué falta.</p>
      </>
    ),
  },
  {
    n: '5',
    t: 'Registro de Venta',
    content: (
      <>
        <p className="mb-2">Aquí registras cada venta o inscripción de la sucursal. Usa el botón "Registrar venta" para capturar una nueva.</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Captura fecha, nombre completo, ID del socio, plan contratado, monto, medio de pago (Terminal, Pin Pad, Link de pago, Transferencia o Automático Evo), si firmó contrato y si domicilió tarjeta.</li>
          <li>La tabla se filtra automáticamente por el mes que estés viendo.</li>
          <li>Arriba verás totales del mes: monto total, ventas por tipo de plan, contratos firmados pendientes y tarjetas por domiciliar.</li>
        </ul>
      </>
    ),
  },
  {
    n: '6',
    t: 'Seguimiento post-venta',
    content: (
      <>
        <p className="mb-2">Debajo del Registro de Venta, el tablero genera automáticamente alertas para dar seguimiento a los socios nuevos, según los días transcurridos desde su inscripción (día 1, 4, 10, 20 y 30 para Mensual/Anual/Reactivación; día 1, 10, 20 y 30 para Renovación).</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Usa los botones "Pendientes" / "Todos" para filtrar qué alertas ver.</li>
          <li>Toca el botón de cada alerta para marcarla como "Realizado" una vez que ya contactaste al socio.</li>
          <li>El mensaje ya incluye el nombre real del socio automáticamente.</li>
        </ul>
      </>
    ),
  },
  {
    n: '7',
    t: 'Rutinas de Entrenamiento',
    content: (
      <>
        <p className="mb-2">También dentro de Registro de Venta, esta tabla muestra a los socios con plan nuevo o reactivación del mes en curso.</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Arriba se muestra un resumen de cuántas rutinas lleva asignadas cada coach, y cuántos socios están "Sin asignar".</li>
          <li>Toca "¿Requiere rutina?" para marcar si ese socio necesita rutina o no.</li>
          <li>Toca "¿Rutina asignada?" para alternar entre Sí / No.</li>
          <li>Escribe el nombre del coach — al escribirlo, se marca automáticamente como asignada.</li>
        </ul>
      </>
    ),
  },
  {
    n: '8',
    t: 'Calendario',
    content: (
      <>
        <p className="mb-2">Muestra las actividades recurrentes del mes (correos de productividad, informes semanales, inventarios, incidencias, One on One, etc.) además de las que tú agregues manualmente.</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Usa las flechas para cambiar de mes y toca cualquier día para ver el detalle.</li>
          <li>Usa "Agregar" para crear una actividad nueva, o el ícono de lápiz para editar una existente.</li>
          <li>Marca cada actividad como "Realizado" conforme la completas.</li>
          <li>Si ocultas una actividad recurrente por error, usa "Restaurar ocultas" para recuperarla.</li>
        </ul>
      </>
    ),
  },
  {
    n: '9',
    t: 'Seguimiento a Renovaciones',
    content: (
      <p>Acceso directo a la carpeta de Google Drive de la región donde se trabaja la base de datos de socios para renovaciones. El botón siempre abre la versión más reciente de la carpeta.</p>
    ),
  },
  {
    n: '10',
    t: 'Tickets',
    content: (
      <>
        <p className="mb-2">Registro de incidencias de Mantenimiento, Tecnología y Equipo de la sucursal.</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Usa "Nuevo ticket" para levantar un ticket con folio, categoría, descripción, estatus y quién lo reportó.</li>
          <li>Filtra por categoría con los botones de arriba.</li>
          <li>Toca el estatus de un ticket para alternar entre Abierto y Cerrado.</li>
        </ul>
      </>
    ),
  },
  {
    n: '11',
    t: 'Ex-Agregadores',
    content: (
      <p>Registro de socios que migraron de Total Pass o Wellhub a un plan de Station. Usa "Registrar migración" para capturar nombre, ID, de dónde venía y el plan Station contratado.</p>
    ),
  },
  {
    n: '12',
    t: 'Pestañas de recursos y comunicación',
    content: (
      <>
        <p className="mb-2">Estas pestañas son accesos directos a documentos y carpetas externas:</p>
        <table className="w-full border-collapse text-[12px] my-2.5">
          <thead>
            <tr className="bg-[#1A1A1A] text-white">
              <th className="p-1.5 text-left">Pestaña</th>
              <th className="p-1.5 text-left">Contenido</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#F9FAFB]"><td className="p-1.5 font-semibold">Links de Trabajo</td><td className="p-1.5">Carpeta de Google Drive con documentos generales</td></tr>
            <tr><td className="p-1.5 font-semibold">Comunicación Interna</td><td className="p-1.5">Formatos y diseños de Canva</td></tr>
            <tr className="bg-[#F9FAFB]"><td className="p-1.5 font-semibold">Directorio Laboral</td><td className="p-1.5">Directorio de contactos laborales</td></tr>
            <tr><td className="p-1.5 font-semibold">Proveedores</td><td className="p-1.5">Listado de proveedores de la sucursal</td></tr>
            <tr className="bg-[#F9FAFB]"><td className="p-1.5 font-semibold">Servicios Básicos</td><td className="p-1.5">Control de servicios (luz, agua, internet, etc.)</td></tr>
            <tr><td className="p-1.5 font-semibold">Igualas de Mantenimiento</td><td className="p-1.5">Calendario de igualas de mantenimiento de la sucursal</td></tr>
          </tbody>
        </table>
      </>
    ),
  },
  {
    n: '13',
    t: 'Notas y Dudas y Comentarios',
    content: (
      <>
        <p className="mb-2"><b>Notas:</b> espacio de texto libre para que el líder escriba lo que necesite — se guarda automáticamente mientras escribes.</p>
        <p><b>Dudas y Comentarios:</b> acceso directo a la hoja de cálculo donde se registran dudas y comentarios de la sucursal hacia la región.</p>
      </>
    ),
  },
  {
    n: '14',
    t: 'Respaldo y Exportación de datos',
    content: (
      <>
        <p className="mb-2">El tablero cuenta con estos botones, ubicados en la parte superior, para exportar o recuperar tu información cuando lo necesites:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li><b>Descargar respaldo</b> — descarga un archivo con toda la información capturada.</li>
          <li><b>Restaurar respaldo</b> — carga un respaldo descargado previamente.</li>
          <li><b>Exportar Excel</b> — descarga un archivo de Excel con Registro de Venta, Checklist LS, Checklist CA, Tickets y Ex-Agregadores.</li>
        </ul>
      </>
    ),
  },
];

type DirTabId =
  | 'links'
  | 'comunicacion'
  | 'dirlaboral'
  | 'proveedores'
  | 'serviciosbasicos'
  | 'notas'
  | 'dudas'
  | 'igualas'
  | 'instructivo';

interface TabItem {
  id: DirTabId;
  label: string;
}

const DIR_TABS: TabItem[] = [
  { id: 'links', label: '🔗 Links de Trabajo' },
  { id: 'comunicacion', label: '📣 Comunicación Interna' },
  { id: 'dirlaboral', label: '📇 Directorio Laboral' },
  { id: 'proveedores', label: '📦 Proveedores' },
  { id: 'serviciosbasicos', label: '💡 Servicios Básicos' },
  { id: 'notas', label: '📝 Notas' },
  { id: 'dudas', label: '💬 Dudas y Comentarios' },
  { id: 'igualas', label: '🔨 Igualas de Mantenimiento' },
  { id: 'instructivo', label: '📖 Instructivo de Uso' },
];

export function DirectorioEnlaces({ sucursalName = 'Domena' }: DirectorioEnlacesProps) {
  const [activeTab, setActiveTab] = useState<DirTabId>('links');
  const [notas, setNotas] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('domena_v3_notasLibres') ||
        localStorage.getItem('notasLibres') ||
        ''
      );
    } catch {
      return '';
    }
  });
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('domena_v3_notasLibres', notas);
        localStorage.setItem('notasLibres', notas);
      } catch (err) {
        console.error(err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [notas]);

  const handleNotasChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotas(e.target.value);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1500);
  };

  const scrollToInstr = (n: string) => {
    const el = document.getElementById(`instr-sec-${n}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Sub-navegación interna del Directorio y Enlaces */}
      <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-2 flex gap-1 overflow-x-auto touch-pan-x shadow-sm">
        {DIR_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-[11px] font-bold cursor-pointer rounded-[6px] whitespace-nowrap transition-all duration-150 tracking-wide shrink-0 border-none ${
                isActive
                  ? 'text-[#E8450A] bg-[#FFF5F0] font-extrabold shadow-sm'
                  : 'text-[#6B7280] bg-transparent hover:text-[#111827] hover:bg-[#F9FAFB]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenido de la sección seleccionada */}
      <div>
        {/* 1. LINKS DE TRABAJO */}
          {activeTab === 'links' && (
            <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 sm:p-[18px] shadow-sm">
              <div className="text-[12px] font-bold tracking-wide uppercase mb-3 flex items-center gap-[7px]">
                🔗 Links de Trabajo
              </div>
              <div className="text-[11px] text-[#6B7280] mb-4">
                Accesos directos a carpetas y documentos de trabajo de la sucursal.
              </div>
              <div className="bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[10px] p-5 text-center">
                <div className="text-[32px] mb-2.5">📁</div>
                <div className="text-[13px] font-bold mb-3.5">
                  Links de Trabajo — {sucursalName}
                </div>
                <a
                  href="https://drive.google.com/drive/folders/1NFmdksXg9xvnZYonJewbnoeAHtggLznt?usp=drive_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#E8450A] text-white no-underline px-[22px] py-2.5 rounded-[6px] text-[12px] font-bold transition-all hover:brightness-90 shadow-sm"
                >
                  Abrir carpeta de Google Drive
                </a>
              </div>
            </div>
          )}

          {/* 2. COMUNICACIÓN INTERNA */}
          {activeTab === 'comunicacion' && (
            <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 sm:p-[18px] shadow-sm">
              <div className="text-[12px] font-bold tracking-wide uppercase mb-3 flex items-center gap-[7px]">
                📣 Comunicación Interna
              </div>
              <div className="text-[11px] text-[#6B7280] mb-4">
                Materiales y diseños de comunicación para la sucursal.
              </div>
              <div className="bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[10px] p-5 text-center">
                <div className="text-[32px] mb-2.5">🎨</div>
                <div className="text-[13px] font-bold mb-1">Formatos</div>
                <div className="text-[11px] text-[#6B7280] mb-3.5">Diseño en Canva</div>
                <a
                  href="https://www.canva.com/design/DAGiyeMDHOM/gxsco2ufMrwyHBRpI4VRZg/edit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#E8450A] text-white no-underline px-[22px] py-2.5 rounded-[6px] text-[12px] font-bold transition-all hover:brightness-90 shadow-sm"
                >
                  Abrir en Canva
                </a>
              </div>
            </div>
          )}

          {/* 3. DIRECTORIO LABORAL */}
          {activeTab === 'dirlaboral' && (
            <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 sm:p-[18px] shadow-sm">
              <div className="text-[12px] font-bold tracking-wide uppercase mb-3 flex items-center gap-[7px]">
                📇 Directorio Laboral
              </div>
              <div className="text-[11px] text-[#6B7280] mb-4">
                Directorio de contactos laborales de la sucursal y la región.
              </div>
              <div className="bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[10px] p-5 text-center">
                <div className="text-[32px] mb-2.5">📇</div>
                <div className="text-[13px] font-bold mb-3.5">
                  Directorio Laboral — {sucursalName}
                </div>
                <a
                  href="https://docs.google.com/spreadsheets/d/1XOj7fkmSu98Qo7Mkt-heLWWlYP4f1CHp4DQU9HSibBI/edit?gid=0#gid=0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#E8450A] text-white no-underline px-[22px] py-2.5 rounded-[6px] text-[12px] font-bold transition-all hover:brightness-90 shadow-sm"
                >
                  Abrir hoja de cálculo
                </a>
              </div>
            </div>
          )}

          {/* 4. PROVEEDORES */}
          {activeTab === 'proveedores' && (
            <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 sm:p-[18px] shadow-sm">
              <div className="text-[12px] font-bold tracking-wide uppercase mb-3 flex items-center gap-[7px]">
                📦 Proveedores
              </div>
              <div className="text-[11px] text-[#6B7280] mb-4">
                Listado de proveedores de la sucursal.
              </div>
              <div className="bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[10px] p-5 text-center">
                <div className="text-[32px] mb-2.5">📦</div>
                <div className="text-[13px] font-bold mb-3.5">Listado de Proveedores</div>
                <a
                  href="https://docs.google.com/spreadsheets/d/1yfbpBY_micL1W4gWib6f-X1NeYVpSZxHrOE77NZfGy8/edit?gid=0#gid=0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#E8450A] text-white no-underline px-[22px] py-2.5 rounded-[6px] text-[12px] font-bold transition-all hover:brightness-90 shadow-sm"
                >
                  Abrir hoja de cálculo
                </a>
              </div>
            </div>
          )}

          {/* 5. SERVICIOS BÁSICOS */}
          {activeTab === 'serviciosbasicos' && (
            <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 sm:p-[18px] shadow-sm">
              <div className="text-[12px] font-bold tracking-wide uppercase mb-3 flex items-center gap-[7px]">
                💡 Servicios Básicos
              </div>
              <div className="text-[11px] text-[#6B7280] mb-4">
                Control de servicios básicos de la sucursal (luz, agua, internet, etc.)
              </div>
              <div className="bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[10px] p-5 text-center">
                <div className="text-[32px] mb-2.5">💡</div>
                <div className="text-[13px] font-bold mb-3.5">
                  Servicios Básicos — {sucursalName}
                </div>
                <a
                  href="https://docs.google.com/spreadsheets/d/1sIdthkHXJKzGAPSZcSU-qCZSwIaivetO/edit?gid=1337664358#gid=1337664358"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#E8450A] text-white no-underline px-[22px] py-2.5 rounded-[6px] text-[12px] font-bold transition-all hover:brightness-90 shadow-sm"
                >
                  Abrir hoja de cálculo
                </a>
              </div>
            </div>
          )}

          {/* 6. NOTAS */}
          {activeTab === 'notas' && (
            <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 sm:p-[18px] shadow-sm">
              <div className="text-[12px] font-bold tracking-wide uppercase mb-2 flex items-center gap-[7px]">
                📝 Notas
              </div>
              <div className="text-[11px] text-[#6B7280] mb-3.5">
                Espacio libre para que el líder escriba lo que necesite. Se guarda automáticamente.
              </div>
              <textarea
                value={notas}
                onChange={handleNotasChange}
                placeholder="Escribe aquí tus notas, pendientes o recordatorios..."
                className="w-full min-h-[280px] p-3 border-[1.5px] border-[#E5E7EB] rounded-[6px] text-[12px] font-sans resize-y outline-none transition-colors bg-[#FAFAFA] focus:border-[#E8450A] focus:bg-white"
              />
              {savedMsg && (
                <div className="text-[11px] text-[#16A34A] font-bold mt-2 animate-pulse">
                  ✓ Guardado
                </div>
              )}
            </div>
          )}

          {/* 7. DUDAS Y COMENTARIOS */}
          {activeTab === 'dudas' && (
            <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 sm:p-[18px] shadow-sm">
              <div className="text-[12px] font-bold tracking-wide uppercase mb-3 flex items-center gap-[7px]">
                💬 Dudas y Comentarios
              </div>
              <div className="text-[11px] text-[#6B7280] mb-4">
                Registro de dudas y comentarios de la sucursal.
              </div>
              <div className="bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[10px] p-5 text-center">
                <div className="text-[32px] mb-2.5">💬</div>
                <div className="text-[13px] font-bold mb-3.5">Dudas y Comentarios</div>
                <a
                  href="https://docs.google.com/spreadsheets/d/15lj3_tiDHgUnel5jMf1zp0pMwmbL3XQQPHVzG5k_q7I/edit?gid=0#gid=0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#E8450A] text-white no-underline px-[22px] py-2.5 rounded-[6px] text-[12px] font-bold transition-all hover:brightness-90 shadow-sm"
                >
                  Abrir hoja de cálculo
                </a>
              </div>
            </div>
          )}

          {/* 8. IGUALAS DE MANTENIMIENTO */}
          {activeTab === 'igualas' && (
            <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 sm:p-[18px] shadow-sm">
              <div className="text-[12px] font-bold tracking-wide uppercase mb-3 flex items-center gap-[7px]">
                🔨 Igualas de Mantenimiento
              </div>
              <div className="text-[11px] text-[#6B7280] mb-4">
                Calendario de igualas de mantenimiento de la sucursal.
              </div>
              <div className="bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[10px] p-5 text-center">
                <div className="text-[32px] mb-2.5">🔨</div>
                <div className="text-[13px] font-bold mb-3.5">Calendario Iguala 2026 - NL</div>
                <a
                  href="https://docs.google.com/spreadsheets/d/1jrKaRswexgSDayBAdq5SFyp1xspg7QpS/edit?gid=285787552#gid=285787552"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#E8450A] text-white no-underline px-[22px] py-2.5 rounded-[6px] text-[12px] font-bold transition-all hover:brightness-90 shadow-sm"
                >
                  Abrir hoja de cálculo
                </a>
              </div>
            </div>
          )}

          {/* 9. INSTRUCTIVO DE USO */}
          {activeTab === 'instructivo' && (
            <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 sm:p-[18px] shadow-sm">
              <div className="text-[12px] font-bold tracking-wide uppercase mb-2 flex items-center gap-[7px]">
                📖 Instructivo de Uso
              </div>
              <div className="text-[11px] text-[#6B7280] mb-4">
                Guía rápida de cada pestaña del tablero. Usa el menú para saltar a una sección.
              </div>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {INSTR_SECTIONS.map((s) => (
                  <button
                    key={s.n}
                    onClick={() => scrollToInstr(s.n)}
                    className="bg-[#F3F4F6] border border-[#E5E7EB] rounded-full px-3 py-1 text-[10px] font-bold cursor-pointer transition-colors text-[#111827] hover:bg-[#E5E7EB]"
                  >
                    {s.n}. {s.t}
                  </button>
                ))}
              </div>
              <div className="space-y-5">
                {INSTR_SECTIONS.map((s) => (
                  <div
                    key={s.n}
                    id={`instr-sec-${s.n}`}
                    className="pb-4 border-b border-[#E5E7EB] last:border-b-0"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-[#E8450A] text-white rounded-[5px] w-6 h-6 flex items-center justify-center text-[11px] font-black shrink-0">
                        {s.n}
                      </span>
                      <span className="text-[13px] font-bold text-[#111827]">{s.t}</span>
                    </div>
                    <div className="text-[12px] leading-relaxed text-[#27272A]">
                      {s.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
