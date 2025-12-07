// src/App.jsx
import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { Calendar, Home, Info, Image, Lock, Menu, X, CheckCircle, XCircle, MapPin, Utensils, Heart, Shield, CalendarCheck, BookText } from 'lucide-react';
import AdminsList from './AdminsList';
import AdminPanel from './components/admin/AdminPanel';
import HomeView from './components/HomeView';
import AboutView from './components/AboutView';
import GalleryView from './components/GalleryView';
import BookingView from './components/BookingView';
import LoginView from './components/LoginView';
import AdminPage from './components/AdminPage';
import { auth, db } from './firebase'; // Local import

export default function GurudwaraApp() {
  const showDebug = false; // Set to true to show debug info
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdminPending, setIsAdminPending] = useState(false);
  const [activeTab, setActiveTab] = useState(() => (typeof window !== 'undefined' && window.location.pathname === '/admin') ? 'admin' : 'home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [explicitSignedOut, setExplicitSignedOut] = useState(false);

  // Hardcoded App ID for DB path consistency in your local project
  const appId = 'gurudwara-local';

  // Sync activeTab to URL
  useEffect(() => {
    const pathMap = {
      'home': '/',
      'about': '/about',
      'gallery': '/gallery',
      'booking': '/booking',
      'login': '/login',
      'admin': '/admin',
    };
    const path = pathMap[activeTab] || '/';
    window.history.pushState({ activeTab }, '', path);
  }, [activeTab]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (e) => {
      const tabMap = {
        '/': 'home',
        '/about': 'about',
        '/gallery': 'gallery',
        '/booking': 'booking',
        '/login': 'login',
        '/admin': 'admin',
      };
      const tab = tabMap[window.location.pathname] || 'home';
      setActiveTab(tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Enable local persistence so user sessions survive page reloads for 24+ hours
        await setPersistence(auth, browserLocalPersistence);
        // if (!auth.currentUser) await signInAnonymously(auth);
        // NOTE: Auto anonymous sign-in has been disabled to avoid creating
        // unwanted anonymous users in the Firebase project. Anonymous sign-in
        // will still be available via the explicit "Continue as guest" button
        // in the login view (`src/components/LoginView.jsx`).
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {

      if (!mounted) return;
      setUser(u);
      // clear loading once auth state has been delivered (signed in or signed out)
      setLoading(false);

      try {
        const envList = (import.meta.env.VITE_ADMIN_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);
        if (!u) {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          return;
        }

        if (envList.includes(u.uid)) setIsAdmin(true);

        const adminDoc = await getDoc(doc(db, 'admins', u.uid));
        const emailDoc = u.email ? await getDoc(doc(db, 'admins_by_email', u.email.toLowerCase())) : null;
        // declare adminExists in outer scope so it can be used later when checking admin_requests
        var adminExists = !!(adminDoc?.exists() || emailDoc?.exists() || envList.includes(u.uid));
        setIsAdmin(adminExists);



        const envSuper = (import.meta.env.VITE_SUPER_ADMIN_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);
        if (envSuper.includes(u.uid)) {
          setIsSuperAdmin(true);
          // Treat super-admin env entries as admins as well for dev convenience
          setIsAdmin(true);
        } else if (adminDoc?.exists()) {
          setIsSuperAdmin(adminDoc.data()?.role === 'super_admin' || adminDoc.data()?.super === true);
        } else if (emailDoc?.exists()) {
          setIsSuperAdmin(emailDoc.data()?.role === 'super_admin' || emailDoc.data()?.super === true);
        } else {
          setIsSuperAdmin(false);
        }
      } catch (e) {
        console.error('Failed to determine admin status', e);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
        // Check if this user has a pending admin registration request
        // But only if they're NOT already an admin
        try {
          if (u && !adminExists) {
            const reqDoc = await getDoc(doc(db, 'admin_requests', u.uid));
            setIsAdminPending(reqDoc?.exists() && reqDoc.data()?.status === 'pending');
          } else {
            setIsAdminPending(false);
          }
        } catch (err) {
          console.error('Failed to read admin request', err);
          setIsAdminPending(false);
        }
    });

    return () => { mounted = false; unsubscribe(); };
  }, []);

  // Real-time role listeners for current user
  useEffect(() => {
    if (!user) return;
    let unsubAdmin = () => {};
    let unsubEmail = () => {};

    const checkAndSet = async () => {
      try {
        const envList = (import.meta.env.VITE_ADMIN_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        const emailSnap = user.email ? await getDoc(doc(db, 'admins_by_email', user.email.toLowerCase())) : null;
        const envSuperList = (import.meta.env.VITE_SUPER_ADMIN_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);
        // super-admin env UID should also be considered admin for access checks
        const exists = !!(adminSnap?.exists() || emailSnap?.exists() || envList.includes(user.uid) || envSuperList.includes(user.uid));
        setIsAdmin(exists);
        if (envSuperList.includes(user.uid)) {
          setIsSuperAdmin(true);
        } else if (adminSnap?.exists()) {
          setIsSuperAdmin(adminSnap.data()?.role === 'super_admin' || adminSnap.data()?.super === true);
        } else if (emailSnap?.exists()) {
          setIsSuperAdmin(emailSnap.data()?.role === 'super_admin' || emailSnap.data()?.super === true);
        } else {
          setIsSuperAdmin(false);
        }
      } catch (e) {
        console.error('Realtime admin check failed', e);
      }
    };

    const adminRef = doc(db, 'admins', user.uid);
    unsubAdmin = onSnapshot(adminRef, () => { checkAndSet(); });
    if (user.email) {
      const emailRef = doc(db, 'admins_by_email', user.email.toLowerCase());
      unsubEmail = onSnapshot(emailRef, () => { checkAndSet(); });
    }

    // listen for admin request changes for the signed-in user
    const reqRef = doc(db, 'admin_requests', user.uid);
    const unsubReq = onSnapshot(reqRef, (snap) => {
      setIsAdminPending(!!(snap.exists() && snap.data()?.status === 'pending'));
    }, (e) => console.error('admin_requests listener failed', e));

    checkAndSet();

    return () => { try { unsubAdmin(); } catch (err) { } try { unsubEmail(); } catch (err) { } try { unsubReq(); } catch (err) { } };
  }, [user]);

  // Clear explicit signed-out flag when a real user signs in again
  useEffect(() => {
    if (user) setExplicitSignedOut(false);
  }, [user]);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'about', label: 'About Us', icon: Info },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'booking', label: 'Bookings', icon: CalendarCheck },
  ];

  // Show a connecting loader only while the initial auth state is resolving.
  // Do not block rendering when `user` is null (signed out) because we support guest access.
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-orange-50 flex-col gap-4">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-orange-800 font-semibold">Connecting to Dashmesh Darbar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 font-sans text-gray-800 flex flex-col">
       {/* Navbar Structure */}
       <nav className="bg-orange-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="bg-white p-2 rounded-full mr-3">
                 <img src="/logo.jpg" alt="Gurudwara Logo" className="h-8 w-8 rounded-full object-cover" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Gurudwara Shri Dashmesh Darbar</h1>
                <p className="text-xs text-orange-200">Koparkhairane • Seva & Simran</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`p-4 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
                    activeTab === item.id ? 'bg-orange-800 text-white' : 'hover:bg-orange-600 text-orange-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
                {/* Unified Admin button (hidden on home). Opens admin route; LoginView will be shown if not admin/logged-in. */}
                {/* User controls: show email and actions only if signed in */}
                {user && user.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm px-3 py-2 rounded-md bg-orange-600/20">{user.email}</span>
                    <button
                      onClick={() => setActiveTab('admin')}
                      className="px-3 py-2 rounded-md text-sm bg-orange-600 hover:bg-orange-700"
                    >Admin</button>
                    <button
                      onClick={async () => { setExplicitSignedOut(true); await signOut(auth); setActiveTab('home'); }}
                      className="px-3 py-2 rounded-md text-sm bg-gray-700 hover:bg-gray-600"
                    >Sign Out</button>
                  </div>
                )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-orange-200 hover:text-white focus:outline-none"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Dropdown - RESTORED */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-orange-800">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-orange-600"
                >
                  <span className="flex items-center gap-2"><item.icon className="w-4 h-4" /> {item.label}</span>
                </button>
              ))}
              {/* Sign in/out controls (mobile): show email and admin/sign-out only if signed in */}
              {user && user.email && (
                <>
                  <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('admin'); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-orange-700 bg-orange-600">Admin</button>
                  <button onClick={async () => { setExplicitSignedOut(true); await signOut(auth); setIsMobileMenuOpen(false); setActiveTab('home'); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700 bg-gray-800">Sign Out</button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Debug panel: shows auth and role state for troubleshooting (remove in production) */}
      {showDebug && (<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="text-xs bg-white p-2 rounded shadow-sm border">
          <strong>Debug:</strong>
          <pre className="text-xs mt-1">{JSON.stringify({ uid: user?.uid, email: user?.email, isAdmin, isSuperAdmin, isAdminPending, activeTab }, null, 2)}</pre>
        </div>
      </div>)}
       {/* Pending approval banner: only show if user has pending request AND is NOT already an admin */}
       {isAdminPending && !isAdmin && (
         <div className="bg-yellow-100 border-l-4 border-yellow-400 text-yellow-700 p-4 max-w-7xl mx-auto w-full">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
             <strong>Admin request pending:</strong> Your registration for admin access is pending approval. You will be notified once a super admin reviews your request.
           </div>
         </div>
       )}

       <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'home' && <HomeView user={user} setActiveTab={setActiveTab} db={db} appId={appId} />}
        {activeTab === 'about' && <AboutView />}
        {activeTab === 'gallery' && <GalleryView />}
        {activeTab === 'booking' && <BookingView user={user} db={db} appId={appId} />}
        {activeTab === 'login' && <LoginView setActiveTab={setActiveTab} />}
        {activeTab === 'admin' && !isAdmin && <AdminPage setActiveTab={setActiveTab} db={db} isAdminPending={isAdminPending} user={user} setExplicitSignedOut={setExplicitSignedOut} />}
        {activeTab === 'admin' && isAdmin && <AdminPanel user={user} db={db} appId={appId} isSuperAdmin={isSuperAdmin} />}
      </main>

      {/* Footer & Role Switcher */}
      <footer className="bg-gray-900 text-gray-300 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.jpg" alt="Gurudwara Logo" className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <p className="text-white font-bold">Gurudwara Shri Dashmesh Darbar</p>
                  <p className="text-xs text-gray-400">Koparkhairane • Navi Mumbai</p>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Seva • Simran • Samarpan. A community space dedicated to Langar, education, and healthcare.
              </p>
              <a
                href="https://maps.app.goo.gl/pHYMBeBBBaVV54dr6"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm mt-4"
              >
                <MapPin className="h-4 w-4" /> View on Google Maps
              </a>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => setActiveTab('home')} className="hover:text-white">Home</button></li>
                <li><button onClick={() => setActiveTab('about')} className="hover:text-white">About Us</button></li>
                <li><button onClick={() => setActiveTab('gallery')} className="hover:text-white">Gallery</button></li>
                <li><button onClick={() => setActiveTab('booking')} className="hover:text-white">Bookings</button></li>
                {isAdmin && (
                  <li><button onClick={() => setActiveTab('admin')} className="hover:text-white">Admin Dashboard</button></li>
                )}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-3">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>Sector 23, Kopar Khairane, Navi Mumbai</li>
                <li>Phone: +91-XXXXXXXXXX</li>
                <li>Email: info@dashmeshdarbar.org</li>
                <li>Open: Daily 4:30 AM - 9:30 PM</li>
              </ul>
            </div>

            {/* Demo role toggle removed - admin status is determined from Firestore */}
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">© {new Date().getFullYear()} Gurudwara Shri Dashmesh Darbar. All rights reserved.</p>
            <div className="text-xs text-gray-500 flex items-center gap-4">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ------------------------------------------------------------------
// COMPONENT REFACTORING NOTES
// ------------------------------------------------------------------
// All view components have been extracted to separate files:
// - HomeView → src/components/HomeView.jsx
// - AboutView → src/components/AboutView.jsx
// - GalleryView → src/components/GalleryView.jsx
// - BookingView → src/components/BookingView.jsx
// - LoginView → src/components/LoginView.jsx
// - AdminPage → src/components/AdminPage.jsx
//
// All admin dashboard subcomponents have been extracted to:
// - AdminPanel → src/components/admin/AdminPanel.jsx
// - AdminBookings → src/components/admin/AdminBookings.jsx
// - AdminEvents → src/components/admin/AdminEvents.jsx
// - AdminRequests → src/components/admin/AdminRequests.jsx
// - AdminsList → src/AdminsList.jsx (existing)

