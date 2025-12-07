// src/App.jsx
import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { Calendar, Home, Info, Image, Lock, Menu, X, CheckCircle, XCircle, MapPin, Utensils, Heart, Shield, CalendarCheck, BookText } from 'lucide-react';
import AdminsList from './AdminsList';
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
        // Only sign in anonymously if there is no existing user to avoid
        // overwriting a recently authenticated session.
        if (!auth.currentUser) await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      console.debug('onAuthStateChanged', { uid: u?.uid, email: u?.email, isAnonymous: u?.isAnonymous });
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

        console.debug('initial admin check', { uid: u.uid, email: u.email, envList, adminExists, adminDocExists: !!adminDoc?.exists(), emailDocExists: !!emailDoc?.exists() });

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
    console.debug('attached realtime admin listeners for', { uid: user.uid, email: user.email });
    return () => { try { unsubAdmin(); } catch (err) { console.debug(err); } try { unsubEmail(); } catch (err) { console.debug(err); } try { unsubReq(); } catch (err) { console.debug(err); } };
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
                {/* User controls: always show current auth status (email, guest, or signed out) */}
                <div className="flex items-center gap-2">
                  {user && user.email ? (
                    <>
                      <span className="text-sm px-3 py-2 rounded-md bg-orange-600/20">{user.email}</span>
                      <button
                        onClick={() => setActiveTab('admin')}
                        className="px-3 py-2 rounded-md text-sm bg-orange-600 hover:bg-orange-700"
                      >Admin</button>
                      <button
                        onClick={async () => { setExplicitSignedOut(true); await signOut(auth); setActiveTab('home'); }}
                        className="px-3 py-2 rounded-md text-sm bg-gray-700 hover:bg-gray-600"
                      >Sign Out</button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm px-3 py-2 rounded-md bg-gray-700/20">{explicitSignedOut ? 'Signed out' : 'Guest'}</span>
                      <button onClick={() => setActiveTab('admin')} className="px-3 py-2 rounded-md text-sm bg-gray-700 hover:bg-gray-600">Sign In</button>
                    </div>
                  )}
                </div>
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
              {/* Sign out for authenticated users (mobile) */}
              {user && user.email && (
                <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('admin'); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-orange-700 bg-orange-600">Admin</button>
              )}
              {user && user.email ? (
                <button onClick={async () => { setExplicitSignedOut(true); await signOut(auth); setIsMobileMenuOpen(false); setActiveTab('home'); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700 bg-gray-800">Sign Out</button>
              ) : (
                <button onClick={() => { setIsMobileMenuOpen(false); setActiveTab('admin'); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700 bg-gray-800">Sign In</button>
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
        {activeTab === 'admin' && !isAdmin && <AdminPage setActiveTab={setActiveTab} db={db} isAdminPending={isAdminPending} user={user} />}
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
// SUB-COMPONENTS
// ------------------------------------------------------------------

function HomeView({ setActiveTab, user, db, appId }) {
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    // Load public events even for anonymous users so the listing is always visible.
    const q = query(collection(db, `artifacts/${appId}/public/data/events`), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.debug('HomeView events loaded:', { count: eventsList.length, events: eventsList });
      setEvents(eventsList);
    }, (error) => console.error('HomeView events error:', error));
    return () => unsubscribe();
  }, [db, appId]);

  {/* Hero Section */}
  return (
    <div className="space-y-12">
      <div className="relative bg-orange-800 rounded-2xl overflow-hidden shadow-2xl h-[30em] flex items-center justify-center text-center px-4">
        {/* Note: Ensure this image URL is valid or replace with 'gurudwara-inside-bg-1x1.png' if you have the file locally */}
        <div 
           className="absolute inset-0 opacity-30 bg-cover"
           style={{ 
             backgroundImage: "url('gurudwara-inside-bg-1x1.png')",
             backgroundPosition: "0 -24em"
           }}
        />
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">Seva, Simran, Samarpan</h1>
          <p className="text-orange-100 text-lg md:text-xl mb-8">
            Where the Light of Guru Gobind Singh Ji Shines Through Seva. Join us in serving humanity with love and devotion.
          </p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => setActiveTab('booking')}
              className="bg-white text-orange-800 px-6 py-3 rounded-full font-bold hover:bg-orange-100 transition shadow-lg"
            >
              Book Seva / Event
            </button>
            <button 
              onClick={() => setActiveTab('about')}
              className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-full font-bold hover:bg-white/10 transition"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-orange-600" /> Upcoming Events
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.length === 0 ? (
            <div className="col-span-full text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
              <p className="text-gray-500">No upcoming events scheduled at the moment.</p>
            </div>
          ) : (
            events.map(event => (
              <div key={event.id} className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden hover:shadow-md transition">
                <div className="bg-orange-100 p-4 border-b border-orange-200">
                  <span className="text-xs font-bold text-orange-800 uppercase tracking-wide">
                    {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                  <p className="text-gray-600 line-clamp-3">{event.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AboutView() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-orange-800 mb-8 text-center">About Dashmesh Darbar</h2>
        
        <div className="space-y-8 text-lg text-gray-700 leading-relaxed">
          <p>
            <strong className="text-gray-900">Gurudwara Shri Dashmesh Darbar</strong> in Koparkhairane is more than just a place of worship; it is a vibrant community hub dedicated to the Sikh principles of <em className="text-orange-700">Sarbat Da Bhala</em> (Welfare of All).
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 my-10">
            <div className="bg-orange-50 p-6 rounded-xl border-l-4 border-orange-500">
              <h3 className="font-bold text-xl mb-2 flex items-center gap-2"><Utensils className="w-5 h-5"/> Langar Seva</h3>
              <p className="text-sm">Providing free, nutritious meals to hundreds daily, regardless of caste, creed, or religion.</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-xl border-l-4 border-blue-500">
              <h3 className="font-bold text-xl mb-2 flex items-center gap-2"><Heart className="w-5 h-5"/> NGO Operations</h3>
              <p className="text-sm">Functioning as a non-profit entity to organize medical camps, educational support, and disaster relief.</p>
            </div>
          </div>

          <p>
            Our management committee operates with total transparency, ensuring every donation reaches the needy. We believe that true devotion to the Divine is expressed through service to humanity.
          </p>

          <div className="mt-8 pt-8 border-t border-gray-100">
             <h3 className="font-bold text-xl mb-4">Visit Us</h3>
             <p className="flex items-start gap-2">
               <MapPin className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
               <span>Sardar Gurucharan Singh Kocher Marg, Sector 23, Kopar Khairane, Navi Mumbai, Maharashtra 400709</span>
             </p>
             <div className="mt-6 rounded-xl overflow-hidden border border-gray-200">
               <div className="aspect-video w-full">
                 <iframe 
                   src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15080.672788399903!2d72.9792792871582!3d19.100275799999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c0d5d9e7af77%3A0xd74cef6eb6431d11!2sGURUDWARA%20SHRI%20DASHMESH%20DARBAR%2C%20KOPARKHAIRANE!5e0!3m2!1sen!2sin!4v1764409209589!5m2!1sen!2sin"
                   width="100%" 
                   height="450" 
                   style={{ border: 0 }} 
                   allowFullScreen="" 
                   loading="lazy" 
                   referrerPolicy="no-referrer-when-downgrade"
                   title="Gurudwara Shri Dashmesh Darbar Location"
                 ></iframe>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GalleryView() {
  // Corrected URLs (removed Markdown syntax from strings)
  const images = [
    { src: "[https://images.unsplash.com/photo-1596541656006-25916f73600f?q=80&w=800&auto=format&fit=crop](https://images.unsplash.com/photo-1596541656006-25916f73600f?q=80&w=800&auto=format&fit=crop)", caption: "Darbar Sahib" },
    { src: "[https://images.unsplash.com/photo-1582236592288-7e39a3f9151c?q=80&w=800&auto=format&fit=crop](https://images.unsplash.com/photo-1582236592288-7e39a3f9151c?q=80&w=800&auto=format&fit=crop)", caption: "Community Kitchen" },
    { src: "[https://images.unsplash.com/photo-1598436440269-807d9f2a0090?q=80&w=800&auto=format&fit=crop](https://images.unsplash.com/photo-1598436440269-807d9f2a0090?q=80&w=800&auto=format&fit=crop)", caption: "Evening Kirtan" },
    { src: "[https://images.unsplash.com/photo-1621509337578-8386829729a4?q=80&w=800&auto=format&fit=crop](https://images.unsplash.com/photo-1621509337578-8386829729a4?q=80&w=800&auto=format&fit=crop)", caption: "Nagar Kirtan" },
    { src: "[https://images.unsplash.com/photo-1605218427368-35b0d0c64951?q=80&w=800&auto=format&fit=crop](https://images.unsplash.com/photo-1605218427368-35b0d0c64951?q=80&w=800&auto=format&fit=crop)", caption: "Langar Hall" },
    { src: "[https://images.unsplash.com/photo-1542465494-02d295052329?q=80&w=800&auto=format&fit=crop](https://images.unsplash.com/photo-1542465494-02d295052329?q=80&w=800&auto=format&fit=crop)", caption: "Sewa" }
  ];

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Gallery</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((img, idx) => (
          <div key={idx} className="group relative overflow-hidden rounded-xl shadow-md cursor-pointer">
            <div className="aspect-w-4 aspect-h-3">
              <img 
                src={img.src} 
                alt={img.caption} 
                className="w-full h-64 object-cover transform group-hover:scale-105 transition duration-500"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-white font-medium">{img.caption}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginView({ setActiveTab }) {
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

function AdminPage({ setActiveTab, db, isAdminPending, user }) {
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

function BookingView({ user, db, appId }) {
  const [formData, setFormData] = useState({ 
    type: 'Langar Seva',
    name: '', 
    date: '', 
    phone: '', 
    people: '', 
    note: '' 
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const bookingTypes = [
    { id: 'Langar Seva', icon: Utensils, desc: 'Sponsor a Langar meal' },
    { id: 'Akhand Path', icon: BookText, desc: 'Book Akhand Path Sahib' },
    { id: 'Anand Karaj', icon: Heart, desc: 'Wedding Ceremony' },
    { id: 'Hall Booking', icon: Home, desc: 'General Event / Function' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/bookings`), {
        ...formData,
        userId: user.uid,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSuccess(true);
      setFormData({ type: 'Langar Seva', name: '', date: '', phone: '', people: '', note: '' });
    } catch (err) {
      console.error(err);
      alert("Failed to submit booking. Please try again.");
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto bg-green-50 p-8 rounded-2xl border border-green-200 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-green-800 mb-2">Booking Request Sent!</h2>
        <p className="text-green-700 mb-6">Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh.<br/>We have received your request. The committee will contact you shortly.</p>
        <button onClick={() => setSuccess(false)} className="text-green-700 font-semibold hover:underline">Book another service</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-orange-700 p-6 text-white text-center">
          <h2 className="text-2xl font-bold">Services & Event Booking</h2>
          <p className="opacity-90 mt-1">Book services, Langar, or the hall for your functions.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Select Service Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bookingTypes.map((t) => (
                <div 
                  key={t.id}
                  onClick={() => setFormData({...formData, type: t.id})}
                  className={`cursor-pointer rounded-xl p-4 border-2 transition flex items-center gap-3 ${
                    formData.type === t.id 
                      ? 'border-orange-600 bg-orange-50' 
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <div className={`p-2 rounded-full ${formData.type === t.id ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <t.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`font-bold ${formData.type === t.id ? 'text-orange-900' : 'text-gray-700'}`}>{t.id}</h4>
                    <p className="text-xs text-gray-500">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-bold text-gray-800 mb-4">Details for {formData.type}</h3>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input 
                  required
                  type="tel" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
                <input 
                  required
                  type="date" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Est. Sangat (People)</label>
                <input 
                  required
                  type="number" 
                  placeholder="e.g. 50"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                  value={formData.people}
                  onChange={(e) => setFormData({...formData, people: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Occasion / Note</label>
              <textarea 
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                placeholder="e.g. Birthday, Anniversary, or specific time requirements"
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 transition shadow-md disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : `Request ${formData.type}`}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminPanel({ user, db, appId, isSuperAdmin }) {
  const [activeAdminTab, setActiveAdminTab] = useState('bookings');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUid, setInviteUid] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  // showAdminsTab unused — Admins view shown via activeAdminTab

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
        {/* Admin invite tools */}
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

function AdminBookings({ user, db, appId }) {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `artifacts/${appId}/public/data/bookings`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error(error));
    return () => unsubscribe();
  }, [user, db, appId]);

  const updateStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, `artifacts/${appId}/public/data/bookings`, id), { status });
    } catch (e) { console.error(e); }
  };

  return (
    <div>
       <h3 className="text-xl font-bold mb-4 text-gray-800">Booking Requests</h3>
       <div className="space-y-4">
         {bookings.length === 0 ? <p className="text-gray-500 italic">No bookings found.</p> : 
          bookings.map(booking => (
            <div key={booking.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                  <div className="flex items-center gap-3 mb-1">
                     <span className="font-bold text-lg text-gray-900">{booking.name}</span>
                     <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded border border-orange-200 uppercase font-semibold">
                        {booking.type || 'Langar Seva'}
                     </span>
                     <span className={`text-xs px-2 py-1 rounded-full uppercase font-bold ${
                       booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                       booking.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                     }`}>
                       {booking.status}
                     </span>
                  </div>
                  <div className="text-sm text-gray-600 grid grid-cols-2 gap-x-6 gap-y-1">
                     <span>📅 {booking.date}</span>
                     <span>👥 {booking.people} Sangat</span>
                     <span>📞 {booking.phone}</span>
                     <span>📝 {booking.note || '-'}</span>
                  </div>
               </div>
               
               {booking.status === 'pending' && (
                 <div className="flex gap-2">
                   <button onClick={() => updateStatus(booking.id, 'confirmed')} className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-full transition" title="Approve">
                      <CheckCircle className="w-6 h-6" />
                   </button>
                   <button onClick={() => updateStatus(booking.id, 'rejected')} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-full transition" title="Reject">
                      <XCircle className="w-6 h-6" />
                   </button>
                 </div>
               )}
            </div>
          ))
         }
       </div>
    </div>
  );
}

function AdminEvents({ user, db, appId }) {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '' });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `artifacts/${appId}/public/data/events`), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.debug('AdminEvents events loaded:', { count: eventsList.length, events: eventsList });
      setEvents(eventsList);
    }, (error) => console.error('AdminEvents events error:', error));
    return () => unsubscribe();
  }, [user, db, appId]);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;
    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/events`), newEvent);
      setNewEvent({ title: '', date: '', description: '' });
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if(confirm('Delete this event?')) {
      await deleteDoc(doc(db, `artifacts/${appId}/public/data/events`, id));
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* List Events */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Upcoming Events List</h3>
        {events.length === 0 ? <p className="text-gray-500 italic">No events scheduled.</p> : 
         events.map(ev => (
           <div key={ev.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative group">
             <div className="flex justify-between items-start">
               <div>
                  <h4 className="font-bold text-lg text-orange-900">{ev.title}</h4>
                  <p className="text-sm font-semibold text-gray-500 mb-2">{new Date(ev.date).toDateString()}</p>
                  <p className="text-gray-700 text-sm">{ev.description}</p>
               </div>
               <button 
                 onClick={() => handleDelete(ev.id)}
                 className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2"
               >
                 <X className="w-5 h-5" />
               </button>
             </div>
           </div>
         ))
        }
      </div>

      {/* Add Event Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Create New Event</h3>
        <form onSubmit={handleAddEvent} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Title</label>
            <input 
              required
              className="w-full border border-gray-300 rounded p-2 text-sm focus:border-orange-500 outline-none" 
              value={newEvent.title}
              onChange={e => setNewEvent({...newEvent, title: e.target.value})}
              placeholder="e.g. Gurpurab Special Diwan"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
            <input 
              required
              type="date"
              className="w-full border border-gray-300 rounded p-2 text-sm focus:border-orange-500 outline-none" 
              value={newEvent.date}
              onChange={e => setNewEvent({...newEvent, date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
            <textarea 
              rows="3"
              className="w-full border border-gray-300 rounded p-2 text-sm focus:border-orange-500 outline-none" 
              value={newEvent.description}
              onChange={e => setNewEvent({...newEvent, description: e.target.value})}
              placeholder="Details about time, venue, etc."
            />
          </div>
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded transition">
            Add Event
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminRequests({ user, db, isSuperAdmin }) {
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

