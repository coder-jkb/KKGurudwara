import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { setDoc, serverTimestamp, doc } from 'firebase/firestore';
import { auth } from '../firebase';

export default function AdminPage({ setActiveTab, db, isAdminPending, user, setExplicitSignedOut }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const currentUser = auth.currentUser;

  // If the user has a pending admin request, show a clear awaiting approval message
  const showAwaiting = Boolean(isAdminPending && user && !user.isAnonymous);

  const handleSignIn = async (e) => {
    e?.preventDefault();
    setLoading(true); setMsg('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setActiveTab('admin');
    } catch (e) { console.error(e); setMsg(e.message || 'Sign in failed'); }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setLoading(true); setMsg('');
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const uid = res.user.uid;
      await setDoc(doc(db, 'admin_requests', uid), {
        uid,
        email,
        firstName,
        middleName,
        lastName,
        phone,
        dob,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setMsg('Registration submitted. Await super admin approval.');
      // keep user signed in; admin access will be granted after approval
    } catch (e) { console.error(e); setMsg(e.message || 'Registration failed'); }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
      {/* Signed-in status banner to clarify authentication state */}
      {currentUser && !currentUser.isAnonymous && (
        <div className="md:col-span-2 bg-blue-50 border border-blue-100 p-3 rounded mb-2 flex items-center justify-between">
          <div className="text-sm text-blue-800">Signed in as <strong>{currentUser.email}</strong></div>
          <div>
            <button onClick={async () => { setExplicitSignedOut(true); await signOut(auth); setActiveTab('home'); }} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Sign Out</button>
          </div>
        </div>
      )}
      {showAwaiting && (
        <div className="md:col-span-2 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded mb-2 text-yellow-800">
          <strong>Awaiting approval:</strong> Your admin registration is pending review by a super admin. You will receive a notification or email once your request is approved. In the meantime, you can continue using the public site features.
        </div>
      )}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Admin Login</h3>
        <form onSubmit={handleSignIn} className="space-y-3">
          <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded" />
          <input required type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded" />
          {msg && <div className="text-sm text-gray-600">{msg}</div>}
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-orange-600 text-white rounded" disabled={loading}>{loading ? 'Please wait...' : 'Sign In'}</button>
            <button type="button" className="px-3 py-2 bg-gray-200 rounded" onClick={() => { setActiveTab('home'); }}>Back</button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Admin Registration</h3>
        <form onSubmit={handleRegister} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <input required placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} className="p-2 border rounded" />
            <input placeholder="Middle name" value={middleName} onChange={e => setMiddleName(e.target.value)} className="p-2 border rounded" />
            <input required placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} className="p-2 border rounded" />
          </div>
          <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded" />
          <input required type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} className="p-2 border rounded" />
            <input type="date" placeholder="Date of birth" value={dob} onChange={e => setDob(e.target.value)} className="p-2 border rounded" />
          </div>
          {msg && <div className="text-sm text-gray-600">{msg}</div>}
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-orange-600 text-white rounded" disabled={loading}>{loading ? 'Submitting...' : 'Register'}</button>
            <button type="button" className="px-3 py-2 bg-gray-200 rounded" onClick={() => { setFirstName(''); setMiddleName(''); setLastName(''); setEmail(''); setPassword(''); setPhone(''); setDob(''); setMsg(''); }}>Clear</button>
          </div>
        </form>
        <p className="text-xs text-gray-500 mt-2">After registering, a super admin will review and approve your request before admin access is granted.</p>
      </div>
    </div>
  );
}
