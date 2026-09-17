import React from 'react';

interface StaggerProps {
  show: boolean;
  delay?: number; // in ms
  className?: string;
  children: React.ReactNode;
}

export const Stagger: React.FC<StaggerProps> = ({
  show,
  delay = 0,
  className = '',
  children,
}) => {
  return (
    <div
      className={className}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0px)' : 'translateY(24px)',
        transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
};
