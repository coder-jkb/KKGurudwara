import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Trash2, Shield } from 'lucide-react';

export default function AdminsList({ user, db }) {
  const [admins, setAdmins] = useState([]);
  const [byEmail, setByEmail] = useState([]);
  const [selectedAdmins, setSelectedAdmins] = useState(new Set());
  const [selectedByEmail, setSelectedByEmail] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!db) return;
    const adminCol = collection(db, 'admins');
    const unsub = onSnapshot(adminCol, (snap) => {
      setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const emailCol = collection(db, 'admins_by_email');
    const unsubEmail = onSnapshot(emailCol, (snap) => {
      setByEmail(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { try { unsub(); } catch{} try { unsubEmail(); } catch{} };
  }, [db]);

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const toggleAdminSelect = (id) => {
    const newSet = new Set(selectedAdmins);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedAdmins(newSet);
  };

  const toggleEmailSelect = (id) => {
    const newSet = new Set(selectedByEmail);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedByEmail(newSet);
  };

  const toggleSuper = async (id, current) => {
    try {
      const ref = doc(db, 'admins', id);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        await setDoc(ref, { ...existing.data(), role: current ? 'admin' : 'super_admin' });
        setToast({ type: 'success', message: `${current ? 'Revoked' : 'Promoted to'} Super Admin` });
      }
    } catch (e) { 
      console.error(e);
      setToast({ type: 'error', message: 'Failed to update role' });
    }
  };

  const makeSelectedSuper = async () => {
    setLoading(true);
    try {
      for (const id of selectedAdmins) {
        const ref = doc(db, 'admins', id);
        const existing = await getDoc(ref);
        if (existing.exists()) {
          await setDoc(ref, { ...existing.data(), role: 'super_admin' });
        }
      }
      setSelectedAdmins(new Set());
      setToast({ type: 'success', message: `${selectedAdmins.size} admin(s) promoted to Super` });
    } catch (e) {
      console.error(e);
      setToast({ type: 'error', message: 'Failed to promote admins' });
    }
    setLoading(false);
  };

  const makeSelectedEmailSuper = async () => {
    setLoading(true);
    try {
      for (const email of selectedByEmail) {
        const ref = doc(db, 'admins_by_email', email);
        const existing = await getDoc(ref);
        if (existing.exists()) {
          await setDoc(ref, { ...existing.data(), role: 'super_admin' });
        }
      }
      setSelectedByEmail(new Set());
      setToast({ type: 'success', message: `${selectedByEmail.size} admin(s) promoted to Super` });
    } catch (e) {
      console.error(e);
      setToast({ type: 'error', message: 'Failed to promote admins' });
    }
    setLoading(false);
  };

  const deleteSelected = async () => {
    // Can only delete admins that are NOT super_admin
    const deletableAdmins = Array.from(selectedAdmins).filter(id => {
      const admin = admins.find(a => a.id === id);
      return admin && admin.role !== 'super_admin';
    });

    if (deletableAdmins.length === 0) {
      setToast({ type: 'error', message: 'Cannot delete super admins. Demote to admin first.' });
      return;
    }

    if (!confirm(`Delete ${deletableAdmins.length} admin(s)?`)) return;

    setLoading(true);
    try {
      for (const id of deletableAdmins) {
        await deleteDoc(doc(db, 'admins', id));
      }
      setSelectedAdmins(new Set());
      setToast({ type: 'success', message: `${deletableAdmins.length} admin(s) deleted` });
    } catch (e) {
      console.error(e);
      setToast({ type: 'error', message: 'Failed to delete admins' });
    }
    setLoading(false);
  };

  const deleteEmailSelected = async () => {
    const deletableEmails = Array.from(selectedByEmail).filter(email => {
      const admin = byEmail.find(a => a.id === email);
      return admin && admin.role !== 'super_admin';
    });

    if (deletableEmails.length === 0) {
      setToast({ type: 'error', message: 'Cannot delete super admins. Demote to admin first.' });
      return;
    }

    if (!confirm(`Delete ${deletableEmails.length} admin(s)?`)) return;

    setLoading(true);
    try {
      for (const email of deletableEmails) {
        await deleteDoc(doc(db, 'admins_by_email', email));
      }
      setSelectedByEmail(new Set());
      setToast({ type: 'success', message: `${deletableEmails.length} admin(s) deleted` });
    } catch (e) {
      console.error(e);
      setToast({ type: 'error', message: 'Failed to delete admins' });
    }
    setLoading(false);
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`mb-4 p-3 rounded-lg border flex items-center gap-2 ${
          toast.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.message}
        </div>
      )}

      <h3 className="text-xl font-bold mb-4 text-gray-800">Current Admins (by UID)</h3>
      <div className="space-y-3 mb-6">
        {admins.map(a => (
          <div key={a.id} className="bg-white p-3 rounded border border-gray-200 flex items-center justify-between gap-3">
            <input 
              type="checkbox"
              checked={selectedAdmins.has(a.id)}
              onChange={() => toggleAdminSelect(a.id)}
              className="w-4 h-4 cursor-pointer"
              disabled={loading}
            />
            <div className="flex-1">
              <div className="font-semibold">UID: {a.id}</div>
              <div className={`text-sm font-bold flex items-center gap-2 ${a.role === 'super_admin' ? 'text-purple-600' : 'text-gray-600'}`}>
                {a.role === 'super_admin' && <Shield className="w-4 h-4" />}
                Role: {a.role || 'admin'}
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => toggleSuper(a.id, a.role === 'super_admin')} 
                className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-medium transition"
                disabled={loading}
              >
                {a.role === 'super_admin' ? 'Demote' : 'Make Super'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk actions for admins */}
      {selectedAdmins.size > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="font-semibold text-blue-800">{selectedAdmins.size} selected</span>
          <div className="flex gap-2">
            <button 
              onClick={makeSelectedSuper}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
              disabled={loading}
            >
              <Shield className="w-4 h-4" />
              {loading ? 'Processing...' : 'Make Super'}
            </button>
            <button 
              onClick={deleteSelected}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              disabled={loading}
            >
              <Trash2 className="w-4 h-4" />
              {loading ? 'Processing...' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      <h3 className="text-xl font-bold mb-4 text-gray-800">Admins By Email</h3>
      <div className="space-y-3 mb-6">
        {byEmail.map(b => (
          <div key={b.id} className="bg-white p-3 rounded border border-gray-200 flex items-center justify-between gap-3">
            <input 
              type="checkbox"
              checked={selectedByEmail.has(b.id)}
              onChange={() => toggleEmailSelect(b.id)}
              className="w-4 h-4 cursor-pointer"
              disabled={loading}
            />
            <div className="flex-1">
              <div className="font-semibold">{b.id}</div>
              <div className={`text-sm font-bold flex items-center gap-2 ${b.role === 'super_admin' ? 'text-purple-600' : 'text-gray-600'}`}>
                {b.role === 'super_admin' && <Shield className="w-4 h-4" />}
                Role: {b.role || 'admin'}
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={async () => {
                  try {
                    const ref = doc(db, 'admins_by_email', b.id);
                    const existing = await getDoc(ref);
                    if (existing.exists()) {
                      await setDoc(ref, { ...existing.data(), role: b.role === 'super_admin' ? 'admin' : 'super_admin' });
                      setToast({ type: 'success', message: `${b.role === 'super_admin' ? 'Demoted' : 'Promoted to'} Super Admin` });
                    }
                  } catch (e) {
                    console.error(e);
                    setToast({ type: 'error', message: 'Failed to update role' });
                  }
                }}
                className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-medium transition"
                disabled={loading}
              >
                {b.role === 'super_admin' ? 'Demote' : 'Make Super'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk actions for email admins */}
      {selectedByEmail.size > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="font-semibold text-blue-800">{selectedByEmail.size} selected</span>
          <div className="flex gap-2">
            <button 
              onClick={makeSelectedEmailSuper}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
              disabled={loading}
            >
              <Shield className="w-4 h-4" />
              {loading ? 'Processing...' : 'Make Super'}
            </button>
            <button 
              onClick={deleteEmailSelected}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              disabled={loading}
            >
              <Trash2 className="w-4 h-4" />
              {loading ? 'Processing...' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
