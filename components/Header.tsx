
import React, { useState, useEffect } from 'react';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass-panel shadow-lg py-2' : 'bg-transparent py-4'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="flex-shrink-0 flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-cyan to-brand-blue flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">S</div>
            <h1 className={`text-2xl font-bold transition-colors duration-300 ${isScrolled ? 'text-brand-dark' : 'text-white'}`}>
              Steam Power
            </h1>
          </a>
          <nav className="hidden md:flex space-x-8">
            <a href="#services" className={`text-sm font-semibold uppercase tracking-wider transition-colors duration-300 ${isScrolled ? 'text-gray-600 hover:text-brand-cyan' : 'text-gray-200 hover:text-white'}`}>Services</a>
            <a href="#why-us" className={`text-sm font-semibold uppercase tracking-wider transition-colors duration-300 ${isScrolled ? 'text-gray-600 hover:text-brand-cyan' : 'text-gray-200 hover:text-white'}`}>Why Us</a>
            <a href="#testimonials" className={`text-sm font-semibold uppercase tracking-wider transition-colors duration-300 ${isScrolled ? 'text-gray-600 hover:text-brand-cyan' : 'text-gray-200 hover:text-white'}`}>Testimonials</a>
          </nav>
          <a href="#services" className="px-6 py-2 bg-brand-cyan text-white font-bold rounded-full shadow-lg hover:bg-brand-blue transform hover:scale-105 transition-all duration-300 text-sm uppercase tracking-wide">
            Book Now
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
