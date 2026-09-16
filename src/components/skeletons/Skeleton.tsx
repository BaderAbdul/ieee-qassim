import React from 'react';

export function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`}
      {...props}
    />
  );
}

export default Skeleton;
