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
        className={cn("object-contain", iconOnly ? "h-9 w-9" : "h-10")}
        referrerPolicy="no-referrer"
      />
      {!iconOnly && (
        <span className="sr-only">EnglishBites</span>
      )}
    </div>
  );
};
