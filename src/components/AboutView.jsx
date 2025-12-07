import React from 'react';
import { MapPin, Utensils, Heart, BookText } from 'lucide-react';

export default function AboutView() {
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
                   title="Gurudwara Location"
                   src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3780.0"
                   className="w-full h-full"
                 />
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
