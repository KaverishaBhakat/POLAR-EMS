'use client';

import React from 'react';

interface EditorialBadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'charcoal' | 'taupe' | 'muted' | 'emerald' | 'rose';
  size?: 'xs' | 'sm';
  className?: string;
}

export const EditorialBadge: React.FC<EditorialBadgeProps> = ({
  children,
  variant = 'charcoal',
  size = 'xs',
  className = '',
}) => {
  const sizeClasses = size === 'xs' ? 'px-2.5 py-0.5 text-[9px]' : 'px-3 py-1 text-[11px]';

  const variantClasses = {
    gold: 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40',
    charcoal: 'bg-[#1A1A1A] text-[#F9F8F6] border border-[#1A1A1A]',
    taupe: 'bg-[#EBE5DE] text-[#1A1A1A] border border-[#1A1A1A]/20',
    muted: 'bg-[#1A1A1A]/5 text-[#6C6863] border border-[#1A1A1A]/15 dark:bg-white/5 dark:text-slate-300 dark:border-white/10',
    emerald: 'bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
    rose: 'bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-500/30',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 font-sans font-medium uppercase tracking-[0.2em] rounded-none ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
};
