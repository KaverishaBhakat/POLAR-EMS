'use client';

import React from 'react';

interface EditorialCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  featured?: boolean;
  dark?: boolean;
  noPadding?: boolean;
}

export const EditorialCard: React.FC<EditorialCardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  featured = false,
  dark = false,
  noPadding = false,
}) => {
  return (
    <div
      className={`relative border ${
        featured ? 'border-t-2 border-t-[#D4AF37] border-x-[#1A1A1A]/20 border-b-[#1A1A1A]/20' : 'border-[#1A1A1A]/20 dark:border-white/10'
      } ${
        dark
          ? 'bg-[#141414] text-[#F9F8F6] shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
          : 'bg-[#F9F8F6] text-[#1A1A1A] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)]'
      } transition-all duration-500 rounded-none overflow-hidden ${className}`}
    >
      {(title || action) && (
        <div
          className={`flex items-baseline justify-between gap-4 px-6 py-4 border-b ${
            dark ? 'border-white/10 bg-[#1A1A1A]/40' : 'border-[#1A1A1A]/10 bg-[#EBE5DE]/40'
          }`}
        >
          <div>
            {title && (
              <h3
                className={`font-serif text-base sm:text-lg font-normal tracking-tight ${
                  dark ? 'text-[#F9F8F6]' : 'text-[#1A1A1A]'
                }`}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="font-sans text-[11px] text-[#6C6863] tracking-wider uppercase mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}

      <div className={noPadding ? '' : 'p-6 sm:p-7'}>{children}</div>
    </div>
  );
};
