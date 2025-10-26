import type { ReactElement } from 'react';

export interface Service {
  id: string;
  title: string;
  description: string;
  price: string;
  priceCents?: number | null;
  imageUrl: string;
  squareLink?: string;
  squareItemVariationId?: string;
  category: 'indoor' | 'outdoor' | 'estimate';
}

export interface Testimonial {
  name: string;
  location: string;
  quote: string;
  avatarUrl: string;
}

export interface Feature {
  // Fix for line 18: Replaced `JSX.Element` with `ReactElement` to resolve "Cannot find namespace 'JSX'" error.
  icon: ReactElement;
  title: string;
  description: string;
}
