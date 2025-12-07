import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle, XCircle } from 'lucide-react';

export default function AdminRequests({ user, db, isSuperAdmin }) {
  const [requests, setRequests] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `admin_requests`), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [user, db]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const approve = async (req) => {
    setLoadingId(req.id);
    try {
      const role = selectedRoles[req.id] || 'admin';
      if (req.uid || req.id) {
        const targetUid = req.uid || req.id;
        await setDoc(doc(db, 'admins', targetUid), { role, approvedBy: user?.uid || null, createdAt: serverTimestamp() });
      }
      if (req.email) {
        await setDoc(doc(db, 'admins_by_email', req.email.toLowerCase()), { role, approvedBy: user?.uid || null, createdAt: serverTimestamp() });
      }
      await updateDoc(doc(db, 'admin_requests', req.id), { status: 'approved', approvedBy: user?.uid || null, approvedAt: serverTimestamp() });
      setToast({ type: 'success', message: `✓ ${req.firstName} approved as ${role}` });
      // Remove from list
      setRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (e) { 
      console.error(e);
      setToast({ type: 'error', message: 'Failed to approve request' });
    }
    setLoadingId(null);
  };

  const reject = async (req) => {
    setLoadingId(req.id);
    try {
      await updateDoc(doc(db, 'admin_requests', req.id), { status: 'rejected', rejectedBy: user?.uid || null, rejectedAt: serverTimestamp() });
      setToast({ type: 'error', message: `✗ ${req.firstName}'s request rejected` });
      // Remove from list
      setRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (e) { 
      console.error(e);
      setToast({ type: 'error', message: 'Failed to reject request' });
    }
    setLoadingId(null);
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-4 text-gray-800">Admin Registration Requests</h3>
      
      {/* Toast Notification */}
      {toast && (
        <div className={`mb-4 p-3 rounded-lg border flex items-center gap-2 ${
          toast.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          {toast.message}
        </div>
      )}
      
      {requests.length === 0 ? <p className="text-gray-500 italic">No pending requests.</p> : (
        <div className="space-y-4">
          {requests.map(r => (
            <div key={r.id} className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center transition ${
              loadingId === r.id ? 'opacity-50 pointer-events-none' : ''
            }`}>
              <div>
                <div className="font-bold">{r.firstName} {r.middleName ? r.middleName + ' ' : ''}{r.lastName}</div>
                <div className="text-sm text-gray-600">Email: {r.email} • Phone: {r.phone || '-'}</div>
                <div className="text-xs text-gray-500">Submitted: {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '-'}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedRoles[r.id] || 'admin'}
                  onChange={(e) => setSelectedRoles(prev => ({ ...prev, [r.id]: e.target.value }))}
                  className="p-2 border rounded text-sm"
                  disabled={loadingId === r.id}
                >
                  <option value="admin">Admin</option>
                  {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                </select>
                <div className="flex gap-2">
                  <button 
                    onClick={() => approve(r)} 
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
                    disabled={loadingId === r.id}
                  >
                    {loadingId === r.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button 
                    onClick={() => reject(r)} 
                    className="px-3 py-2 bg-red-200 text-red-700 rounded hover:bg-red-300 transition disabled:opacity-50"
                    disabled={loadingId === r.id}
                  >
                    {loadingId === r.id ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
