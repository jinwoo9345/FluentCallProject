import React from 'react';
import { cn } from '@/src/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className, hover = true, children, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all',
        hover && 'hover:shadow-md hover:border-blue-100',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
