import React from 'react';
import { MONTHS_ES } from '../utils';

interface MonthNavProps {
  year: number;
  month: number;
  onChange: (dir: number) => void;
}

export function MonthNav({ year, month, onChange }: MonthNavProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(-1)}
        className="bg-transparent border-[1.5px] border-[#E5E7EB] rounded-[6px] w-[30px] h-[30px] cursor-pointer text-[13px] text-[#6B7280] flex items-center justify-center font-inherit hover:bg-[#F3F4F6]"
      >
        ←
      </button>
      <span className="text-[13px] font-bold min-w-[130px] text-center">
        {MONTHS_ES[month]} <span className="text-[#E8450A]">{year}</span>
      </span>
      <button
        onClick={() => onChange(1)}
        className="bg-transparent border-[1.5px] border-[#E5E7EB] rounded-[6px] w-[30px] h-[30px] cursor-pointer text-[13px] text-[#6B7280] flex items-center justify-center font-inherit hover:bg-[#F3F4F6]"
      >
        →
      </button>
    </div>
  );
}
