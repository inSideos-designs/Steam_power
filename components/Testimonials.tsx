
import React from 'react';
import type { Testimonial } from '../types';
import { TESTIMONIALS } from '../constants';

const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);


const TestimonialCard: React.FC<{ testimonial: Testimonial }> = ({ testimonial }) => (
  <div className="glass-panel rounded-2xl p-8 flex flex-col items-center text-center hover:bg-white/10 transition-colors duration-300">
    <img src={testimonial.avatarUrl} alt={testimonial.name} className="w-20 h-20 rounded-full mb-6 border-4 border-brand-cyan shadow-lg" />
    <div className="flex text-yellow-400 mb-6 gap-1">
      {[...Array(5)].map((_, i) => <StarIcon key={i} />)}
    </div>
    <p className="text-gray-200 italic mb-6 text-lg leading-relaxed">"{testimonial.quote}"</p>
    <div className="mt-auto">
      <p className="font-bold text-white text-lg">{testimonial.name}</p>
      <p className="text-sm text-brand-cyan font-medium">{testimonial.location}</p>
    </div>
  </div>
);


const Testimonials: React.FC = () => {
  return (
    <section id="testimonials" className="py-24 relative z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-md">What Our Customers Say</h2>
          <p className="mt-4 text-lg text-premium-light/80 max-w-2xl mx-auto">
            We're proud of our happy customers. Here's what they have to say about us.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
