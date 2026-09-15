"use client";

import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import { clsx } from "../../lib/clsx";

export function Dropdown({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>{trigger}</RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content
          sideOffset={6}
          align="end"
          className="z-50 min-w-44 rounded-card border border-ink-200 bg-surface p-1 shadow-pop focus:outline-none"
        >
          {children}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}

export function DropdownItem({
  children,
  className,
  danger,
  ...rest
}: React.ComponentPropsWithoutRef<typeof RadixDropdown.Item> & { danger?: boolean }) {
  return (
    <RadixDropdown.Item
      className={clsx(
        "flex cursor-pointer select-none items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13px] outline-none",
        "data-[highlighted]:bg-ink-100",
        danger ? "text-danger-600" : "text-ink-700",
        className,
      )}
      {...rest}
    >
      {children}
    </RadixDropdown.Item>
  );
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return (
    <RadixDropdown.Label className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
      {children}
    </RadixDropdown.Label>
  );
}

export function DropdownSeparator() {
  return <RadixDropdown.Separator className="my-1 h-px bg-ink-100" />;
}
