'use client';

import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  hoverable?: boolean;
  interactive?: boolean;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  glow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hover,
  hoverable = true,
  interactive,
  title,
  subtitle,
  action,
  glow = false,
  ...rest
}) => {
  const isHoverable = hover ?? interactive ?? hoverable;

  return (
    <div
      className={`relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] transition-all duration-300 shadow-linear-card ${
        isHoverable ? 'hover:bg-white/[0.05] hover:border-white/[0.12] hover:shadow-linear-card-hover' : ''
      } ${glow ? 'border-[#5E6AD2]/40 shadow-linear-glow' : ''} ${className}`}
      {...rest}
    >
      {(title || action) ? (
        <>
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.06]">
            <div>
              {title && (
                <h3 className="text-sm font-semibold text-[#EDEDEF] tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-[#8A8F98] mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
          <div className="p-5 sm:p-6">{children}</div>
        </>
      ) : (
        children
      )}
    </div>
  );
};
