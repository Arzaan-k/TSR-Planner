import { useCallback, useRef } from "react";
import { useToast } from "./use-toast";

export function useDebouncedToast() {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingToasts = useRef<Set<string>>(new Set());

  const showDebouncedToast = useCallback((
    title: string,
    variant: "default" | "destructive" = "default",
    delay: number = 1000
  ) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Add to pending toasts
    pendingToasts.current.add(title);

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      const count = pendingToasts.current.size;
      const displayTitle = count > 1 ? `${title} (${count} changes)` : title;
      
      toast({ title: displayTitle, variant });
      pendingToasts.current.clear();
    }, delay);
  }, [toast]);

  const showImmediateToast = useCallback((
    title: string,
    variant: "default" | "destructive" = "default"
  ) => {
    // Clear any pending debounced toasts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      pendingToasts.current.clear();
    }
    
    toast({ title, variant });
  }, [toast]);

  return {
    showDebouncedToast,
    showImmediateToast,
  };
}
