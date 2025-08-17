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
      "transition-shadow hover:shadow-md touch-manipulation",
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}

interface MobileStackProps {
  children: ReactNode;
  spacing?: "none" | "xs" | "sm" | "md" | "lg";
  className?: string;
}

export function MobileStack({ 
  children, 
  spacing = "md",
  className 
}: MobileStackProps) {
  const spacingClasses = {
    none: "space-y-0",
    xs: "space-y-1 sm:space-y-2",
    sm: "space-y-2 sm:space-y-3",
    md: "space-y-3 sm:space-y-4 lg:space-y-6",
    lg: "space-y-4 sm:space-y-6 lg:space-y-8"
  };

  return (
    <div className={cn(
      "flex flex-col w-full",
      spacingClasses[spacing],
      className
    )}>
      {children}
    </div>
  );
}

interface MobileButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
}

export function MobileButton({ 
  children, 
  onClick,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className 
}: MobileButtonProps) {
  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground"
  };

  const sizeClasses = {
    sm: "h-10 px-3 text-sm",
    md: "h-12 px-4 text-base",
    lg: "h-14 px-6 text-lg"
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "touch-manipulation min-h-[44px] min-w-[44px]", // Mobile accessibility
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
    >
      {children}
    </button>
  );
}