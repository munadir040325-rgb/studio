import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ToolbarItemProps {
  onClick: () => void;
  active: boolean;
  label: string;
  children: ReactNode;
}

export function ToolbarItem({
  onClick,
  active,
  label,
  children,
}: ToolbarItemProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted",
              active && "bg-muted"
            )}
            aria-label={label}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
