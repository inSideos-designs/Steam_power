
import React from 'react';
import type { Service } from '../types';
import { SERVICES } from '../constants';

interface ServiceGroupConfig {
  id: 'indoor' | 'outdoor' | 'estimate';
  title: string;
  description: string;
  filter: (service: Service) => boolean;
}

const SERVICE_GROUPS: ServiceGroupConfig[] = [
  {
    id: 'indoor',
    title: 'Indoor Services',
    description: 'Carpets, upholstery, hallways, and interiors where families spend the most time.',
    filter: (service) => service.category === 'indoor' && !!service.priceCents,
  },
  {
    id: 'outdoor',
    title: 'Outdoor Services',
    description: 'Exterior surfaces, patios, and driveways that need a deep refresh.',
    filter: (service) => service.category === 'outdoor' && !!service.priceCents,
  },
  {
    id: 'estimate',
    title: 'Estimate Services',
    description: 'Projects that require an on-site evaluation before we finalize pricing.',
    filter: (service) => !service.priceCents,
  },
];

const formatPrice = (service: Service) => (service.priceCents ? service.price : 'Custom Estimate');

const ServiceCard: React.FC<{ service: Service; allowBooking: boolean; ctaMode: 'book' | 'estimate' }>
  = ({ service, allowBooking, ctaMode }) => {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col border border-gray-100">
        <img src={service.imageUrl} alt={service.title} className="w-full h-48 object-cover"/>
        <div className="p-6 flex flex-col flex-grow">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-cyan mb-2">{service.category === 'indoor' ? 'Indoor' : service.category === 'outdoor' ? 'Outdoor' : 'Estimate'}</p>
          <h3 className="text-xl font-bold text-brand-dark mb-2">{service.title}</h3>
          <p className="text-gray-600 mb-4 flex-grow">{service.description}</p>
          <div className="mt-auto space-y-4">
            <p className="text-lg font-semibold text-brand-blue">{formatPrice(service)}</p>
            {ctaMode === 'estimate' ? (
              <a
                href="#booking"
                className="block w-full text-center border border-brand-cyan text-brand-cyan font-semibold py-3 rounded-lg hover:bg-brand-cyan hover:text-white transition-colors duration-300"
              >
                Request An Estimate
              </a>
            ) : allowBooking && service.squareLink ? (
              <a
                href={service.squareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-brand-cyan text-white font-semibold py-3 rounded-lg hover:bg-brand-blue transition-colors duration-300"
              >
                Book This Service
              </a>
            ) : (
              <p className="text-sm text-gray-500">
                Drop in your Square checkout link to enable instant booking.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

const Services: React.FC = () => {
  const grouped = SERVICE_GROUPS
    .map((group) => ({
      ...group,
      services: SERVICES.filter(group.filter),
    }))
    .filter((group) => group.services.length > 0);

  return (
    <section id="services" className="py-24 bg-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-sm font-semibold text-brand-cyan uppercase tracking-widest mb-3">Our Services</p>
          <h2 className="text-3xl md:text-4xl font-bold text-brand-dark">Tailored Steam Cleaning Packages</h2>
          <p className="mt-4 text-lg text-gray-600">
            Browse indoor favorites, outdoor refreshes, and custom estimate projects. Every service pairs with professional-grade equipment and eco-safe solutions.
          </p>
        </div>

        {grouped.map((group) => (
          <div key={group.id} className="space-y-8">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold text-brand-dark">{group.title}</h3>
              <p className="text-gray-600 mt-2 max-w-2xl">{group.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {group.services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  allowBooking={group.id !== 'estimate'}
                  ctaMode={group.id === 'estimate' ? 'estimate' : 'book'}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="text-center text-gray-500">
          <p>
            All secure payments and estimates are powered by Square. Need something special? <a href="#booking" className="text-brand-cyan font-semibold">Start the conversation</a> and we will customize a plan.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Services;
