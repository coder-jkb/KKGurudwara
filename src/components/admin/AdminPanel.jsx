import React, { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Lock } from 'lucide-react';
import AdminBookings from "./AdminBookings";
import AdminEvents from "./AdminEvents";
import AdminRequests from "./AdminRequests";
import AdminsList from "../../AdminsList";

export default function AdminPanel({ user, db, appId, isSuperAdmin }) {
  const [activeAdminTab, setActiveAdminTab] = useState('bookings');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUid, setInviteUid] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
      <div className="bg-gray-800 text-white p-6 flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold flex items-center gap-2"><Lock className="w-6 h-6"/> Admin Dashboard</h2>
           <p className="text-gray-400 text-sm">Manage Gurudwara Operations</p>
        </div>
        <div className="flex gap-2">
          <button 
             onClick={() => setActiveAdminTab('bookings')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeAdminTab === 'bookings' ? 'bg-orange-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
             Bookings
          </button>
          <button 
             onClick={() => setActiveAdminTab('events')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeAdminTab === 'events' ? 'bg-orange-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
             Events
          </button>
         {isSuperAdmin && (
          <button
            onClick={() => setActiveAdminTab('requests')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeAdminTab === 'requests' ? 'bg-orange-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            Requests
          </button>
         )}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveAdminTab('admins')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeAdminTab === 'admins' ? 'bg-orange-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Admins
            </button>
          )}
        </div>
      </div>

      <div className="p-6 bg-gray-50 flex-grow">
        <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold mb-2">Invite Admin</h4>
          <p className="text-sm text-gray-600 mb-3">Invite by email (recommended) or directly by UID.</p>
          <div className="grid md:grid-cols-3 gap-3 items-center">
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" className="md:col-span-1 p-2 border rounded" />
            <input value={inviteUid} onChange={e => setInviteUid(e.target.value)} placeholder="(optional) UID" className="md:col-span-1 p-2 border rounded" />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setInviteLoading(true); setInviteMsg('');
                  try {
                    if (inviteEmail) {
                      const id = inviteEmail.toLowerCase();
                      await setDoc(doc(db, 'admins_by_email', id), { role: 'admin', invitedBy: user?.uid || null, createdAt: serverTimestamp() });
                      setInviteMsg('Invited by email.');
                    }
                    if (inviteUid) {
                      await setDoc(doc(db, 'admins', inviteUid), { role: 'admin', invitedBy: user?.uid || null, createdAt: serverTimestamp() });
                      setInviteMsg((prev) => prev ? prev + ' Also added UID.' : 'Invited by UID.');
                    }
                    if (!inviteEmail && !inviteUid) setInviteMsg('Provide email or UID.');
                  } catch (e) {
                    console.error(e); setInviteMsg('Failed to invite.');
                  }
                  setInviteLoading(false);
                }}
                className="px-3 py-2 bg-orange-600 text-white rounded"
                disabled={inviteLoading}
              >{inviteLoading ? 'Inviting...' : 'Invite'}</button>
              <button onClick={() => { setInviteEmail(''); setInviteUid(''); setInviteMsg(''); }} className="px-3 py-2 bg-gray-200 rounded">Clear</button>
            </div>
          </div>
          {inviteMsg && <p className="text-sm mt-2 text-gray-700">{inviteMsg}</p>}
        </div>
        {activeAdminTab === 'bookings' && <AdminBookings user={user} db={db} appId={appId} />}
        {activeAdminTab === 'events' && <AdminEvents user={user} db={db} appId={appId} />}
        {activeAdminTab === 'requests' && isSuperAdmin && <AdminRequests user={user} db={db} isSuperAdmin={isSuperAdmin} />}
        {activeAdminTab === 'admins' && isSuperAdmin && <AdminsList user={user} db={db} />}
      </div>
    </div>
  );
}
