import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'outlined' | 'glass';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hoverable?: boolean;
}

const variantStyles: Record<string, string> = {
    default: 'bg-slate-800/50 border border-slate-700/50',
    elevated: 'bg-slate-800/80 border border-slate-700 shadow-xl',
    outlined: 'bg-transparent border-2 border-slate-700',
    glass: 'bg-slate-800/30 backdrop-blur-md border border-slate-700/50'
};

const paddingStyles: Record<string, string> = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    (
        {
            variant = 'default',
            padding = 'md',
            hoverable = false,
            className = '',
            children,
            ...props
        },
        ref
    ) => {
        const baseStyles = 'rounded-2xl transition-all duration-200';
        const hoverStyles = hoverable ? 'hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer' : '';

        return (
            <div
                ref={ref}
                className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${hoverStyles}
          ${className}
        `}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> { }

export const CardHeader: React.FC<CardHeaderProps> = ({ className = '', children, ...props }) => (
    <div className={`mb-4 ${className}`} {...props}>
        {children}
    </div>
);

CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const CardTitle: React.FC<CardTitleProps> = ({
    as: Component = 'h3',
    className = '',
    children,
    ...props
}) => (
    <Component className={`text-xl font-bold text-white ${className}`} {...props}>
        {children}
    </Component>
);

CardTitle.displayName = 'CardTitle';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> { }

export const CardContent: React.FC<CardContentProps> = ({ className = '', children, ...props }) => (
    <div className={className} {...props}>
        {children}
    </div>
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> { }

export const CardFooter: React.FC<CardFooterProps> = ({ className = '', children, ...props }) => (
    <div className={`mt-6 pt-4 border-t border-slate-700/50 ${className}`} {...props}>
        {children}
    </div>
);

CardFooter.displayName = 'CardFooter';
