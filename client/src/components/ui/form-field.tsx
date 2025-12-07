import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  labelFor?: string;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, label, error, hint, required, labelFor, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {label && (
          <Label htmlFor={labelFor} className="flex items-center gap-1">
            {label}
            {required && (
              <span style={{ color: 'var(--color-danger)' }}>*</span>
            )}
          </Label>
        )}
        {children}
        {hint && !error && (
          <p 
            className="text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {hint}
          </p>
        )}
        {error && (
          <p 
            className="text-sm"
            style={{ color: 'var(--color-text-danger)' }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = 'FormField';

export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  ({ className, title, description, children, style, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn('space-y-4', className)} 
        style={style}
        {...props}
      >
        {(title || description) && (
          <div className="space-y-1">
            {title && (
              <h3 
                className="text-lg font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                {title}
              </h3>
            )}
            {description && (
              <p 
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    );
  }
);
FormSection.displayName = 'FormSection';

export interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'left' | 'right' | 'center' | 'between';
}

export const FormActions = React.forwardRef<HTMLDivElement, FormActionsProps>(
  ({ className, align = 'right', children, ...props }, ref) => {
    const getAlignClass = () => {
      switch (align) {
        case 'left':
          return 'justify-start';
        case 'center':
          return 'justify-center';
        case 'between':
          return 'justify-between';
        default:
          return 'justify-end';
      }
    };

    return (
      <div 
        ref={ref} 
        className={cn('flex items-center gap-3 pt-4', getAlignClass(), className)} 
        {...props}
      >
        {children}
      </div>
    );
  }
);
FormActions.displayName = 'FormActions';
