import React from 'react';
import type { Testimonial, Feature } from './types';
import { SERVICES } from './data/services';

export { SERVICES };

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Sarah J.',
    location: 'East Brunswick, NJ',
    quote: 'Steam Power Cleaning did an incredible job on my carpets! They look brand new. The technician was professional and courteous. Highly recommend!',
    avatarUrl: 'https://picsum.photos/seed/person1/100/100',
  },
  {
    name: 'Michael B.',
    location: 'Monroe, NJ',
    quote: 'My couch had some tough stains from my kids and dog, but they handled it with ease. The results are amazing and the price was very reasonable.',
    avatarUrl: 'https://picsum.photos/seed/person2/100/100',
  },
  {
    name: 'Emily R.',
    location: 'Edison, NJ',
    quote: 'Booking was simple and the service was top-notch. They transformed my grimy tile floors. I will definitely be a repeat customer.',
    avatarUrl: 'https://picsum.photos/seed/person3/100/100',
  },
];

const EcoFriendlyIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c-3.333 3.333-3.333 8-1 11 2.333 3 5.667 3 8 0 2.333-3 2.333-7.667 0-11" />
  </svg>
);

const CertifiedIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const SatisfactionIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.085a2 2 0 00-1.736.93L5.5 8m7 2H5" />
  </svg>
);

export const FEATURES: Feature[] = [
  {
    icon: <EcoFriendlyIcon />,
    title: 'Eco-Friendly Solutions',
    description: 'We use safe, non-toxic cleaning agents that are powerful on dirt but gentle on your family and pets.',
  },
  {
    icon: <CertifiedIcon />,
    title: 'Trained Technicians',
    description: 'Our team is professionally trained, ensuring you receive the highest quality service every time.',
  },
  {
    icon: <SatisfactionIcon />,
    title: 'Satisfaction Guaranteed',
    description: "We stand by our work. If you're not 100% satisfied, we'll make it right. Your happiness is our priority.",
  },
];
