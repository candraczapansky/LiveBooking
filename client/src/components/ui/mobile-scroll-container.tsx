import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileScrollContainerProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}

export function MobileScrollContainer({ 
  children, 
  className,
  maxHeight = "calc(100vh - 8rem)"
}: MobileScrollContainerProps) {
  return (
    <div 
      className={cn(
        "w-full overflow-y-auto -webkit-overflow-scrolling-touch",
        className
      )}
      style={{ maxHeight }}
    >
      {children}
    </div>
  );
}