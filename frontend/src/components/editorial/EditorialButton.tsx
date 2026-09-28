'use client';

import React from 'react';
import Link from 'next/link';

interface EditorialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export const EditorialButton: React.FC<EditorialButtonProps> = ({
  variant = 'primary',
  size = 'md',
  href,
  children,
  className = '',
  icon,
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-9 px-5 text-[11px]',
    md: 'h-11 px-7 text-xs',
    lg: 'h-13 px-9 text-xs sm:text-sm',
  }[size];

  const baseClasses = `relative inline-flex items-center justify-center gap-2.5 font-sans font-medium uppercase tracking-[0.2em] transition-all duration-500 rounded-none overflow-hidden select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group ${sizeClasses} ${className}`;

  if (variant === 'primary') {
    const content = (
      <>
        {/* Sliding Gold Layer */}
        <span className="absolute inset-0 bg-[#D4AF37] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] z-0" />
        {/* Content layer */}
        <span className="relative z-10 text-[#F9F8F6] group-hover:text-[#1A1A1A] transition-colors duration-500 flex items-center gap-2">
          {children}
          {icon}
        </span>
      </>
    );

    if (href) {
      return (
        <Link href={href} className={`${baseClasses} bg-[#1A1A1A] shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]`}>
          {content}
        </Link>
      );
    }

    return (
      <button
        disabled={disabled}
        className={`${baseClasses} bg-[#1A1A1A] shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]`}
        {...props}
      >
        {content}
      </button>
    );
  }

  if (variant === 'secondary') {
    const content = (
      <span className="relative z-10 flex items-center gap-2">
        {children}
        {icon}
      </span>
    );

    const secondaryClasses = `${baseClasses} bg-transparent border border-[#1A1A1A]/30 text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F9F8F6] dark:border-white/30 dark:text-[#F9F8F6] dark:hover:bg-[#F9F8F6] dark:hover:text-[#1A1A1A]`;

    if (href) {
      return (
        <Link href={href} className={secondaryClasses}>
          {content}
        </Link>
      );
    }

    return (
      <button disabled={disabled} className={secondaryClasses} {...props}>
        {content}
      </button>
    );
  }

  if (variant === 'gold') {
    const content = (
      <span className="relative z-10 flex items-center gap-2">
        {children}
        {icon}
      </span>
    );

    const goldClasses = `${baseClasses} bg-[#D4AF37] text-[#1A1A1A] hover:bg-[#C29D29] shadow-[0_4px_16px_rgba(212,175,55,0.25)]`;

    if (href) {
      return (
        <Link href={href} className={goldClasses}>
          {content}
        </Link>
      );
    }

    return (
      <button disabled={disabled} className={goldClasses} {...props}>
        {content}
      </button>
    );
  }

  // Ghost / link
  const ghostClasses = `${baseClasses} bg-transparent text-[#6C6863] hover:text-[#D4AF37] underline-offset-4 hover:underline`;
  if (href) {
    return (
      <Link href={href} className={ghostClasses}>
        <span className="flex items-center gap-2">{children}{icon}</span>
      </Link>
    );
  }

  return (
    <button disabled={disabled} className={ghostClasses} {...props}>
      <span className="flex items-center gap-2">{children}{icon}</span>
    </button>
  );
};
