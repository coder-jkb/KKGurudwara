import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function AdminRequests({ user, db, isSuperAdmin }) {
  const [requests, setRequests] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `admin_requests`), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [user, db]);

  const approve = async (req) => {
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
    } catch (e) { console.error(e); }
  };

  const reject = async (req) => {
    try {
      await updateDoc(doc(db, 'admin_requests', req.id), { status: 'rejected', rejectedBy: user?.uid || null, rejectedAt: serverTimestamp() });
    } catch (e) { console.error(e); }
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-4 text-gray-800">Admin Registration Requests</h3>
      {requests.length === 0 ? <p className="text-gray-500 italic">No pending requests.</p> : (
        <div className="space-y-4">
          {requests.map(r => (
            <div key={r.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
              <div>
                <div className="font-bold">{r.firstName} {r.middleName ? r.middleName + ' ' : ''}{r.lastName}</div>
                <div className="text-sm text-gray-600">Email: {r.email} • Phone: {r.phone || '-'}</div>
                <div className="text-xs text-gray-500">Submitted: {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '-'}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedRoles[r.id] || 'admin'}
                  onChange={(e) => setSelectedRoles(prev => ({ ...prev, [r.id]: e.target.value }))}
                  className="p-2 border rounded"
                >
                  <option value="admin">Admin</option>
                  {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => approve(r)} className="px-3 py-2 bg-green-600 text-white rounded">Approve</button>
                  <button onClick={() => reject(r)} className="px-3 py-2 bg-red-200 rounded">Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
