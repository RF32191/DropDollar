'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  DocumentTextIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface TaxNotification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  message_type: string;
  is_read: boolean;
  metadata: {
    tax_year?: number;
    amount?: number;
    full_name?: string;
    ssn_last4?: string;
    address?: string;
    filing_deadline?: string;
    generated_at?: string;
    payer?: string;
    form_type?: string;
    box_1_amount?: number;
  };
  created_at: string;
}

interface TaxNotificationsProps {
  onUnreadCountChange?: (count: number) => void;
}

export default function TaxNotifications({ onUnreadCountChange }: TaxNotificationsProps) {
  const [notifications, setNotifications] = useState<TaxNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedForm, setSelectedForm] = useState<TaxNotification | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch (err) {
      console.error('Error loading user:', err);
    }
  };

  const loadNotifications = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('[TaxNotifications] Loading notifications for user:', user.id);
      
      const { data, error: fetchError } = await supabase
        .from('user_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('[TaxNotifications] Error fetching:', fetchError);
        setError(fetchError.message);
        setNotifications([]);
      } else {
        console.log('[TaxNotifications] Loaded', data?.length || 0, 'notifications');
        setNotifications(data || []);
        
        const unreadCount = (data || []).filter((n: TaxNotification) => !n.is_read).length;
        if (onUnreadCountChange) {
          onUnreadCountChange(unreadCount);
        }
      }
    } catch (err: any) {
      console.error('[TaxNotifications] Unexpected error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_messages')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (!error) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        
        const unreadCount = notifications.filter(n => !n.is_read && n.id !== notificationId).length;
        if (onUnreadCountChange) {
          onUnreadCountChange(unreadCount);
        }
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number | undefined) => {
    if (typeof amount !== 'number') return '0.00';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleDownloadPDF = (notification: TaxNotification) => {
    setSelectedForm(notification);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleViewFullForm = (notification: TaxNotification) => {
    setSelectedForm(notification);
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8 text-gray-400">
        <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <p>Please log in to view notifications</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading notifications...</p>
        </div>
      </div>
    );
  }

  // Full-screen 1099-NEC Form Modal
  if (selectedForm && (selectedForm.message_type === '1099_notification' || selectedForm.message_type === 'tax_1099')) {
    const taxYear = selectedForm.metadata.tax_year || new Date().getFullYear();
    const amount = selectedForm.metadata.amount || 0;
    const fullName = selectedForm.metadata.full_name || 'Recipient';
    const ssnLast4 = selectedForm.metadata.ssn_last4;
    const address = selectedForm.metadata.address;
    const filingDeadline = selectedForm.metadata.filing_deadline || `April 15, ${taxYear + 1}`;

    return (
      <div className="fixed inset-0 bg-black/90 z-50 overflow-auto">
        {/* Close button */}
        <button
          onClick={() => setSelectedForm(null)}
          className="fixed top-4 right-4 z-50 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors print:hidden"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Action buttons */}
        <div className="fixed top-4 left-4 z-50 flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <PrinterIcon className="w-5 h-5" />
            Print / Save PDF
          </button>
          <button
            onClick={() => setSelectedForm(null)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>

        {/* Printable 1099-NEC Form */}
        <div ref={printRef} id="printable-1099" className="max-w-4xl mx-auto my-16 print:my-0 print:max-w-none">
          {/* Print Instructions Banner - hidden on print */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg print:hidden mb-0">
            <p className="text-center font-semibold">
              📄 To save as PDF: Click "Print / Save PDF" → Select "Save as PDF" as the destination → Click Save
            </p>
          </div>
          <div className="bg-white text-black p-8 print:p-4 rounded-b-lg print:rounded-none" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* IRS Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
              <div>
                <p className="text-xs text-gray-600">VOID</p>
                <p className="text-xs text-gray-600">☐ CORRECTED</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">1099-NEC</p>
                <p className="text-sm">Nonemployee Compensation</p>
                <p className="text-xs text-gray-600">Copy B - For Recipient</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">OMB No. 1545-0116</p>
                <p className="text-3xl font-bold">{taxYear}</p>
                <p className="text-xs">Form 1099-NEC</p>
              </div>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-2 gap-0 border-2 border-black">
              {/* Left Column - Payer Info */}
              <div className="border-r-2 border-black">
                {/* Payer Name & Address */}
                <div className="p-3 border-b border-gray-400 min-h-[100px]">
                  <p className="text-[10px] text-gray-600 uppercase mb-1">PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.</p>
                  <p className="font-semibold">DropDollar Inc.</p>
                  <p className="text-sm">123 Tech Boulevard</p>
                  <p className="text-sm">San Francisco, CA 94102</p>
                  <p className="text-sm">United States</p>
                  <p className="text-sm">support@drop-dollar.com</p>
                </div>

                {/* Payer TIN */}
                <div className="p-3 border-b border-gray-400">
                  <p className="text-[10px] text-gray-600 uppercase mb-1">PAYER'S TIN</p>
                  <p className="font-mono font-bold">XX-XXXXXXX</p>
                </div>

                {/* Recipient TIN */}
                <div className="p-3 border-b border-gray-400">
                  <p className="text-[10px] text-gray-600 uppercase mb-1">RECIPIENT'S TIN</p>
                  <p className="font-mono font-bold">XXX-XX-{ssnLast4 || 'XXXX'}</p>
                </div>

                {/* Recipient Name */}
                <div className="p-3 border-b border-gray-400">
                  <p className="text-[10px] text-gray-600 uppercase mb-1">RECIPIENT'S name</p>
                  <p className="font-semibold text-lg">{fullName}</p>
                </div>

                {/* Recipient Address */}
                <div className="p-3 min-h-[80px]">
                  <p className="text-[10px] text-gray-600 uppercase mb-1">Street address (including apt. no.)</p>
                  <p className="text-sm">{address || 'Address on file'}</p>
                </div>
              </div>

              {/* Right Column - Amounts */}
              <div>
                {/* Box 1 - Nonemployee compensation */}
                <div className="p-3 border-b border-gray-400 bg-green-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase">1 Nonemployee compensation</p>
                    </div>
                    <p className="text-3xl font-bold text-green-700">${formatAmount(amount)}</p>
                  </div>
                </div>

                {/* Box 2 - Checkbox */}
                <div className="p-3 border-b border-gray-400">
                  <p className="text-[10px] text-gray-600 uppercase mb-1">2 Payer made direct sales totaling $5,000 or more of consumer products to recipient for resale</p>
                  <p className="font-mono">☐</p>
                </div>

                {/* Box 3 - Reserved */}
                <div className="p-3 border-b border-gray-400 bg-gray-100">
                  <p className="text-[10px] text-gray-600 uppercase">3</p>
                  <p className="text-xs text-gray-400 italic">Reserved</p>
                </div>

                {/* Box 4 - Federal income tax withheld */}
                <div className="p-3 border-b border-gray-400">
                  <p className="text-[10px] text-gray-600 uppercase mb-1">4 Federal income tax withheld</p>
                  <p className="font-mono font-bold">$0.00</p>
                </div>

                {/* Boxes 5-7 - State tax info */}
                <div className="grid grid-cols-3 border-b border-gray-400">
                  <div className="p-2 border-r border-gray-400">
                    <p className="text-[8px] text-gray-600 uppercase">5 State tax withheld</p>
                    <p className="text-xs font-mono">$0.00</p>
                  </div>
                  <div className="p-2 border-r border-gray-400">
                    <p className="text-[8px] text-gray-600 uppercase">6 State/Payer's state no.</p>
                    <p className="text-xs font-mono">CA</p>
                  </div>
                  <div className="p-2">
                    <p className="text-[8px] text-gray-600 uppercase">7 State income</p>
                    <p className="text-xs font-mono">${formatAmount(amount)}</p>
                  </div>
                </div>

                {/* Account number */}
                <div className="p-3">
                  <p className="text-[10px] text-gray-600 uppercase mb-1">Account number (see instructions)</p>
                  <p className="font-mono text-sm">{selectedForm.id.substring(0, 12).toUpperCase()}</p>
                </div>
              </div>
            </div>

            {/* IRS Notice */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded text-sm">
              <p className="font-bold text-yellow-800 mb-2">⚠️ Important Tax Information</p>
              <p className="text-gray-700 mb-2">
                This is important tax information and is being furnished to the Internal Revenue Service. 
                If you are required to file a return, a negligence penalty or other sanction may be imposed 
                on you if this income is taxable and the IRS determines that it has not been reported.
              </p>
              <p className="text-gray-700">
                <strong>Instructions:</strong> Report this amount on your federal income tax return. 
                Self-employment income should be reported on Schedule C (Form 1040) and Schedule SE.
              </p>
            </div>

            {/* Filing Information */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-gray-600 uppercase mb-1">Form Generated</p>
                <p className="font-semibold">{formatDate(selectedForm.created_at)}</p>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-gray-600 uppercase mb-1">Tax Filing Deadline</p>
                <p className="font-bold text-red-700">{filingDeadline}</p>
              </div>
            </div>

            {/* Instructions for Recipient */}
            <div className="mt-6 text-xs text-gray-600 print:text-[8px]">
              <p className="font-bold mb-2">Instructions for Recipient</p>
              <p className="mb-2">
                <strong>Box 1.</strong> Shows nonemployee compensation. If you are in the trade or business of being 
                a payee, report this amount on Schedule C (Form 1040). Include any self-employment tax due 
                from this income on Schedule SE (Form 1040).
              </p>
              <p className="mb-2">
                <strong>Box 4.</strong> Shows backup withholding. Generally, a payer must backup withhold at a 24% rate 
                if you did not furnish your TIN or you did not furnish the correct TIN to the payer.
              </p>
              <p>
                <strong>Future developments.</strong> For the latest information about developments related to 
                Form 1099-NEC and its instructions, such as legislation enacted after they were published, 
                go to www.irs.gov/Form1099NEC.
              </p>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-300 flex justify-between items-center text-xs text-gray-500">
              <p>Form 1099-NEC (Rev. {taxYear})</p>
              <p>Cat. No. 72590N</p>
              <p>Department of the Treasury - Internal Revenue Service</p>
            </div>
          </div>
        </div>

        {/* Print styles */}
        <style jsx global>{`
          @media print {
            /* Hide everything except the 1099 form */
            body * {
              visibility: hidden;
            }
            
            /* Hide navigation and buttons */
            nav, .fixed, button, [class*="print:hidden"] {
              display: none !important;
            }
            
            /* Show only the printable 1099 */
            #printable-1099,
            #printable-1099 * {
              visibility: visible !important;
            }
            
            #printable-1099 {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0 !important;
              padding: 0 !important;
            }
            
            /* Hide the instruction banner in print */
            #printable-1099 > div:first-child {
              display: none !important;
            }
            
            /* Page settings for letter size */
            @page {
              margin: 0.5in;
              size: letter portrait;
            }
            
            /* Ensure white background */
            #printable-1099 > div:last-child {
              background: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center">
          <DocumentTextIcon className="w-6 h-6 mr-2 text-blue-400" />
          Tax Documents & Notifications
        </h3>
        <button
          onClick={loadNotifications}
          className="flex items-center px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4 mr-1" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-xl mb-4 flex items-center">
          <ExclamationCircleIcon className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-lg font-semibold mb-2">No Tax Documents Yet</p>
          <p className="text-gray-500 text-sm">
            Your 1099 and other tax documents will appear here when available.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const is1099 = notification.message_type === '1099_notification' || notification.message_type === 'tax_1099';
            
            return (
              <div
                key={notification.id}
                className={`relative p-5 rounded-xl border transition-all duration-300 ${
                  notification.is_read
                    ? 'bg-white/5 border-white/10 hover:bg-white/10'
                    : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/30 hover:from-blue-500/30 hover:to-purple-500/30 shadow-lg shadow-blue-500/10'
                }`}
              >
                {/* Unread indicator */}
                {!notification.is_read && (
                  <div className="absolute top-4 right-4 w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50"></div>
                )}

                {/* Icon and Title */}
                <div className="flex items-start mb-3">
                  {is1099 ? (
                    <div className="p-2 bg-green-500/20 rounded-lg mr-3">
                      <DocumentTextIcon className="w-6 h-6 text-green-400" />
                    </div>
                  ) : (
                    <div className="p-2 bg-blue-500/20 rounded-lg mr-3">
                      <DocumentTextIcon className="w-6 h-6 text-blue-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-white font-semibold text-lg">{notification.title}</h4>
                    <p className="text-gray-400 text-xs mt-1">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                </div>

                {/* 1099-NEC Preview Card */}
                {is1099 && notification.metadata?.amount ? (
                  <div className="bg-white text-black rounded-lg overflow-hidden shadow-xl">
                    {/* Mini Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-3 flex justify-between items-center">
                      <div>
                        <p className="text-xl font-bold">1099-NEC</p>
                        <p className="text-xs opacity-80">Nonemployee Compensation</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{notification.metadata.tax_year || new Date().getFullYear()}</p>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Recipient</p>
                        <p className="font-semibold">{notification.metadata.full_name || 'You'}</p>
                        {notification.metadata.ssn_last4 && (
                          <p className="text-sm text-gray-600">SSN: ***-**-{notification.metadata.ssn_last4}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Box 1 - Compensation</p>
                        <p className="text-2xl font-bold text-green-700">${formatAmount(notification.metadata.amount)}</p>
                      </div>
                    </div>

                    {/* Important Notice */}
                    <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
                      <p className="text-xs text-yellow-800">
                        📋 <strong>Important:</strong> Save this document for your tax records. You'll need it to file your taxes.
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-4 bg-gray-100 border-t flex flex-col gap-3">
                      <button
                        onClick={() => handleDownloadPDF(notification)}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-lg font-bold hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg hover:shadow-xl"
                      >
                        <ArrowDownTrayIcon className="w-6 h-6" />
                        📄 Download / Print PDF
                      </button>
                      <button
                        onClick={() => handleViewFullForm(notification)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        <DocumentTextIcon className="w-5 h-5" />
                        View Full IRS Form
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Regular notification content */
                  <div 
                    className="bg-black/20 rounded-lg p-4 cursor-pointer"
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">
                      {notification.content}
                    </p>
                  </div>
                )}

                {/* Read status */}
                <div className="flex items-center justify-end mt-3">
                  {notification.is_read ? (
                    <span className="flex items-center text-gray-500 text-xs">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      Read
                    </span>
                  ) : (
                    <span className="text-blue-400 text-xs font-semibold">
                      New
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
