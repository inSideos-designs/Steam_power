import React from 'react';

const About: React.FC = () => {
  return (
    <section id="about" className="py-24 relative z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-semibold text-brand-cyan uppercase tracking-widest mb-3">About Steam Power</p>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 drop-shadow-md">Committed to healthier homes and storefronts</h2>
            <p className="text-gray-300 mb-4 text-lg leading-relaxed">
              Steam Power started as a one-van operation determined to bring pro-grade cleanliness to local families.
              Today, we pair eco-friendly chemistry with commercial steam technology to lift allergens, stains, and build-up across the Bay Area.
            </p>
            <p className="text-gray-400 leading-relaxed">
              This section is a placeholder for your personal story: highlight certifications, years of experience, or the moment you decided to launch
              the business. Swap in a real photo, social proof, and links to credentials whenever you are ready.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-6 text-center">
              <div className="glass-panel rounded-2xl p-6">
                <p className="text-4xl font-bold text-brand-cyan mb-1">250+</p>
                <p className="text-sm text-gray-300 uppercase tracking-wider">Steam Cleaning Projects</p>
              </div>
              <div className="glass-panel rounded-2xl p-6">
                <p className="text-4xl font-bold text-brand-cyan mb-1">5★</p>
                <p className="text-sm text-gray-300 uppercase tracking-wider">Average Customer Rating</p>
              </div>
            </div>
          </div>
          <div className="relative h-96">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-cyan to-brand-blue opacity-20 blur-2xl animate-pulse"></div>
            <div className="absolute inset-4 rounded-3xl glass-panel flex flex-col justify-center items-center text-center px-8 border border-white/20">
              <p className="text-sm uppercase tracking-widest text-brand-cyan mb-3">Owner Spotlight</p>
              <p className="text-xl text-white font-bold mb-2">Add your portrait or team photo here.</p>
              <p className="text-gray-300 mt-3 max-w-xs">
                Steam Power is a Veteran Owned Business serving the Middlesex Community.
              </p>
              <span className="mt-8 inline-flex items-center px-4 py-2 rounded-full bg-brand-cyan/20 text-brand-cyan font-semibold text-sm border border-brand-cyan/50">
                Coming soon
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
