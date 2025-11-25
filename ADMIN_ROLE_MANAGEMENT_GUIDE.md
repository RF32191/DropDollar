## 👥 Admin Role Management Guide

## 🎯 Overview

This system has **4 admin roles** with different permissions:

| Role | Permissions | Use Case |
|------|-------------|----------|
| **`super`** | Full access to everything | You (rf32191@gmail.com) |
| **`financial`** | View financial/tax data (masked) | Accountant, tax preparer |
| **`support`** | View user info (masked), manage sellers | Customer support team |
| **`read_only`** | View public data only | Analytics, reporting |

---

## ✅ Your Account (rf32191@gmail.com)

You are automatically set as **`super`** admin with full access.

---

## 📝 How to Grant Admin Access

### **Method 1: Using Supabase SQL Editor**

```sql
-- Grant support role to a customer service rep
SELECT grant_admin_role(
  'support@example.com',
  'support',
  'Customer service representative'
);

-- Grant financial role to your accountant
SELECT grant_admin_role(
  'accountant@example.com',
  'financial',
  'Tax and financial data access'
);

-- Grant read-only role to an analyst
SELECT grant_admin_role(
  'analyst@example.com',
  'read_only',
  'Analytics and reporting'
);
```

### **Method 2: From Your Application (Super Admin Only)**

```typescript
// src/lib/admin/grantAdminRole.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function grantAdminRole(
  email: string,
  role: 'read_only' | 'support' | 'financial' | 'super',
  notes: string
) {
  const supabase = createClientComponentClient();
  
  const { data, error } = await supabase.rpc('grant_admin_role', {
    p_email: email,
    p_role: role,
    p_notes: notes
  });
  
  if (error) {
    console.error('Error granting admin role:', error);
    throw error;
  }
  
  return data;
}
```

---

## 🗑️ How to Revoke Admin Access

### **Using SQL:**
```sql
SELECT revoke_admin_role('support@example.com');
```

### **From Application:**
```typescript
export async function revokeAdminRole(email: string) {
  const supabase = createClientComponentClient();
  
  const { data, error } = await supabase.rpc('revoke_admin_role', {
    p_email: email
  });
  
  if (error) throw error;
  return data;
}
```

---

## 📋 How to List All Admins

### **Using SQL:**
```sql
SELECT * FROM list_all_admins();
```

### **From Application:**
```typescript
export async function listAllAdmins() {
  const supabase = createClientComponentClient();
  
  const { data, error } = await supabase.rpc('list_all_admins');
  
  if (error) throw error;
  return data;
}
```

---

## 🔍 How to Check Your Own Role

### **Using SQL:**
```sql
SELECT get_admin_role();
```

### **From Application:**
```typescript
export async function getMyAdminRole() {
  const supabase = createClientComponentClient();
  
  const { data, error } = await supabase.rpc('get_admin_role');
  
  if (error) throw error;
  return data; // Returns: 'super', 'support', 'financial', 'read_only', or null
}
```

---

## 🎮 Game Functionality (NOT Affected)

### ✅ These Work Normally:
- Playing games
- Joining 1v1 sessions
- Joining Winner Takes It All
- Scoring points
- Receiving token payouts
- Viewing game leaderboards

### 🔒 These Are Protected:
- Viewing other users' full emails
- Viewing full tax information
- Viewing full seller personal data
- Mass downloading user data

---

## 🛡️ What Each Role Can Do

### **`super` Admin (You)**
✅ Grant/revoke admin roles
✅ View all masked data
✅ View audit logs
✅ Manage all system settings
✅ View security alerts

### **`financial` Admin**
✅ View tax profiles (masked: J*** S)
✅ View earnings ledgers
✅ View payout requests
✅ Generate 1099 reports
❌ Cannot see full names or addresses
❌ Cannot see seller profiles

### **`support` Admin**
✅ View user profiles (masked: jo***@gmail.com)
✅ View seller profiles (masked contact info)
✅ Approve seller applications
✅ Handle customer support tickets
❌ Cannot see tax/financial data

### **`read_only` Admin**
✅ View public game statistics
✅ View leaderboards
✅ View non-sensitive reports
❌ Cannot see user data
❌ Cannot see financial data

---

## 📊 Example: Admin Management UI Component

```tsx
// src/components/admin/AdminRoleManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function AdminRoleManager() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'read_only' | 'support' | 'financial' | 'super'>('support');
  const [notes, setNotes] = useState('');
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    loadAdmins();
  }, []);
  
  async function loadAdmins() {
    const { data, error } = await supabase.rpc('list_all_admins');
    if (!error && data) {
      setAdmins(data);
    }
  }
  
  async function handleGrant() {
    if (!newEmail || !notes) {
      alert('Email and notes are required');
      return;
    }
    
    try {
      const { data } = await supabase.rpc('grant_admin_role', {
        p_email: newEmail,
        p_role: newRole,
        p_notes: notes
      });
      
      if (data.success) {
        alert('Admin role granted!');
        setNewEmail('');
        setNotes('');
        loadAdmins();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }
  
  async function handleRevoke(email: string) {
    if (!confirm(`Revoke admin access for ${email}?`)) return;
    
    try {
      await supabase.rpc('revoke_admin_role', { p_email: email });
      alert('Admin role revoked');
      loadAdmins();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">👥 Admin Role Management</h2>
      
      {/* Grant New Admin */}
      <div className="mb-8 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Grant Admin Access</h3>
        <div className="grid gap-4">
          <input
            type="email"
            placeholder="Email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="border p-2 rounded"
          />
          
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as any)}
            className="border p-2 rounded"
          >
            <option value="read_only">Read Only</option>
            <option value="support">Support</option>
            <option value="financial">Financial</option>
            <option value="super">Super Admin</option>
          </select>
          
          <input
            type="text"
            placeholder="Notes (e.g., 'Customer support team member')"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border p-2 rounded"
          />
          
          <button
            onClick={handleGrant}
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            Grant Access
          </button>
        </div>
      </div>
      
      {/* Current Admins */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Current Admins</h3>
        <div className="space-y-2">
          {admins.map((admin) => (
            <div key={admin.email} className="border p-4 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-semibold">{admin.email}</p>
                <p className="text-sm text-gray-600">
                  Role: <span className="font-medium">{admin.role}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Granted: {new Date(admin.granted_at).toLocaleDateString()}
                </p>
                {admin.notes && (
                  <p className="text-sm text-gray-500">Notes: {admin.notes}</p>
                )}
              </div>
              
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded ${admin.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {admin.active ? 'Active' : 'Revoked'}
                </span>
                
                {admin.active && admin.email !== 'rf32191@gmail.com' && (
                  <button
                    onClick={() => handleRevoke(admin.email)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 📝 Audit Log Viewing (Super Admin Only)

```typescript
// View audit logs
const { data: logs } = await supabase
  .from('security_audit_log')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100);
```

---

## 🚀 Quick Setup Checklist

- [x] Run `SECURITY_HARDENING_FIXED.sql` in Supabase
- [ ] Verify your email (rf32191@gmail.com) is super admin
- [ ] Test granting a role to another email
- [ ] Test viewing masked data
- [ ] Create admin management UI in your dashboard
- [ ] Set up audit log monitoring

---

## ⚠️ Important Security Notes

1. **Never grant `super` role** unless absolutely necessary
2. **Always provide notes** when granting roles (for audit trail)
3. **Review audit logs regularly** for suspicious activity
4. **Revoke access immediately** when someone leaves your team
5. **Use `support` role** for customer service (not `super`)
6. **Use `financial` role** for accountants (not `super`)

---

## 🆘 Troubleshooting

### "Only super admins can grant roles"
➡️ You need to be logged in as rf32191@gmail.com

### "User not found"
➡️ The email doesn't exist in your system. User must sign up first.

### "Cannot read from table"
➡️ User doesn't have the right admin role for that data.

---

## 📞 Support

If you need to reset your admin system or have issues, run:

```sql
-- View current super admins
SELECT * FROM public.admin_roles WHERE role = 'super' AND active = TRUE;

-- Re-grant yourself super admin (if locked out)
INSERT INTO public.admin_roles (email, user_id, role, granted_by, notes)
SELECT 
    'rf32191@gmail.com',
    id,
    'super',
    'system_reset',
    'Emergency re-grant'
FROM auth.users
WHERE email = 'rf32191@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET role = 'super', active = TRUE, revoked_at = NULL;
```

