import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface FABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function FAB({ className, children, ...props }: FABProps) {
  return (
    <Button
      className={cn(
        "fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50",
        "md:bottom-24 md:right-6",
        className
      )}
      size="icon"
      {...props}
      data-testid="fab-button"
    >
      {children}
    </Button>
  );
}
