import React from 'react';
import { Check } from 'lucide-react';

export const Step = ({ label, isCompleted, isCurrent }) => {
  return (
    <div className="flex items-center">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
        isCompleted ? 'bg-blue-600 border-blue-600 text-white' :
        isCurrent ? 'border-blue-600' : 'border-slate-300'
      }`}>
        {isCompleted ? <Check className="w-5 h-5" /> : null}
      </div>
      <div className={`ml-4 text-sm font-medium ${
        isCurrent ? 'text-blue-600' : 'text-slate-600'
      }`}>
        {label}
      </div>
    </div>
  );
};

export const Stepper = ({ currentStep, steps }) => {
  return (
    <div className="flex flex-col space-y-4">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <Step
            label={step.label}
            isCompleted={index < currentStep}
            isCurrent={index === currentStep}
          />
          {index < steps.length - 1 && (
            <div className="ml-4 h-6 w-px bg-slate-300" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};