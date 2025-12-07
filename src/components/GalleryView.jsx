import React from 'react';

export default function GalleryView() {
  // Corrected URLs (removed Markdown syntax from strings)
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
