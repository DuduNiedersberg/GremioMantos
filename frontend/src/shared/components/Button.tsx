import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-gremio-celeste hover:bg-gremio-celeste-600 text-white focus:ring-gremio-celeste-500':
              variant === 'primary',
            'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-50 focus:ring-neutral-500':
              variant === 'secondary',
            'bg-error hover:bg-red-600 text-white focus:ring-error':
              variant === 'danger',
            'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300':
              variant === 'ghost',
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
            'w-full': fullWidth,
          },
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
