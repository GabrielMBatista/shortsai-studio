import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnOverlayClick?: boolean;
    showCloseButton?: boolean;
}

const sizeStyles: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
};

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    children,
    size = 'md',
    closeOnOverlayClick = true,
    showCloseButton = true
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4"
            onClick={closeOnOverlayClick ? onClose : undefined}
        >
            <div
                className={`
          bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl
          w-full ${sizeStyles[size]} mx-4
          animate-scale-in
          relative
        `}
                onClick={(e) => e.stopPropagation()}
            >
                {showCloseButton && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
                {children}
            </div>
        </div>
    );
};

Modal.displayName = 'Modal';

export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> { }

export const ModalHeader: React.FC<ModalHeaderProps> = ({ className = '', children, ...props }) => (
    <div className={`px-6 py-4 border-b border-slate-800 ${className}`} {...props}>
        {children}
    </div>
);

ModalHeader.displayName = 'ModalHeader';

export interface ModalTitleProps extends React.HTMLAttributes<HTMLHeadingElement> { }

export const ModalTitle: React.FC<ModalTitleProps> = ({ className = '', children, ...props }) => (
    <h2 className={`text-2xl font-bold text-white ${className}`} {...props}>
        {children}
    </h2>
);

ModalTitle.displayName = 'ModalTitle';

export interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> { }

export const ModalBody: React.FC<ModalBodyProps> = ({ className = '', children, ...props }) => (
    <div className={`px-6 py-6 ${className}`} {...props}>
        {children}
    </div>
);

ModalBody.displayName = 'ModalBody';

export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> { }

export const ModalFooter: React.FC<ModalFooterProps> = ({ className = '', children, ...props }) => (
    <div className={`px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 ${className}`} {...props}>
        {children}
    </div>
);

ModalFooter.displayName = 'ModalFooter';
