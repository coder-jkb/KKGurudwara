import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { Calendar } from 'lucide-react';

export default function HomeView({ setActiveTab, user, db, appId }) {
  const [events, setEvents] = useState([]);
  const [bookingsAsEvents, setBookingsAsEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load public events
    try {
      const q = query(collection(db, `artifacts/${appId}/public/data/events`), orderBy('date', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'event' }));
        setEvents(eventsList);
        setError(null);
      }, (error) => {
        console.error('[HomeView] Events load error:', error);
        setError(error.message);
        // Fallback: try loading without orderBy
        const fallbackQ = query(collection(db, `artifacts/${appId}/public/data/events`));
        const fallbackUnsubscribe = onSnapshot(fallbackQ, (snapshot) => {
          const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'event' }));
          setEvents(eventsList.sort((a, b) => (a.date || '').localeCompare(b.date || '')));
          setError(null);
        }, (fallbackError) => {
          console.error('[HomeView] Fallback also failed:', fallbackError);
          setError(fallbackError.message);
        });
        return () => fallbackUnsubscribe();
      });
      return () => unsubscribe();
    } catch (e) {
      setError(e.message);
    }
  }, [db, appId]);

  // Load bookings marked as events
  useEffect(() => {
    try {
      const q = query(
        collection(db, `artifacts/${appId}/public/data/bookings`),
        where('showAsEvent', '==', true),
        orderBy('date', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const bookings = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(), 
          type: 'booking',
          title: `${doc.data().type || 'Booking'} - ${doc.data().name}`,
          description: doc.data().note || 'Booking request'
        }));
        setBookingsAsEvents(bookings);
      }, (error) => {
        console.error('[HomeView] Bookings as events load error:', error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error('[HomeView] Exception loading bookings:', e);
    }
  }, [db, appId]);

  return (
    <div className="space-y-12">
      <div className="relative bg-orange-800 rounded-2xl overflow-hidden shadow-2xl h-[30em] flex items-center justify-center text-center px-4">
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

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-orange-600" /> Upcoming Events
        </h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">
            <strong>Error loading events:</strong> {error}
          </div>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.length === 0 && bookingsAsEvents.length === 0 ? (
            <div className="col-span-full text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
              <p className="text-gray-500">No upcoming events scheduled at the moment.</p>
            </div>
          ) : (
            [...events, ...bookingsAsEvents]
              .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
              .map(event => (
              <div key={event.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition ${
                event.type === 'booking' ? 'border-blue-100 bg-blue-50' : 'border-orange-100'
              }`}>
                <div className={`p-4 border-b ${
                  event.type === 'booking' ? 'bg-blue-100 border-blue-200' : 'bg-orange-100 border-orange-200'
                }`}>
                  <span className={`text-xs font-bold uppercase tracking-wide ${
                    event.type === 'booking' ? 'text-blue-800' : 'text-orange-800'
                  }`}>
                    {event.type === 'booking' ? 'Booking' : 'Event'} • {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
