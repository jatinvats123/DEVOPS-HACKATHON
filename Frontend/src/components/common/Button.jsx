import { forwardRef } from 'react';

const Button = forwardRef(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      color,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles with smooth transitions and interaction effects
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

    // Size variants
    const sizeStyles = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-6 text-base',
      lg: 'h-14 px-8 text-lg',
    };

    // Visual variants
    const variantStyles = {
      primary:
        'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/20 focus-visible:ring-blue-600 border border-transparent',
      secondary:
        'bg-slate-800 text-white hover:bg-slate-900 hover:shadow-md hover:shadow-slate-800/20 focus-visible:ring-slate-800 border border-transparent',
      outline:
        'border-2 border-slate-200 bg-transparent hover:border-slate-300 hover:bg-slate-50 text-slate-800 focus-visible:ring-slate-400',
      ghost:
        'bg-transparent hover:bg-slate-100 text-slate-800 focus-visible:ring-slate-400 border border-transparent',
      danger:
        'bg-red-500 text-white hover:bg-red-600 hover:shadow-md hover:shadow-red-500/20 focus-visible:ring-red-500 border border-transparent',
    };

    const classes = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

    // Apply custom text color if explicitly passed
    const customStyle = color ? { color } : undefined;

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled}
        style={customStyle}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
