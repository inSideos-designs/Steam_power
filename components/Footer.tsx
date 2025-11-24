
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-premium-dark text-white border-t border-white/10 relative z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
          <div className="space-y-4">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-cyan to-brand-blue flex items-center justify-center text-white font-bold text-xl shadow-lg">S</div>
              <h3 className="text-2xl font-bold">Steam Power</h3>
            </div>
            <p className="text-gray-400 leading-relaxed">
              A Deeper Clean for a Healthier Home.<br />
              Serving the Middlesex County Area since 2024.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-6 text-brand-cyan uppercase tracking-widest">Contact Us</h3>
            <ul className="space-y-4 text-gray-300">
              <li><a href="mailto:contact@steampower.com" className="hover:text-brand-cyan transition-colors flex items-center justify-center md:justify-start gap-2">
                <span>✉️</span> Steam Power LLC
              </a></li>
              <li><a href="tel:(862)-662-5326" className="hover:text-brand-cyan transition-colors flex items-center justify-center md:justify-start gap-2">
                <span>📞</span> (862)-662-5326
              </a></li>
              <li className="flex gap-4 justify-center md:justify-start pt-2">
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-cyan hover:text-white transition-all">TT</a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-cyan hover:text-white transition-all">IG</a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-cyan hover:text-white transition-all">FB</a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-6 text-brand-cyan uppercase tracking-widest">Quick Links</h3>
            <ul className="space-y-3 text-gray-300">
              <li><a href="#services" className="hover:text-brand-cyan transition-colors hover:translate-x-1 inline-block">Services</a></li>
              <li><a href="#why-us" className="hover:text-brand-cyan transition-colors hover:translate-x-1 inline-block">Why Choose Us</a></li>
              <li><a href="#testimonials" className="hover:text-brand-cyan transition-colors hover:translate-x-1 inline-block">Testimonials</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-16 border-t border-white/10 pt-8">
          <div className="text-center text-gray-500 mb-4">
            <p className="text-xs uppercase tracking-wider">Please note: We cannot guarantee the removal of every stain or 100% restoration of all surfaces.</p>
          </div>
          <div className="text-center text-gray-500">
            <p>&copy; {new Date().getFullYear()} Steam Power LLC. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;