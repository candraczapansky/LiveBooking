import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileOptimizedLayoutProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function MobileOptimizedLayout({ 
  children, 
  className, 
  padding = true 
}: MobileOptimizedLayoutProps) {
  return (
    <div className={cn(
      "w-full max-w-none overflow-x-hidden",
      padding && "px-3 sm:px-4 md:px-6",
      className
    )}>
      {children}
    </div>
  );
}

interface MobileResponsiveGridProps {
  children: ReactNode;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: string;
  className?: string;
}

export function MobileResponsiveGrid({ 
  children, 
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = "gap-4",
  className 
}: MobileResponsiveGridProps) {
  const gridClasses = cn(
    "grid w-full",
    `grid-cols-${columns.mobile}`,
    `sm:grid-cols-${columns.tablet}`,
    `lg:grid-cols-${columns.desktop}`,
    gap,
    className
  );

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export function MobileCard({ 
  children, 
  className,
  padding = "md"
}: MobileCardProps) {
  const paddingClasses = {
    none: "",
    sm: "p-2 sm:p-3",
    md: "p-3 sm:p-4 lg:p-6",
    lg: "p-4 sm:p-6 lg:p-8"
  };

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 w-full",
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}