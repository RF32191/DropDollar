'use client';

import React from 'react';

export default function TokenTerms() {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
      <h2 className="text-2xl font-bold text-white mb-4">
        💎 Token Terms & Conditions
      </h2>
      
      <div className="space-y-4 text-gray-300">
        
        {/* Purchased Tokens */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-300 mb-2 flex items-center gap-2">
            <span>🛒</span> Purchased Tokens
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-red-400 font-bold">❌</span>
              <span><strong>NO REFUNDS:</strong> All token purchases are final and non-refundable</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 font-bold">❌</span>
              <span><strong>NON-CASHABLE:</strong> Purchased tokens cannot be exchanged for cash or withdrawn</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold">✓</span>
              <span><strong>USE FOR GAMES:</strong> Can be used to enter competitions, tournaments, and play games</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold">✓</span>
              <span><strong>NO EXPIRATION:</strong> Purchased tokens never expire and remain in your account</span>
            </li>
          </ul>
        </div>
        
        {/* Won Tokens */}
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-300 mb-2 flex items-center gap-2">
            <span>🏆</span> Won Tokens (Cashable)
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold">✓</span>
              <span><strong>CASHABLE:</strong> Can be exchanged for real money and withdrawn to your bank account</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold">✓</span>
              <span><strong>FROM WINNINGS:</strong> Earned by winning games, tournaments, and competitions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold">✓</span>
              <span><strong>USE FOR GAMES:</strong> Can also be used to enter more competitions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">ℹ️</span>
              <span><strong>WITHDRAWAL FEES:</strong> Standard payment processing fees may apply when cashing out</span>
            </li>
          </ul>
        </div>
        
        {/* Spending Order */}
        <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-700/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-300 mb-2 flex items-center gap-2">
            <span>💸</span> Spending Order
          </h3>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-yellow-200">
              When you enter a game or competition, tokens are spent in this order:
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li><strong>Purchased Tokens</strong> are spent first</li>
              <li><strong>Won Tokens</strong> are spent only after purchased tokens are depleted</li>
            </ol>
            <p className="text-gray-400 text-xs mt-2">
              This ensures you maintain maximum cashable balance while using your purchased credits first.
            </p>
          </div>
        </div>
        
        {/* Important Notes */}
        <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
            <span>⚠️</span> Important Notes
          </h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>• Tokens have no cash value except for won tokens which can be withdrawn</li>
            <li>• You must be 18+ years old to purchase tokens and participate in cash competitions</li>
            <li>• All transactions are processed securely through Stripe</li>
            <li>• We reserve the right to suspend accounts suspected of fraud or abuse</li>
            <li>• Token balances are displayed separately in your wallet: Purchased vs Won</li>
            <li>• By purchasing tokens, you agree to these terms and our platform Terms of Service</li>
          </ul>
        </div>
        
        {/* Refund Policy */}
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-300 mb-2 flex items-center gap-2">
            <span>🚫</span> No Refund Policy
          </h3>
          <p className="text-sm text-gray-300">
            <strong>ALL TOKEN PURCHASES ARE FINAL.</strong> No refunds will be issued for purchased tokens under any circumstances, 
            including but not limited to: accidental purchases, unused tokens, account closure, or dissatisfaction with service. 
            Please carefully consider your purchase before completing the transaction.
          </p>
        </div>
        
      </div>
      
      {/* Agreement Checkbox Area */}
      <div className="mt-6 pt-4 border-t border-slate-700">
        <p className="text-xs text-gray-400 text-center">
          By purchasing tokens, you acknowledge that you have read, understood, and agree to these terms and conditions.
        </p>
      </div>
    </div>
  );
}

