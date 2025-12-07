import React, { useState } from 'react';
import { signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function LoginView({ setActiveTab }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e) => {
    e?.preventDefault();
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setActiveTab('admin');
    } catch (e) {
      console.error(e); setError(e.message || 'Sign in failed');
    }
    setLoading(false);
  };

  const handleGuest = async () => {
    setLoading(true); setError('');
    try {
      await signInAnonymously(auth);
      setActiveTab('home');
    } catch (e) { console.error(e); setError('Guest sign-in failed'); }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow">
      <h2 className="text-2xl font-bold mb-4">Account</h2>
      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded mt-1" />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex gap-2">
          <button disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded" onClick={handleSignIn}>{loading ? 'Please wait...' : 'Sign In'}</button>
          <button disabled={loading} className="px-4 py-2 bg-gray-200 rounded" onClick={() => setActiveTab('admin')}>{loading ? 'Please wait...' : 'Register (Admin)'}</button>
          <button type="button" disabled={loading} className="px-4 py-2 bg-gray-100 rounded" onClick={handleGuest}>Continue as Guest</button>
        </div>
      </form>
    </div>
  );
}
