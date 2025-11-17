'use client';

import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

export default function SimpleMessagesPlaceholder() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="max-w-2xl bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
        <div className="text-center">
          <ChatBubbleLeftRightIcon className="h-16 w-16 mx-auto mb-4 text-blue-400" />
          <h3 className="text-xl font-bold text-white mb-2">
            💬 Messages System
          </h3>
          <p className="text-gray-300 mb-6">
            A new universal messaging system is available! To activate it, run the setup SQL files.
          </p>
          
          <div className="bg-gray-900 rounded-xl p-4 text-left space-y-3 mb-6">
            <p className="text-sm text-gray-300 font-semibold">📋 Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-400">
              <li>
                <span className="text-blue-400">CREATE_MESSAGING_SYSTEM.sql</span>
                <p className="ml-5 text-xs text-gray-500">Creates tables and functions</p>
              </li>
              <li>
                <span className="text-blue-400">FIX_ANONYMOUS_USERNAMES.sql</span>
                <p className="ml-5 text-xs text-gray-500">Shows real usernames</p>
              </li>
              <li>
                <span className="text-blue-400">INTEGRATE_MARKETPLACE_MESSAGING.sql</span>
                <p className="ml-5 text-xs text-gray-500">Connects winners & sellers</p>
              </li>
            </ol>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-300 font-semibold mb-2">✨ Features After Setup:</p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>✅ Real usernames in scoreboard (no more "Anonymous")</li>
              <li>✅ Direct user-to-user messaging</li>
              <li>✅ Auto-conversations when you win marketplace items</li>
              <li>✅ Shipping address submission</li>
              <li>✅ Unread message tracking</li>
              <li>✅ Real-time message updates</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-center">
            <a
              href="https://github.com/RF32191/DropDollar"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              📂 View SQL Files on GitHub
            </a>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              🔄 Refresh After Setup
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            See <strong>MESSAGING_SETUP_GUIDE.md</strong> for detailed instructions
          </p>
        </div>
      </div>
    </div>
  );
}

