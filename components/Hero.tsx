
import React from 'react';

const Hero: React.FC = () => {
  return (
    <section 
      id="home"
      className="relative bg-cover bg-center h-screen flex items-center justify-center text-white"
      style={{ backgroundImage: "url('/steam-power-hero.jpg')" }}
    >
      <div className="absolute inset-0 bg-brand-dark bg-opacity-60"></div>
      <div className="relative z-10 text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 leading-tight">
          A Deeper Clean for a Healthier Home
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 font-light">
          Experience the power of professional steam cleaning. We remove tough stains, eliminate allergens, and restore the beauty of your home.
        </p>
        <a 
          href="#services" 
          className="px-8 py-4 bg-brand-cyan text-white font-bold rounded-full text-lg shadow-xl hover:bg-brand-blue transform hover:scale-105 transition-all duration-300"
        >
          View Our Services
        </a>
      </div>
    </section>
  );
};

export default Hero;
