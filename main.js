import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Calendar, Users, Home, Info, Image, Lock, Menu, X, CheckCircle, XCircle, MapPin, Utensils, Heart, Shield, BookOpen, Music } from 'lucide-react';

// --- Firebase Configuration ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'gurudwara-app';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Component: Main App ---
export default function GurudwaraApp() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Demo toggle state
  const [activeTab, setActiveTab] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auth Initialization
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (mounted) {
        setUser(u);
        // Only stop loading if we actually have a user
        if (u) {
          setLoading(false);
        }
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Navigation Items
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'about', label: 'About Us', icon: Info },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'booking', label: 'Bookings', icon: BookOpen },
  ];

  // STRICT GUARD: Do not render main app until user is authenticated
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-orange-50 flex-col gap-4">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-orange-800 font-semibold">Connecting to Dashmesh Darbar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 font-sans text-gray-800 flex flex-col">
      {/* Navbar */}
      <nav className="bg-orange-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="bg-white p-2 rounded-full mr-3">
                 <Shield className="h-6 w-6 text-orange-700" />
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
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
                    activeTab === item.id ? 'bg-orange-800 text-white' : 'hover:bg-orange-600 text-orange-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
                    activeTab === 'admin' ? 'bg-red-800 text-white' : 'bg-red-700 hover:bg-red-600 text-white'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Admin Panel
                </button>
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

        {/* Mobile Nav */}
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
              {isAdmin && (
                <button
                  onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white bg-red-700 hover:bg-red-600"
                >
                  <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Admin Panel</span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'home' && <HomeView user={user} setActiveTab={setActiveTab} />}
        {activeTab === 'about' && <AboutView />}
        {activeTab === 'gallery' && <GalleryView />}
        {activeTab === 'booking' && <BookingView user={user} />}
        {activeTab === 'admin' && isAdmin && <AdminPanel user={user} />}
        {activeTab === 'admin' && !isAdmin && <div className="text-center p-10 text-red-600">Access Denied. Please toggle Admin Mode below.</div>}
      </main>

      {/* Footer & Role Switcher */}
      <footer className="bg-gray-800 text-gray-300 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-white font-bold mb-2">Gurudwara Shri Dashmesh Darbar</h3>
            <p className="text-sm">Sector 9, Kopar Khairane, Navi Mumbai.</p>
            <a href="https://maps.app.goo.gl/pHYMBeBBBaVV54dr6" target="_blank" rel="noreferrer" className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" /> View on Google Maps
            </a>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="bg-gray-700 p-2 rounded-lg flex items-center gap-3 text-xs">
              <span className="uppercase font-bold tracking-wider">Demo Mode:</span>
              <button 
                onClick={() => setIsAdmin(false)}
                className={`px-3 py-1 rounded ${!isAdmin ? 'bg-orange-500 text-white' : 'hover:bg-gray-600'}`}
              >
                Devotee
              </button>
              <button 
                onClick={() => setIsAdmin(true)}
                className={`px-3 py-1 rounded ${isAdmin ? 'bg-red-600 text-white' : 'hover:bg-gray-600'}`}
              >
                Admin
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Toggle above to test User vs Admin features.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- View Components ---

function HomeView({ setActiveTab, user }) {
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    if (!user) return;
    
    // Fetch upcoming events for home page
    const q = query(collection(db, `artifacts/${appId}/public/data/events`), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching events:", error);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative bg-orange-800 rounded-2xl overflow-hidden shadow-2xl h-80 flex items-center justify-center text-center px-4">
        <div className="absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center" />
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">Seva, Simran, Samarpan</h1>
          <p className="text-orange-100 text-lg md:text-xl mb-8">
            Operating with the heart of an NGO. Serving humanity through Langar, Education, and Healthcare.
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
               <span>Sector 9, Kopar Khairane, Navi Mumbai, Maharashtra 400709</span>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GalleryView() {
  // Using placeholders for demo
  const images = [
    { src: "https://images.unsplash.com/photo-1596541656006-25916f73600f?q=80&w=800&auto=format&fit=crop", caption: "Darbar Sahib" },
    { src: "https://images.unsplash.com/photo-1582236592288-7e39a3f9151c?q=80&w=800&auto=format&fit=crop", caption: "Community Kitchen" },
    { src: "https://images.unsplash.com/photo-1598436440269-807d9f2a0090?q=80&w=800&auto=format&fit=crop", caption: "Evening Kirtan" },
    { src: "https://images.unsplash.com/photo-1621509337578-8386829729a4?q=80&w=800&auto=format&fit=crop", caption: "Nagar Kirtan" },
    { src: "https://images.unsplash.com/photo-1605218427368-35b0d0c64951?q=80&w=800&auto=format&fit=crop", caption: "Langar Hall" },
    { src: "https://images.unsplash.com/photo-1542465494-02d295052329?q=80&w=800&auto=format&fit=crop", caption: "Sewa" }
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

function BookingView({ user }) {
  const [formData, setFormData] = useState({ 
    type: 'Langar Seva', // Default type
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
    { id: 'Akhand Path', icon: BookOpen, desc: 'Book Akhand Path Sahib' },
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
          
          {/* Service Selection */}
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

// --- Admin Components ---

function AdminPanel({ user }) {
  const [activeAdminTab, setActiveAdminTab] = useState('bookings');

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
        </div>
      </div>

      <div className="p-6 bg-gray-50 flex-grow">
        {activeAdminTab === 'bookings' ? <AdminBookings user={user} /> : <AdminEvents user={user} />}
      </div>
    </div>
  );
}

function AdminBookings({ user }) {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `artifacts/${appId}/public/data/bookings`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching bookings:", error);
    });
    return () => unsubscribe();
  }, [user]);

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

function AdminEvents({ user }) {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '' });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `artifacts/${appId}/public/data/events`), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching events:", error);
    });
    return () => unsubscribe();
  }, [user]);

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