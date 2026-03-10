import { useState } from 'react';
import axios from 'axios';
import { formatPerfumeName } from '../utils/formatPerfumeName';

function App() {
  const [brand, setBrand] = useState('');
  const [perfumes, setPerfumes] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/perfumes/brand/${brand}`);
      setPerfumes(res.data);
    } catch (err) {
      console.error("Error fetching perfumes", err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-perfume-cream text-perfume-black p-8">
      {/* Header */}
      <header className="text-center mb-16">
        <h1 className="font-serif text-5xl mb-4 tracking-widest uppercase">The Fragrance Wardrobe</h1>
        <p className="italic text-gray-600">Discover your olfactive signature.</p>
      </header>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-12 flex gap-2">
        <input 
          type="text"
          placeholder="Search Brand (e.g. Chanel, Dior...)"
          className="flex-1 p-4 border-b-2 border-perfume-black bg-transparent focus:outline-none focus:border-perfume-gold transition-colors"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
        <button className="bg-perfume-black text-white px-8 py-4 hover:bg-perfume-gold transition-colors duration-500 uppercase tracking-tighter">
          Search
        </button>
      </form>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {perfumes.map((p, idx) => (
          <div key={idx} className="bg-white p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-shadow duration-300 group">
            <span className="text-xs uppercase tracking-widest text-perfume-gold">{p.brand}</span>
            <h2 className="font-serif text-2xl mt-2 mb-4 group-hover:italic">{formatPerfumeName(p.perfume)}</h2>
            
            <div className="space-y-2 text-sm text-gray-500">
              <p><strong>Top:</strong> {p.top || 'N/A'}</p>
              <p><strong>Heart:</strong> {p.middle || 'N/A'}</p>
              <p><strong>Base:</strong> {p.base || 'N/A'}</p>
            </div>
            
            <div className="mt-6 flex justify-between items-center border-t pt-4">
              <span className="text-lg font-bold">Rating: {p.rating_value || '—'}</span>
              <button className="text-sm underline hover:text-perfume-gold transition-colors">Add to Wardrobe</button>
            </div>
          </div>
        ))}
      </div>
      
      {loading && <p className="text-center italic mt-10">Sourcing ingredients...</p>}
    </div>
  );
}

export default App;