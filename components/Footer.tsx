
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-brand-dark text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="text-xl font-bold mb-4">Steam Powered</h3>
            <p className="text-gray-300">
              A Deeper Clean for a Healthier Home.<br />
              Serving the Middlesex County Area since 2024.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Contact Us</h3>
            <ul className="space-y-2 text-gray-300">
              <li><a href="mailto:contact@steampower.com" className="hover:text-brand-cyan">Steam Power LLC</a></li>
              <li><a href="tel:(862)-662-5326" className="hover:text-brand-cyan">(862)-662-5326</a></li>
              <li>@Steam_Power_LLC</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#services" className="hover:text-brand-cyan">Services</a></li>
              <li><a href="#why-us" className="hover:text-brand-cyan">Why Choose Us</a></li>
              <li><a href="#testimonials" className="hover:text-brand-cyan">Testimonials</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-700 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Steam Power LLC. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;