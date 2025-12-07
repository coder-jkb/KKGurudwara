import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { CheckCircle, XCircle } from 'lucide-react';

export default function AdminBookings({ user, db, appId }) {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
  
      return;
    }
    

    
    const q = query(collection(db, `artifacts/${appId}/public/data/bookings`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setBookings(data);
      setError(null);
    }, (error) => {
      console.error('[AdminBookings] Error loading bookings:', error);
      setError(error.message);
      setBookings([]);
    });
    
    return () => unsubscribe();
  }, [user, db, appId]);

  const updateStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, `artifacts/${appId}/public/data/bookings`, id), { status });
    } catch (e) { console.error(e); }
  };

  const toggleShowAsEvent = async (id, currentShowAsEvent) => {
    try {
      await updateDoc(doc(db, `artifacts/${appId}/public/data/bookings`, id), { 
        showAsEvent: !currentShowAsEvent 
      });
    } catch (e) { console.error(e); }
  };

  return (
    <div>
       <h3 className="text-xl font-bold mb-4 text-gray-800">Booking Requests</h3>
       {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">{error}</div>}
       <div className="space-y-4">
         {bookings.length === 0 ? <p className="text-gray-500 italic">No bookings found.</p> : 
          bookings.map(booking => (
            <div key={booking.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div className="flex-1">
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
                  <div className="mt-2 flex items-center gap-2">
                     <input 
                        type="checkbox" 
                        id={`show-event-${booking.id}`}
                        checked={booking.showAsEvent || false}
                        onChange={() => toggleShowAsEvent(booking.id, booking.showAsEvent)}
                        className="w-4 h-4 cursor-pointer"
                     />
                     <label htmlFor={`show-event-${booking.id}`} className="text-sm text-gray-700 cursor-pointer">Show as Event</label>
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
