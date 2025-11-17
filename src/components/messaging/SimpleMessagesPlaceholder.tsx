'use client';

import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

export default function SimpleMessagesPlaceholder() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="max-w-2xl bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
        <div className="text-center">
          <ChatBubbleLeftRightIcon className="h-16 w-16 mx-auto mb-4 text-blue-400" />
          <h3 className="text-xl font-bold text-white mb-2">
            💬 Messages System Ready!
          </h3>
          <p className="text-gray-300 mb-6">
            ✅ Your messaging system database is set up and ready to use!
            <br />
            The full chat interface will be enabled once build issues are resolved.
          </p>
          
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-300 font-semibold mb-2">✅ What's Working Now:</p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>✅ Database tables created (conversations, messages)</li>
              <li>✅ All messaging functions set up</li>
              <li>✅ Real usernames in scoreboard</li>
              <li>✅ Marketplace winner/seller connections ready</li>
              <li>✅ Security policies (RLS) enabled</li>
            </ul>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-300 font-semibold mb-2">⏳ Coming Soon:</p>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>🔧 Full chat interface (resolving build issues)</li>
              <li>🔧 Real-time message polling</li>
              <li>🔧 Direct messaging between users</li>
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

