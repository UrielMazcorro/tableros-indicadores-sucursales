import React from 'react';

export function SeguimientoRenovaciones() {
  return (
    <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 sm:p-[18px]">
      <div className="text-[12px] font-bold tracking-wide uppercase mb-3 flex items-center gap-[7px]">
        🔁 Seguimiento a Renovaciones
      </div>
      <div className="text-[11px] text-[#6B7280] mb-4">
        Base de datos de socios para trabajar renovaciones. Accede a la carpeta de Google Drive de tu región.
      </div>
      <div className="bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] rounded-[10px] p-5 text-center">
        <div className="text-[32px] mb-2.5">📁</div>
        <div className="text-[13px] font-bold mb-3.5">Carpeta de Renovaciones — Zona Nuevo León</div>
        <a
          href="https://drive.google.com/drive/folders/1IfGGnrnY_AhV3KhH5V21YIzhgBiMX9Ij"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-[#E8450A] text-white no-underline px-[22px] py-2.5 rounded-[6px] text-[12px] font-bold transition-all hover:brightness-90"
        >
          Abrir carpeta de Google Drive
        </a>
      </div>
    </div>
  );
}
