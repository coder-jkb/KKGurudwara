import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

export default function AdminsList({ user, db }) {
  const [admins, setAdmins] = useState([]);
  const [byEmail, setByEmail] = useState([]);

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

  const toggleSuper = async (id, current) => {
    try {
      const ref = doc(db, 'admins', id);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        await setDoc(ref, { ...existing.data(), role: current ? 'admin' : 'super_admin' });
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-4 text-gray-800">Current Admins</h3>
      <div className="space-y-3">
        {admins.map(a => (
          <div key={a.id} className="bg-white p-3 rounded border flex justify-between items-center">
            <div>
              <div className="font-semibold">UID: {a.id}</div>
              <div className="text-sm text-gray-600">Role: {a.role || 'admin'}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleSuper(a.id, a.role === 'super_admin')} className="px-3 py-1 bg-gray-200 rounded">{a.role === 'super_admin' ? 'Revoke Super' : 'Make Super'}</button>
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-xl font-bold mt-6 mb-4 text-gray-800">Admins By Email</h3>
      <div className="space-y-3">
        {byEmail.map(b => (
          <div key={b.id} className="bg-white p-3 rounded border flex justify-between items-center">
            <div>
              <div className="font-semibold">{b.id}</div>
              <div className="text-sm text-gray-600">Role: {b.role || 'admin'}</div>
            </div>
            <div className="flex gap-2">
              {/* No UID to toggle here — instruct removal via Firestore if needed */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
