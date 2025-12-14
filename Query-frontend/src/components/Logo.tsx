import React from "react";
import logoImage from "@assets/query-genie-logo.png";

interface LogoProps {
  variant?: 'default' | 'watermark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Logo = ({ variant = 'default', size = 'md', className = '' }: LogoProps) => {
  const sizeClasses = {
    sm: 'text-lg gap-2',
    md: 'text-xl gap-2',
    lg: 'text-2xl gap-3',
    xl: 'text-6xl gap-4'
  };

  const logoSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-20 w-20'
  };

  const baseClasses = `flex items-center font-bold ${sizeClasses[size]}`;
  
  const variantClasses = {
    default: 'text-brand-600',
    watermark: 'text-muted-foreground/20 select-none pointer-events-none'
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <img 
        src={logoImage} 
        alt="Query Genie Logo" 
        className={`${logoSizes[size]} object-contain flex-shrink-0`}
      />
      <span className={variant === 'watermark' ? 'tracking-wider' : 'tracking-tight'}>
        Query Genie
      </span>
    </div>
  );
};

export default Logo;
