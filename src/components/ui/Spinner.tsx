import React from 'react';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const sizeStyles: Record<string, string> = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
    return (
        <Loader2
            className={`${sizeStyles[size]} text-indigo-500 animate-spin ${className}`}
        />
    );
};

Spinner.displayName = 'Spinner';

export interface LoaderProps {
    message?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Loader: React.FC<LoaderProps> = ({ message, size = 'md' }) => {
    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <Spinner size={size} />
            {message && (
                <p className="text-sm text-slate-400 animate-pulse">{message}</p>
            )}
        </div>
    );
};

Loader.displayName = 'Loader';
