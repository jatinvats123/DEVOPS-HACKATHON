import { forwardRef } from 'react';

const Button = forwardRef(
  ({ className = '', variant = 'primary', size = 'md', color, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500/50 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeStyles = {
      sm: 'h-8 px-3.5 text-sm',
      md: 'h-10 px-5 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    const variantStyles = {
      primary: 'bg-white text-black hover:bg-zinc-200 border border-transparent',
      secondary: 'bg-panel-2 text-white hover:bg-edge border border-edge',
      outline: 'border border-edge bg-transparent hover:border-zinc-500 text-zinc-200',
      ghost: 'bg-transparent hover:bg-panel-2 text-zinc-300 border border-transparent',
      danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
    };

    const classes = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;
    const customStyle = color ? { color } : undefined;

    return (
      <button ref={ref} className={classes} disabled={disabled} style={customStyle} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
