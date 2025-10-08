'use client';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">🎮 Test Page</h1>
        <p className="text-xl text-gray-600">This is a simple test page without Header/Footer</p>
        <div className="mt-8">
          <a href="/" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
