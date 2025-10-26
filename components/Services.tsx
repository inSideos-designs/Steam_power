
import React from 'react';
import type { Service } from '../types';
import { SERVICES } from '../constants';

interface ServiceGroupConfig {
  id: 'indoor' | 'outdoor' | 'estimate' | 'automotive';
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
    id: 'automotive',
    title: 'Automotive Services',
    description: 'Interior and exterior detailing packages for vehicles that deserve a showroom-ready finish.',
    filter: (service) => service.category === 'automotive' && !!service.priceCents,
  },
  {
    id: 'estimate',
    title: 'Estimate Services',
    description: 'Projects that require an on-site evaluation before we finalize pricing.',
    filter: (service) => !service.priceCents,
  },
];

const formatPrice = (service: Service) => (service.priceCents ? service.price : 'Custom Estimate');

const buildServiceList = (ids: readonly string[]) =>
  ids
    .map((id) => SERVICES.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service));

const CARPET_SERVICE_IDS = ['large-room-carpet', 'medium-room-carpet', 'small-room-carpet'] as const;
const TILE_SERVICE_IDS = ['large-room-tile', 'medium-room-tile'] as const;
const CARPET_SERVICES = buildServiceList(CARPET_SERVICE_IDS);
const TILE_SERVICES = buildServiceList(TILE_SERVICE_IDS);
const SELECTOR_SERVICE_IDS = new Set<string>([...CARPET_SERVICE_IDS, ...TILE_SERVICE_IDS]);

interface RoomSizeSelectorProps {
  eyebrow: string;
  heading: string;
  body: string;
  services: Service[];
  backgroundClass?: string;
}

const RoomSizeSelector: React.FC<RoomSizeSelectorProps> = ({
  eyebrow,
  heading,
  body,
  services,
  backgroundClass = 'bg-gradient-to-br from-white via-brand-light-blue/10 to-white',
}) => {
  if (!services.length) {
    return null;
  }

  const [selectedId, setSelectedId] = React.useState<string>(services[0].id);
  const selectedService = services.find((service) => service.id === selectedId) ?? services[0];
  const bookingHref = selectedService.squareLink ?? '#booking';

  return (
    <section className={`${backgroundClass} rounded-3xl shadow-xl p-8 md:p-10`} aria-label={heading}>
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-cyan mb-3">{eyebrow}</p>
          <h3 className="text-2xl font-bold text-brand-dark mb-3">{heading}</h3>
          <p className="text-gray-600 mb-6">{body}</p>
          <label htmlFor={`${eyebrow.toLowerCase().replace(/\s+/g, '-')}-select`} className="block text-sm font-semibold text-brand-dark mb-2">
            Room size
          </label>
          <select
            id={`${eyebrow.toLowerCase().replace(/\s+/g, '-')}-select`}
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-cyan bg-white"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.title}
              </option>
            ))}
          </select>
          <p className="mt-4 text-2xl font-bold text-brand-blue">{selectedService.price}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col gap-4">
          <img src={selectedService.imageUrl} alt={selectedService.title} className="w-full h-48 object-cover rounded-xl" />
          <div>
            <p className="text-sm font-semibold text-brand-cyan">{selectedService.title}</p>
            <p className="text-gray-600 mt-2">{selectedService.description}</p>
          </div>
          <a
            href={bookingHref}
            target={selectedService.squareLink ? '_blank' : undefined}
            rel={selectedService.squareLink ? 'noopener noreferrer' : undefined}
            className="inline-flex items-center justify-center rounded-full bg-brand-cyan text-white font-semibold py-3 px-6 hover:bg-brand-blue transition-colors"
          >
            Book {selectedService.title}
          </a>
          <p className="text-sm text-gray-500">
            Prefer to talk it through? <a href="#booking" className="text-brand-cyan font-semibold">Request a custom quote</a>.
          </p>
        </div>
      </div>
    </section>
  );
};

const CarpetSizeSelector: React.FC = () => (
  <RoomSizeSelector
    eyebrow="Carpet Room Selector"
    heading="Choose your carpet room size"
    body="Pick the carpet size that matches your space. Pricing updates automatically and you can jump straight to booking."
    services={CARPET_SERVICES}
  />
);

const TileSizeSelector: React.FC = () => (
  <RoomSizeSelector
    eyebrow="Tile Room Selector"
    heading="Select the tile room that fits"
    body="Match the tile area that needs cleaning and see the tuned description, price, and checkout link instantly."
    services={TILE_SERVICES}
    backgroundClass="bg-gradient-to-br from-white via-brand-cyan/10 to-white"
  />
);

const CATEGORY_LABELS: Record<Service['category'], string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  automotive: 'Automotive',
  estimate: 'Estimate',
};

const ServiceCard: React.FC<{ service: Service; allowBooking: boolean; ctaMode: 'book' | 'estimate' }>
  = ({ service, allowBooking, ctaMode }) => {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col border border-gray-100">
        <img src={service.imageUrl} alt={service.title} className="w-full h-48 object-cover"/>
        <div className="p-6 flex flex-col flex-grow">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-cyan mb-2">{CATEGORY_LABELS[service.category]}</p>
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
      services: SERVICES.filter((service) => group.filter(service) && !SELECTOR_SERVICE_IDS.has(service.id)),
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
          <p className="mt-2 text-base text-brand-dark font-semibold">$100 minimum charge per visit.</p>
        </div>
        <div className="space-y-10">
          <CarpetSizeSelector />
          <TileSizeSelector />
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
