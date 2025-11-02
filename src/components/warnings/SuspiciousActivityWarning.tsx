'use client';

import React from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SuspiciousActivityWarningProps {
  suspicionScore: number;
  onClose: () => void;
  onContactSupport?: () => void;
}

export default function SuspiciousActivityWarning({
  suspicionScore,
  onClose,
  onContactSupport
}: SuspiciousActivityWarningProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-yellow-500/30">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-6 py-4 rounded-t-2xl border-b border-yellow-500/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/20 p-2 rounded-full">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Performance Notice
                </h3>
                <p className="text-sm text-yellow-200/70">
                  Unusual gameplay detected
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          
          {/* Main Message */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-gray-200 leading-relaxed">
              Your gameplay was flagged for <span className="font-semibold text-yellow-400">unusual patterns</span>. 
              Your score has been accepted, but repeated flags may result in account review.
            </p>
          </div>
          
          {/* Suspicion Level */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Alert Level</span>
              <span className="text-sm font-semibold text-yellow-400">
                {suspicionScore >= 80 ? 'High' : 'Moderate'}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  suspicionScore >= 80
                    ? 'bg-gradient-to-r from-red-500 to-orange-500'
                    : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                }`}
                style={{ width: `${Math.min(suspicionScore, 100)}%` }}
              />
            </div>
          </div>
          
          {/* Information */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">
              What does this mean?
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>Our system detected patterns that may indicate automated play or unfair advantages</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>This could be a false positive if you have exceptional skills</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>Multiple flags may trigger a manual review of your account</span>
              </li>
            </ul>
          </div>
          
          {/* Advice */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-300 mb-2">
              💡 To avoid future flags:
            </h4>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• Play at a natural human pace</li>
              <li>• Avoid automated tools or scripts</li>
              <li>• Ensure stable internet connection</li>
              <li>• Don't modify browser or game code</li>
            </ul>
          </div>
          
        </div>
        
        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-800/50 rounded-b-2xl border-t border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            I Understand
          </button>
          {onContactSupport && (
            <button
              onClick={onContactSupport}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Contact Support
            </button>
          )}
        </div>
        
      </div>
    </div>
  );
}

