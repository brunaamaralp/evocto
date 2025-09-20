import React, { useState } from 'react';
import { Card, Typography } from '@/components/ui/design-system';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';

export const FormSection = ({ 
  title, 
  description, 
  children, 
  isCollapsible = false,
  defaultExpanded = true,
  isComplete = false,
  hasErrors = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className="overflow-hidden">
      <div 
        className={`
          flex items-center justify-between p-4 border-b border-secondary-100
          ${isCollapsible ? 'cursor-pointer hover:bg-secondary-25' : ''}
        `}
        onClick={isCollapsible ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center gap-3">
          {isCollapsible && (
            isExpanded ? 
              <ChevronDown className="h-4 w-4 text-secondary-400" /> :
              <ChevronRight className="h-4 w-4 text-secondary-400" />
          )}
          <div>
            <Typography variant="h5" className="flex items-center gap-2">
              {title}
              {hasErrors && <AlertCircle className="h-4 w-4 text-error-500" />}
              {isComplete && <CheckCircle className="h-4 w-4 text-success-500" />}
            </Typography>
            {description && (
              <Typography variant="body2" className="text-secondary-600 mt-1">
                {description}
              </Typography>
            )}
          </div>
        </div>
        
        {(isComplete || hasErrors) && (
          <div className={`
            px-3 py-1 rounded-full text-xs font-medium
            ${isComplete ? 'bg-success-100 text-success-700' : 'bg-error-100 text-error-700'}
          `}>
            {isComplete ? 'Completo' : 'Atenção necessária'}
          </div>
        )}
      </div>
      
      {(!isCollapsible || isExpanded) && (
        <div className="p-4">
          {children}
        </div>
      )}
    </Card>
  );
};

export const FormField = ({ 
  label, 
  description, 
  required = false, 
  error = '', 
  success = '', 
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-secondary-700">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      
      {description && (
        <Typography variant="caption" className="text-secondary-500">
          {description}
        </Typography>
      )}
      
      {children}
      
      {error && (
        <div className="flex items-center gap-2 text-error-600">
          <AlertCircle className="h-4 w-4" />
          <Typography variant="caption">{error}</Typography>
        </div>
      )}
      
      {success && (
        <div className="flex items-center gap-2 text-success-600">
          <CheckCircle className="h-4 w-4" />
          <Typography variant="caption">{success}</Typography>
        </div>
      )}
    </div>
  );
};

export const ProgressIndicator = ({ steps, currentStep, className = '' }) => {
  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, index) => (
        <React.Fragment key={step.key}>
          <div className="flex items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
              ${index < currentStep ? 
                'bg-success-500 text-white' : 
                index === currentStep ? 
                  'bg-primary-500 text-white' : 
                  'bg-secondary-200 text-secondary-500'
              }
            `}>
              {index < currentStep ? '✓' : index + 1}
            </div>
            <div className="ml-2 hidden sm:block">
              <Typography variant="caption" className={
                index <= currentStep ? 'text-secondary-700' : 'text-secondary-500'
              }>
                {step.title}
              </Typography>
            </div>
          </div>
          
          {index < steps.length - 1 && (
            <div className={`
              flex-1 h-0.5 mx-4
              ${index < currentStep ? 'bg-success-500' : 'bg-secondary-200'}
            `} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};