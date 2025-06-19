'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const Sheet = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(({ className, open, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('fixed inset-0 z-50 flex', open ? 'visible' : 'invisible', className)}
    {...props}>
    {children}
  </div>
));
Sheet.displayName = 'Sheet';

const SheetOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    open?: boolean;
    onClose?: () => void;
  }
>(({ className, open, onClose, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'fixed inset-0 bg-black/80 transition-opacity',
      open ? 'opacity-100' : 'opacity-0 pointer-events-none',
      className
    )}
    onClick={onClose}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

const SheetContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: 'top' | 'right' | 'bottom' | 'left';
    open?: boolean;
    onClose?: () => void;
  }
>(({ side = 'right', className, open, onClose, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'fixed bg-white shadow-lg transition-transform duration-300 ease-in-out',
      side === 'right' &&
        cn('right-0 top-0 h-full w-96 border-l', open ? 'translate-x-0' : 'translate-x-full'),
      side === 'left' &&
        cn('left-0 top-0 h-full w-96 border-r', open ? 'translate-x-0' : '-translate-x-full'),
      side === 'top' &&
        cn('top-0 left-0 right-0 h-96 border-b', open ? 'translate-y-0' : '-translate-y-full'),
      side === 'bottom' &&
        cn('bottom-0 left-0 right-0 h-96 border-t', open ? 'translate-y-0' : 'translate-y-full'),
      className
    )}
    {...props}>
    <div className="absolute right-4 top-4">
      <button
        onClick={onClose}
        className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
    </div>
    {children}
  </div>
));
SheetContent.displayName = 'SheetContent';

const SheetHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-2 text-center sm:text-left p-6 pb-4', className)}
      {...props}
    />
  )
);
SheetHeader.displayName = 'SheetHeader';

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn('text-lg font-semibold text-foreground', className)} {...props} />
  )
);
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
SheetDescription.displayName = 'SheetDescription';

export { Sheet, SheetOverlay, SheetContent, SheetHeader, SheetTitle, SheetDescription };
