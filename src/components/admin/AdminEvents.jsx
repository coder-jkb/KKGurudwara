import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { X } from 'lucide-react';

export default function AdminEvents({ user, db, appId }) {
  const [events, setEvents] = useState([]);
  const [bookingsAsEvents, setBookingsAsEvents] = useState([]);
  const [error, setError] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '' });

  useEffect(() => {
    if (!user) {
      return;
    }
    
    try {
      const q = query(collection(db, `artifacts/${appId}/public/data/events`), orderBy('date', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'event' }));
        setEvents(eventsList);
        setError(null);
      }, (error) => {
        console.error('[AdminEvents] Events load error:', error);
        setError(error.message);
        // Fallback: try loading without orderBy
        const fallbackQ = query(collection(db, `artifacts/${appId}/public/data/events`));
        const fallbackUnsubscribe = onSnapshot(fallbackQ, (snapshot) => {
          const eventsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'event' }));
          setEvents(eventsList.sort((a, b) => (a.date || '').localeCompare(b.date || '')));
          setError(null);
        }, (fallbackError) => {
          console.error('[AdminEvents] Fallback also failed:', fallbackError);
          setError(fallbackError.message);
        });
        return () => fallbackUnsubscribe();
      });
      return () => unsubscribe();
    } catch (e) {
      setError(e.message);
    }
  }, [user, db, appId]);

  // Load bookings marked as events
  useEffect(() => {
    if (!user) return;
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
        console.error('[AdminEvents] Bookings load error:', error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error('[AdminEvents] Exception loading bookings:', e);
    }
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
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Upcoming Events List</h3>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
            <strong>Error loading events:</strong> {error}
          </div>
        )}
        {events.length === 0 && bookingsAsEvents.length === 0 ? <p className="text-gray-500 italic">No events scheduled.</p> : 
         [...events, ...bookingsAsEvents]
           .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
           .map(ev => (
           <div key={ev.id} className={`p-4 rounded-lg shadow-sm border relative group ${
             ev.type === 'booking' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
           }`}>
             <div className="flex justify-between items-start">
               <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-bold text-lg ${ev.type === 'booking' ? 'text-blue-900' : 'text-orange-900'}`}>{ev.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                      ev.type === 'booking' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>{ev.type === 'booking' ? 'Booking' : 'Event'}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 mb-2">{new Date(ev.date).toDateString()}</p>
                  <p className="text-gray-700 text-sm">{ev.description}</p>
               </div>
               {ev.type === 'event' && (
                 <button 
                   onClick={() => handleDelete(ev.id)}
                   className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2"
                 >
                   <X className="w-5 h-5" />
                 </button>
               )}
             </div>
           </div>
         ))
        }
      </div>

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
