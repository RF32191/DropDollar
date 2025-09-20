'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Setup2FAPage() {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<'sms' | 'email' | 'authenticator'>('authenticator');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes] = useState([
    'A1B2-C3D4-E5F6',
    'G7H8-I9J0-K1L2',
    'M3N4-O5P6-Q7R8',
    'S9T0-U1V2-W3X4',
    'Y5Z6-A7B8-C9D0',
    'E1F2-G3H4-I5J6',
    'K7L8-M9N0-O1P2',
    'Q3R4-S5T6-U7V8'
  ]);

  const qrCodeData = 'otpauth://totp/DollarDrop:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=DollarDrop';

  const handleMethodSelect = (selectedMethod: 'sms' | 'email' | 'authenticator') => {
    setMethod(selectedMethod);
    setStep(2);
  };

  const handleVerification = () => {
    // Simulate verification
    if (verificationCode.length === 6) {
      setStep(3);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center overflow-hidden">
                <img
                  src="/DropCoin.png"
                  alt="Dollar Drop Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900">Dollar Drop</span>
            </Link>
            <Link href="/wallet" className="text-gray-600 hover:text-gray-900">
              ← Back to Wallet
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Step {step} of 3</span>
            <span className="text-sm text-gray-500">Setting up 2FA</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step 1: Choose Method */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Secure Your Wallet</h1>
              <p className="text-gray-600">Choose your preferred two-factor authentication method</p>
            </div>

            <div className="space-y-4">
              {/* Authenticator App */}
              <button
                onClick={() => handleMethodSelect('authenticator')}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📱</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Authenticator App</h3>
                    <p className="text-sm text-gray-600">Use Google Authenticator, Authy, or similar apps</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Recommended</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Most Secure</span>
                    </div>
                  </div>
                  <div className="text-gray-400">→</div>
                </div>
              </button>

              {/* SMS */}
              <button
                onClick={() => handleMethodSelect('sms')}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💬</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">SMS Text Message</h3>
                    <p className="text-sm text-gray-600">Receive codes via text message to your phone</p>
                  </div>
                  <div className="text-gray-400">→</div>
                </div>
              </button>

              {/* Email */}
              <button
                onClick={() => handleMethodSelect('email')}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📧</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Email Verification</h3>
                    <p className="text-sm text-gray-600">Receive codes via email to your registered address</p>
                  </div>
                  <div className="text-gray-400">→</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Setup Method */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            {method === 'authenticator' && (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Setup Authenticator App</h2>
                
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Step 1: Scan QR Code</h3>
                  <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    {/* QR Code placeholder */}
                    <div className="text-center">
                      <div className="w-32 h-32 bg-gray-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <span className="text-4xl">📱</span>
                      </div>
                      <p className="text-xs text-gray-500">QR Code</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Open your authenticator app and scan this QR code
                  </p>
                  <div className="text-xs text-gray-500 font-mono bg-white p-2 rounded border">
                    Manual entry: JBSWY3DPEHPK3PXP
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Step 2: Enter Verification Code</h3>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg font-mono focus:ring-2 focus:ring-green-500 focus:border-transparent mb-4"
                    maxLength={6}
                  />
                  <button
                    onClick={handleVerification}
                    disabled={verificationCode.length !== 6}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    Verify & Continue
                  </button>
                </div>
              </div>
            )}

            {method === 'sms' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Setup SMS Verification</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => setStep(3)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    Send Verification Code
                  </button>
                </div>
              </div>
            )}

            {method === 'email' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Setup Email Verification</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => setStep(3)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    Send Verification Code
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Backup Codes */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">2FA Setup Complete!</h2>
              <p className="text-gray-600">Save these backup codes in a secure location</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
              <div className="flex items-start space-x-3">
                <span className="text-yellow-600 text-xl">⚠️</span>
                <div>
                  <h3 className="font-semibold text-yellow-800 mb-2">Important: Save Your Backup Codes</h3>
                  <p className="text-sm text-yellow-700">
                    These codes can be used to access your account if you lose your phone or authenticator app. 
                    Store them in a safe place and don't share them with anyone.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Backup Recovery Codes</h3>
              <div className="grid grid-cols-2 gap-3">
                {backupCodes.map((code, index) => (
                  <div key={index} className="bg-white p-3 rounded-lg border font-mono text-sm text-center">
                    {code}
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                📋 Copy All Codes
              </button>
            </div>

            <div className="space-y-3">
              <Link
                href="/wallet"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                Complete Setup & Go to Wallet
              </Link>
              <button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors">
                Download Codes as PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
