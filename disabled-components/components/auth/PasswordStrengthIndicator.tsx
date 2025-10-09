'use client';

import React from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/outline';
import { 
  validatePasswordStrength, 
  getPasswordStrengthColor, 
  getPasswordStrengthLabel, 
  getPasswordStrengthProgress,
  type PasswordStrength 
} from '@/lib/passwordUtils';

interface PasswordStrengthIndicatorProps {
  password: string;
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string;
  };
  showRequirements?: boolean;
}

export default function PasswordStrengthIndicator({ 
  password, 
  personalInfo, 
  showRequirements = true 
}: PasswordStrengthIndicatorProps) {
  const strength = validatePasswordStrength(password, personalInfo);
  
  if (!password) return null;

  return (
    <div className="mt-3 space-y-3">
      {/* Strength Bar and Label */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Password Strength
          </span>
          <span className={`text-sm font-semibold ${getPasswordStrengthColor(strength.score)}`}>
            {getPasswordStrengthLabel(strength.score)}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              strength.score >= 4 ? 'bg-green-500' :
              strength.score >= 3 ? 'bg-blue-500' :
              strength.score >= 2 ? 'bg-yellow-500' :
              strength.score >= 1 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${getPasswordStrengthProgress(strength.score)}%` }}
          />
        </div>
      </div>

      {/* Feedback Messages */}
      {strength.feedback.length > 0 && (
        <div className="space-y-1">
          {strength.feedback.map((message, index) => (
            <div key={index} className="flex items-start space-x-2">
              {strength.isValid ? (
                <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              )}
              <span className={`text-sm ${
                strength.isValid ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
              }`}>
                {message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center space-x-2 mb-3">
            <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Security Requirements
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <RequirementItem 
              met={strength.requirements.minLength}
              text="At least 12 characters"
            />
            <RequirementItem 
              met={strength.requirements.hasUppercase}
              text="Uppercase letters (A-Z)"
            />
            <RequirementItem 
              met={strength.requirements.hasLowercase}
              text="Lowercase letters (a-z)"
            />
            <RequirementItem 
              met={strength.requirements.hasNumbers}
              text="Numbers (0-9)"
            />
            <RequirementItem 
              met={strength.requirements.hasSpecialChars}
              text="Special characters (!@#$%)"
            />
            <RequirementItem 
              met={strength.requirements.noCommonPatterns}
              text="No common patterns"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface RequirementItemProps {
  met: boolean;
  text: string;
}

function RequirementItem({ met, text }: RequirementItemProps) {
  return (
    <div className="flex items-center space-x-2">
      {met ? (
        <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
      ) : (
        <XCircleIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
      )}
      <span className={`${
        met ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
      }`}>
        {text}
      </span>
    </div>
  );
}
