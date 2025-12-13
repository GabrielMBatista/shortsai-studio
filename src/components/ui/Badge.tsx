import React from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'secondary';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    size?: BadgeSize;
    dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-slate-700/50 text-slate-300 border-slate-700',
    primary: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    secondary: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
};

const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
};

export const Badge: React.FC<BadgeProps> = ({
    variant = 'default',
    size = 'sm',
    dot = false,
    className = '',
    children,
    ...props
}) => {
    return (
        <span
            className={`
        inline-flex items-center gap-1.5
        font-medium rounded-lg border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
            {...props}
        >
            {dot && (
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
            )}
            {children}
        </span>
    );
};

Badge.displayName = 'Badge';
