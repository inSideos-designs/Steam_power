
import React from 'react';
import type { Feature } from '../types';
import { FEATURES } from '../constants';


const FeatureCard: React.FC<{ feature: Feature }> = ({ feature }) => (
  <div className="text-center p-8 glass-panel rounded-2xl transition-transform hover:-translate-y-2 duration-300">
    <div className="flex items-center justify-center h-20 w-20 rounded-full bg-brand-cyan/20 mx-auto mb-6 shadow-[0_0_15px_rgba(0,180,216,0.3)]">
      {feature.icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
    <p className="text-gray-300 leading-relaxed">{feature.description}</p>
  </div>
);


const WhyChooseUs: React.FC = () => {
  return (
    <section id="why-us" className="py-24 relative z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-md">Steam Power</h2>
          <p className="mt-4 text-lg text-premium-light/80 max-w-2xl mx-auto">
            We are committed to providing an exceptional service that you can trust.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;