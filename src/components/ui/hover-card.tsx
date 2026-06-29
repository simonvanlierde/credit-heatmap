"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { cn } from "@/lib/utils";

/**
 * Hover/focus card for supplementary detail (e.g. a role description) behind an
 * icon trigger. Radix opens it on hover and keyboard focus; on touch the
 * trigger's tap toggles it, so it stays reachable everywhere.
 */
export const HoverCard = HoverCardPrimitive.Root;
export const HoverCardTrigger = HoverCardPrimitive.Trigger;

export function HoverCardContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs rounded-lg border border-outline-variant bg-surface-bright p-3 text-xs leading-relaxed text-on-surface-variant shadow-md",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}
