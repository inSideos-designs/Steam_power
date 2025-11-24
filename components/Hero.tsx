
import React from 'react';

const Hero: React.FC = () => {
  return (
    <section
      id="home"
      className="relative h-screen flex items-center justify-center text-white overflow-hidden"
    >
      {/* Background Image with Parallax-like effect */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0 transform scale-105"
        style={{ backgroundImage: "url('/steam-power-hero2.jpg')" }}
      ></div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/80 via-brand-dark/50 to-premium-dark z-0"></div>

      {/* Steam Animation Layer */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none steam-container">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="steam-particle"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '-10%',
              width: `${100 + Math.random() * 200}px`,
              height: `${100 + Math.random() * 200}px`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <div className="mb-6 inline-block">
          <span className="py-1 px-3 rounded-full bg-brand-cyan/20 border border-brand-cyan/50 text-brand-cyan text-sm font-semibold tracking-widest uppercase backdrop-blur-sm">
            Premium Cleaning Services
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-premium-light to-brand-light-blue drop-shadow-lg">
          A Deeper Clean for a <br className="hidden md:block" /> Healthier Home
        </h1>
        <p className="text-lg md:text-2xl max-w-2xl mx-auto mb-10 font-light text-gray-200 leading-relaxed">
          Experience the power of professional steam cleaning. We remove tough stains, eliminate allergens, and restore the beauty of your home.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="#services"
            className="px-8 py-4 bg-brand-cyan text-white font-bold rounded-full text-lg shadow-[0_0_20px_rgba(0,180,216,0.5)] hover:bg-brand-blue hover:shadow-[0_0_30px_rgba(0,180,216,0.8)] transform hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto"
          >
            View Our Services
          </a>
          <a
            href="#why-us"
            className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/30 text-white font-bold rounded-full text-lg hover:bg-white/20 transform hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto"
          >
            Why Choose Us
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;
