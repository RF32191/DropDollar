'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import LocationVerificationService from '@/lib/locationVerification';

export default function ComplianceLogsPage() {
  const [logs, setLogs] = useState<{ blocked: any[], allowed: any[] }>({ blocked: [], allowed: [] });
  const [activeTab, setActiveTab] = useState<'blocked' | 'allowed'>('blocked');

  useEffect(() => {
    // Load compliance logs
    const complianceLogs = LocationVerificationService.getComplianceLogs();
    setLogs(complianceLogs);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'registration': return <UserIcon className="h-4 w-4" />;
      case 'game_entry': return <span className="text-sm">🎮</span>;
      case 'payment': return <CurrencyDollarIcon className="h-4 w-4" />;
      default: return <EyeIcon className="h-4 w-4" />;
    }
  };

  const getRestrictionColor = (restrictionType?: string) => {
    switch (restrictionType) {
      case 'excluded_state': return 'text-red-600 bg-red-50';
      case 'non_us': return 'text-orange-600 bg-orange-50';
      case 'vpn_detected': return 'text-purple-600 bg-purple-50';
      case 'unknown_location': return 'text-gray-600 bg-gray-50';
      default: return 'text-red-600 bg-red-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <img src="/DropCoin.png" alt="Dollar Drop" className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900">Dollar Drop Admin</span>
            </Link>
            <nav className="flex space-x-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
              <Link href="/admin/compliance" className="text-red-600 hover:text-red-700 font-bold">Compliance</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Location Compliance Logs</h1>
          </div>
          <p className="text-gray-600">
            Monitor location verification attempts and compliance with state gaming regulations.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-red-100 p-3 rounded-full">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{logs.blocked.length}</div>
                <div className="text-sm text-gray-600">Blocked Attempts</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full">
                <ShieldCheckIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{logs.allowed.length}</div>
                <div className="text-sm text-gray-600">Allowed Entries</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full">
                <MapPinIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {new Set([...logs.blocked, ...logs.allowed].map(log => log.location?.region).filter(Boolean)).size}
                </div>
                <div className="text-sm text-gray-600">States Detected</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-full">
                <ClockIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round((logs.allowed.length / (logs.blocked.length + logs.allowed.length) * 100) || 0)}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('blocked')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'blocked'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🚫 Blocked Attempts ({logs.blocked.length})
              </button>
              <button
                onClick={() => setActiveTab('allowed')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'allowed'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ✅ Allowed Entries ({logs.allowed.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User/Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  {activeTab === 'blocked' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                  )}
                  {activeTab === 'allowed' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(activeTab === 'blocked' ? logs.blocked : logs.allowed).map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="mr-2">{getActionIcon(log.actionType)}</div>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {log.actionType.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{log.userId}</div>
                      <div className="text-sm text-gray-500">{log.resourceId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.location?.city}, {log.location?.regionName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {log.location?.country} ({log.location?.region})
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.ip}
                    </td>
                    {activeTab === 'blocked' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRestrictionColor(log.restrictionType)}`}>
                          {log.restrictionType?.replace('_', ' ') || 'Unknown'}
                        </span>
                        <div className="text-sm text-gray-600 mt-1">{log.reason}</div>
                      </td>
                    )}
                    {activeTab === 'allowed' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.amount ? `$${log.amount}` : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(activeTab === 'blocked' ? logs.blocked : logs.allowed).length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                {activeTab === 'blocked' ? '🚫' : '✅'}
              </div>
              <div className="text-gray-500">
                No {activeTab} attempts recorded yet.
              </div>
            </div>
          )}
        </div>

        {/* Compliance Notes */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-800 mb-2">📋 Compliance Information</h3>
              <ul className="text-blue-700 space-y-1 text-sm">
                <li>• <strong>Excluded States:</strong> Arizona, Colorado, Tennessee, Maryland, North Dakota</li>
                <li>• <strong>Registration Required:</strong> New York, Florida (for certain prize thresholds)</li>
                <li>• <strong>VPN Detection:</strong> Automatic blocking of proxy/VPN usage</li>
                <li>• <strong>IP Limits:</strong> Maximum 5 accounts per IP address</li>
                <li>• <strong>Logging:</strong> All attempts logged for regulatory compliance</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
