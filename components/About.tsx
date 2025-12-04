import React from 'react';

const About: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-semibold text-brand-cyan uppercase tracking-widest mb-3">About Steam Power</p>
            <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mb-6">Committed to healthier homes and storefronts</h2>
            <p className="text-gray-600 mb-4">
              Steam Power started as a one-van operation determined to bring pro-grade cleanliness to local families.
              Today, we pair eco-friendly chemistry with commercial steam technology to lift allergens, stains, and build-up across the Bay Area.
            </p>
            <p className="text-gray-600">
              This section is a placeholder for your personal story: highlight certifications, years of experience, or the moment you decided to launch
              the business. Swap in a real photo, social proof, and links to credentials whenever you are ready.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6 text-center">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-brand-dark">250+</p>
                <p className="text-sm text-gray-600">Steam Cleaning Projects</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-brand-dark">5★</p>
                <p className="text-sm text-gray-600">Average Customer Rating</p>
              </div>
            </div>
          </div>
          <div className="relative h-96">
            <div className="absolute inset-0 rounded-3xl bg-brand-light-blue opacity-40"></div>
            <div className="absolute inset-4 rounded-3xl bg-white shadow-2xl flex flex-col justify-center items-center text-center px-8">
              <p className="text-sm uppercase tracking-widest text-brand-cyan mb-3">Owner Spotlight</p>
              <p className="text-lg text-brand-dark font-semibold">Add your portrait or team photo here.</p>
              <p className="text-gray-600 mt-3">
                Steam Power is a Veteran Owned Business serving the Middlesex Community.
              </p>
              <span className="mt-6 inline-flex items-center text-brand-cyan font-semibold">
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
