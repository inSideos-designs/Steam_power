
import React from 'react';
import type { Feature } from '../types';
import { FEATURES } from '../constants';


const FeatureCard: React.FC<{ feature: Feature }> = ({ feature }) => (
    <div className="text-center p-6">
      <div className="flex items-center justify-center h-20 w-20 rounded-full bg-brand-light-blue mx-auto mb-4">
        {feature.icon}
      </div>
      <h3 className="text-xl font-bold text-brand-dark mb-2">{feature.title}</h3>
      <p className="text-gray-600">{feature.description}</p>
    </div>
);


const WhyChooseUs: React.FC = () => {
  return (
    <section id="why-us" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-dark">Steam Power</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
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