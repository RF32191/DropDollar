# 🛠️ Tax Admin Dashboard - Complete Guide

Guide for administrators to manage W-9 forms, backups, and tax compliance.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Admin API Endpoints](#admin-api-endpoints)
3. [Backup System](#backup-system)
4. [Viewing All W-9s](#viewing-all-w-9s)
5. [Downloading User Documents](#downloading-user-documents)
6. [Backup Schedule & Best Practices](#backup-schedule--best-practices)
7. [Admin Dashboard UI Example](#admin-dashboard-ui-example)

---

## 🎯 Overview

The tax admin system provides comprehensive tools for:

- ✅ **View All W-9 Forms** - Search, filter, and review all submitted W-9s
- ✅ **Download Individual Records** - Get complete tax docs for any user
- ✅ **Automated Backups** - Export all tax data in JSON or CSV
- ✅ **Integrity Verification** - Ensure data consistency before backups
- ✅ **7-Year Retention** - IRS-compliant record keeping
- ✅ **Audit Trail** - Complete history of all tax activities

---

## 🔐 Admin API Endpoints

All admin endpoints require authentication via `x-api-key` header.

### 1. View All W-9 Forms

```
GET /api/tax/admin/w9s
Headers: x-api-key: your-admin-api-key
```

**Query Parameters:**
- `limit` - Records per page (default: 50, max: 500)
- `offset` - Number of records to skip (default: 0)
- `search` - Search by name, email, SSN last 4, or EIN
- `needs_1099` - Filter by 1099 requirement (true/false)
- `verified` - Filter by verification status (true/false)

**Example:**
```bash
# Get first 50 W-9s
curl "https://yoursite.com/api/tax/admin/w9s?limit=50&offset=0" \
  -H "x-api-key: $ADMIN_API_KEY"

# Search for specific user
curl "https://yoursite.com/api/tax/admin/w9s?search=john@example.com" \
  -H "x-api-key: $ADMIN_API_KEY"

# Get users needing 1099 this year
curl "https://yoursite.com/api/tax/admin/w9s?needs_1099=true" \
  -H "x-api-key: $ADMIN_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_email": "user@example.com",
      "full_name": "John Doe",
      "business_name": null,
      "tax_classification": "individual",
      "ssn_last4": "6789",
      "ein": null,
      "address_line1": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "postal_code": "94102",
      "signed_at": "2024-03-15T10:30:00Z",
      "is_verified": true,
      "total_lifetime_earnings_cents": 125000,
      "needs_1099_current_year": true,
      "created_at": "2024-03-15T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 234,
    "has_more": true
  }
}
```

---

### 2. Get Complete User Tax Record

```
POST /api/tax/admin/w9s
Headers: x-api-key: your-admin-api-key
Body: { "user_id": "uuid" }
```

Returns complete tax history for a specific user:
- W-9 information
- All earnings transactions
- Tax year summaries
- Payout history

**Example:**
```bash
curl -X POST "https://yoursite.com/api/tax/admin/w9s" \
  -H "x-api-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-uuid-here"}'
```

**Response:**
```json
{
  "success": true,
  "user_id": "uuid",
  "data": {
    "tax_profile": { /* W-9 data */ },
    "earnings_history": [ /* All earnings */ ],
    "tax_year_summaries": [ /* Annual summaries */ ],
    "payout_history": [ /* Withdrawals */ ]
  }
}
```

---

### 3. Download Complete Backup

```
GET /api/tax/admin/backup
Headers: x-api-key: your-admin-api-key
```

**Query Parameters:**
- `format` - Output format: 'json' or 'csv' (default: json)
- `tax_year` - Specific year or 'all' (default: current year)
- `include` - Data to include: 'w9s,earnings,summaries,payouts' (default: all)

**Examples:**
```bash
# Download complete JSON backup for 2024
curl "https://yoursite.com/api/tax/admin/backup?format=json&tax_year=2024" \
  -H "x-api-key: $ADMIN_API_KEY" \
  > tax-backup-2024.json

# Download CSV backup for all years
curl "https://yoursite.com/api/tax/admin/backup?format=csv&tax_year=all" \
  -H "x-api-key: $ADMIN_API_KEY" \
  > tax-backup-all-years.csv

# Download only W-9s and summaries
curl "https://yoursite.com/api/tax/admin/backup?include=w9s,summaries" \
  -H "x-api-key: $ADMIN_API_KEY" \
  > w9s-and-summaries.json
```

**Response:**
Downloadable file with complete tax data.

---

### 4. Verify Backup Integrity

```
POST /api/tax/admin/backup/verify
Headers: x-api-key: your-admin-api-key
Body: { "tax_year": 2024 }
```

Run integrity checks before creating backups.

**Example:**
```bash
curl -X POST "https://yoursite.com/api/tax/admin/backup/verify" \
  -H "x-api-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tax_year": 2024}'
```

**Response:**
```json
{
  "success": true,
  "tax_year": 2024,
  "overall_status": "PASS",
  "checks": [
    {
      "check_name": "Tax Profiles Completeness",
      "status": "PASS",
      "details": "All users with earnings have tax profiles"
    },
    {
      "check_name": "Earnings Totals Match",
      "status": "PASS",
      "details": "All summaries match ledger totals"
    }
  ],
  "summary": {
    "total_checks": 4,
    "passed": 4,
    "warnings": 0,
    "failed": 0
  }
}
```

---

### 5. Download User Tax Documents

```
GET /api/tax/admin/documents/[userId]
Headers: x-api-key: your-admin-api-key
```

**Query Parameters:**
- `format` - 'json' or 'pdf' (default: json)

**Example:**
```bash
# Download user's complete tax package
curl "https://yoursite.com/api/tax/admin/documents/user-uuid-here?format=json" \
  -H "x-api-key: $ADMIN_API_KEY" \
  > user-john-doe-tax-docs.json
```

**Response:**
Downloadable package with all user's tax documents and summaries.

---

## 💾 Backup System

### Automated Backup Schedule

**Recommended backup schedule:**

1. **Daily (Automated)**
   ```bash
   # Run at 2 AM daily
   curl "https://yoursite.com/api/tax/admin/backup?tax_year=all" \
     -H "x-api-key: $ADMIN_API_KEY" \
     > /secure/backups/daily/tax-$(date +%Y-%m-%d).json
   ```

2. **Weekly Verification (Automated)**
   ```bash
   # Run every Sunday
   curl -X POST "https://yoursite.com/api/tax/admin/backup/verify" \
     -H "x-api-key: $ADMIN_API_KEY" \
     -d '{"tax_year": 2024}'
   ```

3. **Monthly Archive (Manual)**
   - Download full backup
   - Upload to encrypted S3/cloud storage
   - Verify file integrity
   - Document in backup log

4. **Annual Year-End (Manual)**
   - After January 31 (after 1099 season)
   - Create complete snapshot
   - Archive for 7+ years
   - Burn to offline storage

### Backup Storage Best Practices

**Security:**
- ✅ Encrypt backups at rest (AES-256)
- ✅ Encrypt during transit (HTTPS/TLS)
- ✅ Store in access-controlled location
- ✅ Keep backups in multiple geographic locations
- ✅ Use separate credentials for backup access

**Retention:**
- ✅ Keep ALL tax records for minimum 7 years
- ✅ Keep 1099-related data indefinitely
- ✅ Daily backups: Keep for 30 days
- ✅ Monthly backups: Keep for 7 years
- ✅ Annual backups: Keep forever

**Testing:**
- ✅ Test restore procedure annually
- ✅ Verify data integrity after restore
- ✅ Document restore process
- ✅ Train backup team member

---

## 🔍 Viewing All W-9s

### Search Functionality

The W-9 admin endpoint supports powerful search:

**Search by name:**
```bash
curl "https://yoursite.com/api/tax/admin/w9s?search=John%20Doe" \
  -H "x-api-key: $ADMIN_API_KEY"
```

**Search by email:**
```bash
curl "https://yoursite.com/api/tax/admin/w9s?search=john@example.com" \
  -H "x-api-key: $ADMIN_API_KEY"
```

**Search by SSN last 4:**
```bash
curl "https://yoursite.com/api/tax/admin/w9s?search=6789" \
  -H "x-api-key: $ADMIN_API_KEY"
```

**Search by EIN:**
```bash
curl "https://yoursite.com/api/tax/admin/w9s?search=12-3456789" \
  -H "x-api-key: $ADMIN_API_KEY"
```

### Filtering

**Users needing 1099 this year:**
```bash
curl "https://yoursite.com/api/tax/admin/w9s?needs_1099=true" \
  -H "x-api-key: $ADMIN_API_KEY"
```

**Verified W-9s only:**
```bash
curl "https://yoursite.com/api/tax/admin/w9s?verified=true" \
  -H "x-api-key: $ADMIN_API_KEY"
```

**Unverified W-9s (need manual review):**
```bash
curl "https://yoursite.com/api/tax/admin/w9s?verified=false" \
  -H "x-api-key: $ADMIN_API_KEY"
```

### Pagination

```bash
# Page 1 (records 0-49)
curl "https://yoursite.com/api/tax/admin/w9s?limit=50&offset=0" \
  -H "x-api-key: $ADMIN_API_KEY"

# Page 2 (records 50-99)
curl "https://yoursite.com/api/tax/admin/w9s?limit=50&offset=50" \
  -H "x-api-key: $ADMIN_API_KEY"

# Page 3 (records 100-149)
curl "https://yoursite.com/api/tax/admin/w9s?limit=50&offset=100" \
  -H "x-api-key: $ADMIN_API_KEY"
```

---

## 📥 Downloading User Documents

### Individual User Package

Download complete tax package for a specific user:

```bash
curl "https://yoursite.com/api/tax/admin/documents/user-uuid?format=json" \
  -H "x-api-key: $ADMIN_API_KEY" \
  > user-tax-package.json
```

**Package includes:**
- ✅ W-9 information
- ✅ Complete earnings history
- ✅ Tax year summaries (all years)
- ✅ All 1099 form URLs
- ✅ Payout history
- ✅ Summary statistics

**Use cases:**
- Respond to user tax inquiries
- Prepare for IRS audit
- Resolve payout disputes
- Annual record review

---

## 📊 Admin Dashboard UI Example

Here's a complete React admin dashboard for managing tax records:

```typescript
// src/app/admin/tax-dashboard/page.tsx

'use client';

import { useState, useEffect } from 'react';

export default function TaxAdminDashboard() {
  const [w9s, setW9s] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState(null);

  const apiKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY;

  const fetchW9s = async () => {
    setLoading(true);
    try {
      let url = `/api/tax/admin/w9s?limit=50&offset=0`;
      
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      if (filter === 'needs_1099') {
        url += `&needs_1099=true`;
      } else if (filter === 'unverified') {
        url += `&verified=false`;
      }

      const response = await fetch(url, {
        headers: { 'x-api-key': apiKey! },
      });

      const result = await response.json();
      if (result.success) {
        setW9s(result.data);
      }
    } catch (error) {
      console.error('Error fetching W-9s:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async () => {
    try {
      const url = `/api/tax/admin/backup?format=json&tax_year=all`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading backup:', error);
    }
  };

  const verifyIntegrity = async () => {
    try {
      const response = await fetch('/api/tax/admin/backup/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey!,
        },
        body: JSON.stringify({ tax_year: new Date().getFullYear() }),
      });

      const result = await response.json();
      alert(`Integrity Check: ${result.overall_status}\n\n${JSON.stringify(result.summary, null, 2)}`);
    } catch (error) {
      console.error('Error verifying integrity:', error);
    }
  };

  const downloadUserDocs = async (userId: string) => {
    const url = `/api/tax/admin/documents/${userId}?format=json`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    fetchW9s();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Tax Administration Dashboard</h1>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={downloadBackup}
          className="px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all"
        >
          📥 Download Full Backup
        </button>

        <button
          onClick={verifyIntegrity}
          className="px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all"
        >
          ✅ Verify Data Integrity
        </button>

        <button
          onClick={() => window.location.href = '/api/tax/admin/export-1099s?tax_year=2024&format=csv'}
          className="px-6 py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition-all"
        >
          📊 Export 1099 Data
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-2">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, SSN last 4, or EIN..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">Filter</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All W-9s</option>
              <option value="needs_1099">Needs 1099 (Current Year)</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchW9s}
          disabled={loading}
          className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* W-9 List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Name</th>
              <th className="px-6 py-4 text-left font-semibold">Email</th>
              <th className="px-6 py-4 text-left font-semibold">SSN Last 4</th>
              <th className="px-6 py-4 text-left font-semibold">Lifetime Earnings</th>
              <th className="px-6 py-4 text-left font-semibold">Status</th>
              <th className="px-6 py-4 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {w9s.map((w9: any) => (
              <tr key={w9.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">{w9.full_name}</td>
                <td className="px-6 py-4">{w9.user_email}</td>
                <td className="px-6 py-4">***-**-{w9.ssn_last4}</td>
                <td className="px-6 py-4">
                  ${(w9.total_lifetime_earnings_cents / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  {w9.needs_1099_current_year && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                      Needs 1099
                    </span>
                  )}
                  {w9.is_verified && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold ml-2">
                      Verified
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => downloadUserDocs(w9.user_id)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold"
                  >
                    Download Docs
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {w9s.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-500">
            No W-9 records found
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🎯 Quick Reference Commands

### Daily Operations

```bash
# View recent W-9 submissions
curl "https://yoursite.com/api/tax/admin/w9s?limit=10" \
  -H "x-api-key: $ADMIN_API_KEY"

# Check users needing 1099
curl "https://yoursite.com/api/tax/admin/w9s?needs_1099=true" \
  -H "x-api-key: $ADMIN_API_KEY"
```

### Weekly Maintenance

```bash
# Verify data integrity
curl -X POST "https://yoursite.com/api/tax/admin/backup/verify" \
  -H "x-api-key: $ADMIN_API_KEY" \
  -d '{"tax_year": 2024}'

# Download weekly backup
curl "https://yoursite.com/api/tax/admin/backup?tax_year=all" \
  -H "x-api-key: $ADMIN_API_KEY" \
  > backup-$(date +%Y-%m-%d).json
```

### Annual Tasks (January)

```bash
# Generate 1099s
curl -X POST "https://yoursite.com/api/tax/admin/generate-1099s" \
  -H "x-api-key: $ADMIN_API_KEY" \
  -d '{"tax_year": 2024}'

# Email 1099s to users
curl -X POST "https://yoursite.com/api/tax/admin/email-1099s" \
  -H "x-api-key: $ADMIN_API_KEY" \
  -d '{"tax_year": 2024}'

# Export for IRS e-filing
curl "https://yoursite.com/api/tax/admin/export-1099s?tax_year=2024&format=csv" \
  -H "x-api-key: $ADMIN_API_KEY" \
  > 1099-export-2024.csv
```

---

## 📞 Need Help?

- **Setup Issues**: See `TAX_SYSTEM_SETUP_GUIDE.md`
- **Integration**: See `TAX_SYSTEM_INTEGRATION_EXAMPLES.md`
- **IRS Compliance**: Consult with your CPA
- **Backup Recovery**: Test restore procedure annually

---

**Remember**: Tax records must be kept for 7+ years. Back up regularly and store securely!

