import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  full?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  // Dark ink on mint keeps the CTA readable (WCAG) in both themes.
  primary:
    'bg-primary text-primary-ink hover:bg-primary-dark active:bg-primary-dark shadow-sm disabled:bg-primary/50',
  secondary:
    'bg-card text-ink border border-line hover:border-primary/60 hover:bg-primary-light/60 disabled:text-ink-soft',
  ghost: 'bg-transparent text-ink hover:bg-surface disabled:text-ink-soft',
  danger: 'bg-card text-danger border border-danger/30 hover:bg-danger/5 disabled:opacity-50',
  dark: 'bg-ink text-white hover:bg-ink/90 disabled:bg-ink/50',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  full = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center font-semibold transition-colors duration-150 select-none disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
}
