import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import heroPerfume from "../assets/hero-perfume.jpg"; 
import motifs from "../assets/motifs.jpg";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-black text-perfume-black">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroPerfume}
            alt="Luxury perfume collection"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-black" />
        </div>

        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >

            <p className="text-sm tracking-[0.3em] uppercase text-perfume-gold mb-6 font-display">Your Personal Fragrance Advisor</p>
            <h1 className="font-display text-perfume-cream text-5xl md:text-7xl lg:text-8xl mb-6 leading-tight">Curate Your <span className="text-gradient-gold italic">Scent Story</span></h1>
        
            <p className="text-lg text-gray-300 max-w-xl mx-auto mb-10">
              Catalog your collection, discover hidden pairings, and receive
              recommendations tailored to every occasion.
            </p>
            
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/discover">
                <button className="bg-perfume-black text-white px-8 py-4 hover:bg-perfume-gold transition-all duration-500 uppercase tracking-widest text-sm flex items-center gap-2">
                  Explore Fragrances <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link to="/auth">
                <button className="border border-perfume-white text-white px-8 py-4 hover:bg-perfume-black hover:text-white transition-all duration-500 uppercase tracking-widest text-sm">
                  Join the Atelier
                </button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-perfume-gold to-transparent" />
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to bottom, black, #1A1A1B), url(${motifs})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: "brightness(0.45)",
          }}
        />
        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-#1a1917 border border-gray-100 shadow-xl rounded-2xl p-12 md:p-20 max-w-4xl mx-auto"
          >
            <h2 className="font-display text-3xl md:text-4xl mb-4 text-perfume-cream">
              Build Your <span className="text-perfume-gold italic">Fragrance Wardrobe</span>
            </h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Create your account to save your collection, track your scent
              journey, and get personalized recommendations.
            </p>
            <Link to="/auth">
              <button className="bg-perfume-gold text-white px-10 py-4 hover:bg-perfume-black transition-colors duration-500 uppercase tracking-widest rounded-md">
                Get Started
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 bg-perfume-black">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xs text-gray-400 tracking-widest uppercase">
            © 2026 FRAGRANCE WARDROBE
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;