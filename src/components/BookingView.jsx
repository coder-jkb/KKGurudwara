import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { CheckCircle } from 'lucide-react';

export default function BookingView({ user, db, appId }) {
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
    { id: 'Langar Seva', icon: null, desc: 'Sponsor a Langar meal' },
    { id: 'Akhand Path', icon: null, desc: 'Book Akhand Path Sahib' },
    { id: 'Anand Karaj', icon: null, desc: 'Wedding Ceremony' },
    { id: 'Hall Booking', icon: null, desc: 'General Event / Function' }
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
                    {t.icon && <t.icon className="w-5 h-5" />}
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
