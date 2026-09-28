import React from 'react';

interface PolarLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  glow?: boolean;
}

/**
 * Official POLAR-EMS Vector Mountain Peak Logo
 * 
 * Crisp, scalable vector reproduction of the POLAR-EMS minimalist mountain summit mark.
 */
export const PolarLogo: React.FC<PolarLogoProps> = ({
  size = 24,
  className = '',
  glow = false,
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 transition-transform ${glow ? 'filter drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''} ${className}`}
      aria-label="POLAR-EMS Logo"
      role="img"
      {...props}
    >
      <path
        d="M 14.5 63.5 C 22.0 57.5 28.0 52.0 33.5 47.5 C 34.5 46.8 35.5 47.2 36.0 48.2 L 37.8 50.8 C 38.4 51.6 39.2 51.1 39.7 50.3 L 53.8 30.0 C 54.4 29.1 55.6 29.3 56.1 30.4 C 63.8 41.6 73.5 53.8 86.0 63.2 C 75.8 56.5 66.5 48.2 58.2 45.4 C 56.2 44.7 54.8 45.5 53.8 47.2 C 48.5 54.2 44.0 58.6 39.6 58.6 C 33.8 58.6 25.5 57.2 14.5 63.5 Z"
      />
    </svg>
  );
};

export default PolarLogo;
