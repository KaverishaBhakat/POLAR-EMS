'use client';

import React from 'react';

interface EditorialInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

export const EditorialInput: React.FC<EditorialInputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full space-y-1">
      {label && (
        <label className="block text-[11px] font-sans uppercase tracking-[0.25em] text-[#6C6863]">
          {label}
        </label>
      )}
      <input
        className={`w-full h-12 bg-transparent border-0 border-b border-[#1A1A1A]/30 focus:border-[#D4AF37] text-sm font-sans text-[#1A1A1A] dark:text-[#F9F8F6] placeholder:font-serif placeholder:italic placeholder:text-[#6C6863] focus:outline-none focus:ring-0 transition-colors duration-500 rounded-none px-0 py-2 ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-rose-500 font-sans tracking-wide">{error}</p>}
    </div>
  );
};
