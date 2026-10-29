import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

/**
 * Native-style picker: a trigger that matches the app's inputs, opening a
 * bottom sheet with the options (instead of a floating dropdown).
 * options: [{ value, label }]
 */
export default function SelectSheet({ value, onValueChange, options, placeholder = 'Select', title, className }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-11 min-h-[44px] w-full items-center justify-between gap-2 rounded-2xl border border-input bg-background px-3 text-left text-sm transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            className
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selected?.label ?? placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="pointer-events-auto rounded-t-3xl">
        <DrawerHeader className="pb-1">
          <DrawerTitle className="font-heading text-base">{title || placeholder}</DrawerTitle>
        </DrawerHeader>
        <div
          className="max-h-[60vh] overflow-y-auto px-2 pt-1"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onValueChange(o.value);
                setOpen(false);
              }}
              className={cn(
                'flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition active:bg-muted',
                o.value === value ? 'font-semibold text-primary' : 'text-foreground'
              )}
            >
              {o.label}
              {o.value === value && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}