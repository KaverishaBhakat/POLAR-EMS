'use client';

import React from 'react';
import Link from 'next/link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode | React.ComponentType<any>;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  href,
  children,
  className = '',
  icon: IconProp,
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-xs sm:text-sm gap-2',
    lg: 'h-11 px-5 text-sm gap-2.5',
  }[size];

  const variantClasses = {
    primary: 'bg-[#5E6AD2] hover:bg-[#6872D9] text-[#EDEDEF] border border-[#717CE8]/40 shadow-[0_2px_12px_rgba(94,106,210,0.35)] active:scale-[0.98]',
    secondary: 'bg-white/[0.05] hover:bg-white/[0.09] text-[#EDEDEF] border border-white/[0.08] hover:border-white/[0.14] active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-white/[0.06] text-[#8A8F98] hover:text-[#EDEDEF]',
    danger: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 active:scale-[0.98]',
  }[variant];

  const renderIcon = () => {
    if (!IconProp) return null;
    if (React.isValidElement(IconProp)) {
      return <span className="flex-shrink-0">{IconProp}</span>;
    }
    if (typeof IconProp === 'function' || typeof IconProp === 'object') {
      const IconComp = IconProp as React.ComponentType<any>;
      return <IconComp className="w-3.5 h-3.5 flex-shrink-0" />;
    }
    return null;
  };

  const baseClasses = `inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2]/50 ${sizeClasses} ${variantClasses} ${className}`;

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {renderIcon()}
        <span>{children}</span>
      </Link>
    );
  }

  return (
    <button disabled={disabled} className={baseClasses} {...props}>
      {renderIcon()}
      <span>{children}</span>
    </button>
  );
};
