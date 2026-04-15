import React from 'react';
import { cn } from '@/src/lib/utils';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className, iconOnly = false }) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img 
        src="/logo.png" 
        alt="EnglishBites" 
        className={cn(
          "object-cover rounded-xl shadow-sm border border-brand-cream-dark/10", 
          iconOnly ? "h-12 w-12" : "h-14 w-auto"
        )}
        referrerPolicy="no-referrer"
      />
      {!iconOnly && (
        <span className="sr-only">EnglishBites</span>
      )}
    </div>
  );
};
