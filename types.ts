import type { ReactElement } from 'react';

export type ServiceCategory = 'indoor' | 'outdoor' | 'automotive' | 'addons';

export type ServiceFocus =
  | 'carpet'
  | 'tile'
  | 'upholstery'
  | 'windows'
  | 'area_rug'
  | 'powerwash'
  | 'detailing'
  | 'products';

export interface Service {
  id: string;
  title: string;
  description: string;
  price: string;
  priceCents?: number | null;
  imageUrl: string;
  category: ServiceCategory;
  serviceType: ServiceFocus;
  sizeLabel?: string;
  durationMinutes: number;
  squareLink?: string;
  squareItemVariationId?: string;
}

export interface Testimonial {
  name: string;
  location: string;
  quote: string;
  avatarUrl: string;
}

export interface Feature {
  icon: ReactElement;
  title: string;
  description: string;
}
