'use client';

import React from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode | { label: string; variant?: 'default' | 'accent' | 'success' | 'warning' | 'error' | 'danger' | 'neutral' | 'secondary' | string };
  actions?: React.ReactNode;
  breadcrumbs?: (string | BreadcrumbItem)[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  description,
  icon,
  badge,
  actions,
  breadcrumbs,
}) => {
  const effectiveSubtitle = subtitle || description;
  const renderBadge = () => {
    if (!badge) return null;
    if (React.isValidElement(badge) || typeof badge === 'string' || typeof badge === 'number') {
      return badge;
    }
    if (typeof badge === 'object' && 'label' in badge) {
      const variantKey = badge.variant === 'danger' ? 'error' : (badge.variant || 'default');
      const variantClasses: Record<string, string> = {
        default: 'bg-white/[0.05] text-[#8A8F98] border-white/10',
        neutral: 'bg-white/[0.05] text-[#8A8F98] border-white/10',
        secondary: 'bg-white/[0.05] text-[#8A8F98] border-white/10',
        accent: 'bg-[#5E6AD2]/15 text-[#6872D9] border-[#5E6AD2]/30',
        success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        error: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      };

      const classes = variantClasses[variantKey] || variantClasses.default;

      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border ${classes}`}>
          {badge.label}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[#8A8F98] mb-1.5 font-mono">
            {breadcrumbs.map((crumb, idx) => {
              const label = typeof crumb === 'string' ? crumb : crumb.label;
              const href = typeof crumb === 'string' ? undefined : crumb.href;
              const isLast = idx === breadcrumbs.length - 1;

              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-white/20">/</span>}
                  {href && !isLast ? (
                    <a href={href} className="hover:text-[#EDEDEF] transition-colors">
                      {label}
                    </a>
                  ) : (
                    <span className={isLast ? 'text-[#EDEDEF]' : ''}>
                      {label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#EDEDEF]">
            {title}
          </h1>
          {renderBadge()}
        </div>
        {effectiveSubtitle && (
          <p className="text-xs sm:text-sm text-[#8A8F98] mt-1 max-w-3xl leading-relaxed">
            {effectiveSubtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
