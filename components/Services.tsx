
import React from 'react';
import type { Service, ServiceCategory, ServiceFocus } from '../types';
import { SERVICES } from '../constants';
import {
  calculateAvailableTimeSlots,
  getAvailableSlots,
  formatTimeSlotInfo,
  type AvailableTimeSlot,
  type BookedSlot,
} from './timeSlotCalculator';
import CustomerLookup, { type CustomerData, type SavedRoom } from './CustomerLookup';
import RoomConfig, { type RoomConfiguration } from './RoomConfig';

type CartLineItem = {
  service: Service;
  quantity: number;
};

interface SuggestedTime {
  date: string;
  dayName: string;
  timeRange: string;
}

interface BookingConfirmation {
  eventId?: string;
  calendarUrl?: string;
  durationMinutes: number;
  totalPriceCents: number;
  emailSent: boolean;
  startTime: string;
  timeZone: string;
  items: Array<{
    serviceId: string;
    title: string;
    quantity: number;
    price: string;
    priceCents: number;
    serviceType: ServiceFocus;
  }>;
}

interface BookingError {
  error: string;
  suggestedTimes?: SuggestedTime[];
  suggestedTimesText?: string;
}

const toIsoWithTimeZone = (dateString: string, timeString: string, timeZone: string) => {
  if (!dateString || !timeString) {
    return null;
  }

  try {
    const normalizedTime = timeString.length <= 5 ? `${timeString}:00` : timeString;
    const base = new Date(`${dateString}T${normalizedTime}`);
    if (Number.isNaN(base.getTime())) {
      return null;
    }

    const localized = new Date(base.toLocaleString('en-US', { timeZone }));
    const diff = base.getTime() - localized.getTime();
    return new Date(base.getTime() + diff).toISOString();
  } catch (error) {
    console.error('[booking] Failed to build ISO start time', error);
    return null;
  }
};

const formatAppointmentWindow = (isoString: string, timeZone: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone,
    }).format(new Date(isoString));
  } catch {
    return new Date(isoString).toLocaleString();
  }
};

// Federal holidays in 2025 (YYYY-MM-DD format)
const FEDERAL_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-01-20', // MLK Jr. Day
  '2025-02-17', // Presidents' Day
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-10-13', // Columbus Day
  '2025-11-11', // Veterans Day
  '2025-11-27', // Thanksgiving
  '2025-11-28', // Thanksgiving (Friday)
  '2025-12-25', // Christmas
];

const isBookableDate = (dateString: string): boolean => {
  try {
    const date = new Date(`${dateString}T00:00:00`);
    const dayOfWeek = date.getDay();
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const isWeekend = isSaturday || isSunday;
    const isFederalHoliday = FEDERAL_HOLIDAYS_2025.includes(dateString);

    return isWeekend || isFederalHoliday;
  } catch {
    return false;
  }
};

const isValidBookingTime = (timeString: string): boolean => {
  if (!timeString) return false;
  try {
    const [hours] = timeString.split(':').map(Number);
    // Business hours: 7 AM (7) to 6 PM (18)
    return hours >= 7 && hours < 18;
  } catch {
    return false;
  }
};

// Generate all available dates for the next 90 days that are bookable (weekends + holidays)
const generateAvailableDates = (): Array<{ dateString: string; displayLabel: string }> => {
  const dates: Array<{ dateString: string; displayLabel: string }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check next 90 days
  for (let i = 0; i < 90; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + i);

    const dateString = checkDate.toISOString().split('T')[0];

    // Check if this date is bookable
    if (isBookableDate(dateString)) {
      const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = checkDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dates.push({
        dateString,
        displayLabel: `${dayName}, ${monthDay}`,
      });
    }
  }

  return dates;
};

// Generate all available times (7 AM to 5 PM in hourly increments)
const generateAvailableTimes = (): Array<{ timeString: string; displayLabel: string }> => {
  const times: Array<{ timeString: string; displayLabel: string }> = [];

  // 7 AM (07:00) through 5 PM (17:00) - 7 hours of operation
  for (let hour = 7; hour < 18; hour++) {
    const hourString = String(hour).padStart(2, '0');
    const timeString = `${hourString}:00`;

    // Format as 12-hour time
    const displayLabel =
      hour === 12
        ? '12:00 PM'
        : hour < 12
          ? `${hour}:00 AM`
          : `${hour - 12}:00 PM`;

    times.push({ timeString, displayLabel });
  }

  return times;
};

const CATEGORY_ORDER: ServiceCategory[] = ['indoor', 'outdoor', 'automotive', 'addons'];
const SERVICE_TYPE_ORDER: ServiceFocus[] = [
  'carpet',
  'area_rug',
  'tile',
  'upholstery',
  'windows',
  'powerwash',
  'roofing',
  'detailing',
  'products',
];

const CATEGORY_DETAILS: Record<ServiceCategory, { label: string; description: string; lead: string }> = {
  indoor: {
    label: 'Indoor',
    description: 'Room-by-room carpet care, tiled surfaces, upholstery, mattresses, and interior windows.',
    lead: 'Comfort-driven clean for every room',
  },
  outdoor: {
    label: 'Outdoor',
    description: 'Power washing, decks, fences, patios, garage floors, and outdoor accents.',
    lead: 'Refresh every exterior surface',
  },
  automotive: {
    label: 'Automotive',
    description: 'Interior, exterior, and full detailing for cars, boats, and RVs of every size.',
    lead: 'Rolling, floating, and road-trip ready',
  },
  addons: {
    label: 'Add-Ons',
    description: 'Helpful products and extras to maintain freshness between professional visits.',
    lead: 'Extend the clean between appointments',
  },
};

const SERVICE_TYPE_DETAILS: Record<ServiceFocus, { label: string; description: string }> = {
  carpet: {
    label: 'Carpet',
    description: 'Steam extraction that removes embedded soil, allergens, and lingering odors.',
  },
  tile: {
    label: 'Tile',
    description: 'Grout-safe agitation and rinse systems that bring back the original shine.',
  },
  upholstery: {
    label: 'Upholstery',
    description: 'Fabric-safe cleaning that revives seating with deodorizing and fabric protection.',
  },
  windows: {
    label: 'Windows',
    description: 'Crystal-clear glass cleaning with detail work on frames, tracks, and seals.',
  },
  area_rug: {
    label: 'Area Rugs',
    description: 'On-site and off-site options to revive woven textiles and specialty rugs.',
  },
  powerwash: {
    label: 'Power Washing',
    description: 'Exterior rinses, degreasing, and soft-washing tailored to the surface and soil level.',
  },
  roofing: {
    label: 'Roofing & Gutters',
    description: 'Roof cleaning, gutter maintenance, and protective installations to safeguard your home.',
  },
  detailing: {
    label: 'Detailing',
    description: 'Interior, exterior, and full detailing packages for vehicles, boats, and RVs.',
  },
  products: {
    label: 'Products',
    description: 'Retail add-ons and supplies to maintain a just-cleaned scent and feel.',
  },
};

const TIME_ZONE_OPTIONS = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
];

const DEFAULT_TIME_ZONE = (() => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIME_ZONE_OPTIONS.includes(tz) ? tz : 'America/New_York';
  } catch {
    return 'America/New_York';
  }
})();

const clampQuantity = (next: number) => Math.min(10, Math.max(0, Number.isFinite(next) ? next : 0));
const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);

const formatDuration = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }

  return `${hours} hr${hours > 1 ? 's' : ''} ${minutes} min`;
};

const Services: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = React.useState<ServiceCategory>('indoor');
  const [selectedFocus, setSelectedFocus] = React.useState<ServiceFocus>('carpet');
  const [cartItems, setCartItems] = React.useState<CartLineItem[]>([]);
  const [quantities, setQuantities] = React.useState<Record<string, number>>({});

  // Area rug custom dimensions - separate state for on-site and off-site
  const [rugOnsiteLength, setRugOnsiteLength] = React.useState<number>(8);
  const [rugOnsiteWidth, setRugOnsiteWidth] = React.useState<number>(10);
  const [rugOffsiteLength, setRugOffsiteLength] = React.useState<number>(8);
  const [rugOffsiteWidth, setRugOffsiteWidth] = React.useState<number>(10);

  // Calculate area rug pricing based on service type
  const calculateRugPrice = React.useCallback((length: number, width: number, isOffsite: boolean) => {
    const squareFeet = length * width;
    const pricePerSqFt = isOffsite ? 3.00 : 0.75;
    const priceCents = Math.round(squareFeet * pricePerSqFt * 100);
    return { squareFeet, priceCents, priceFormatted: formatCurrency(priceCents), pricePerSqFt };
  }, []);

  const rugOnsitePricing = React.useMemo(
    () => calculateRugPrice(rugOnsiteLength, rugOnsiteWidth, false),
    [rugOnsiteLength, rugOnsiteWidth, calculateRugPrice]
  );

  const rugOffsitePricing = React.useMemo(
    () => calculateRugPrice(rugOffsiteLength, rugOffsiteWidth, true),
    [rugOffsiteLength, rugOffsiteWidth, calculateRugPrice]
  );

  // Carpet cleaning square footage
  const [carpetSquareFeet, setCarpetSquareFeet] = React.useState<number>(200);
  const [carpetEstimatePending, setCarpetEstimatePending] = React.useState<boolean>(false);

  const carpetPricing = React.useMemo(() => {
    if (carpetEstimatePending) {
      return { squareFeet: 0, priceCents: 0, priceFormatted: 'Estimate Pending', pricePerSqFt: 0.30 };
    }
    const pricePerSqFt = 0.30;
    const priceCents = Math.round(carpetSquareFeet * pricePerSqFt * 100);
    return { squareFeet: carpetSquareFeet, priceCents, priceFormatted: formatCurrency(priceCents), pricePerSqFt };
  }, [carpetSquareFeet, carpetEstimatePending]);

  // Tile cleaning square footage
  const [tileSquareFeet, setTileSquareFeet] = React.useState<number>(150);
  const [tileEstimatePending, setTileEstimatePending] = React.useState<boolean>(false);

  const tilePricing = React.useMemo(() => {
    if (tileEstimatePending) {
      return { squareFeet: 0, priceCents: 0, priceFormatted: 'Estimate Pending', pricePerSqFt: 0.40 };
    }
    const pricePerSqFt = 0.40;
    const priceCents = Math.round(tileSquareFeet * pricePerSqFt * 100);
    return { squareFeet: tileSquareFeet, priceCents, priceFormatted: formatCurrency(priceCents), pricePerSqFt };
  }, [tileSquareFeet, tileEstimatePending]);

  // Window cleaning square footage
  const [windowSquareFeet, setWindowSquareFeet] = React.useState<number>(15);
  const [windowEstimatePending, setWindowEstimatePending] = React.useState<boolean>(false);

  const windowPricing = React.useMemo(() => {
    if (windowEstimatePending) {
      return { squareFeet: 0, priceCents: 0, priceFormatted: 'Estimate Pending', pricePerSqFt: 1.00 };
    }
    const pricePerSqFt = 1.00;
    const priceCents = Math.round(windowSquareFeet * pricePerSqFt * 100);
    return { squareFeet: windowSquareFeet, priceCents, priceFormatted: formatCurrency(priceCents), pricePerSqFt };
  }, [windowSquareFeet, windowEstimatePending]);

  // Boat detailing length and type
  const [boatLength, setBoatLength] = React.useState<number>(20);
  const [boatDetailType, setBoatDetailType] = React.useState<'interior' | 'exterior' | 'full'>('full');
  const [boatEstimatePending, setBoatEstimatePending] = React.useState<boolean>(false);

  const boatPricing = React.useMemo(() => {
    if (boatEstimatePending || boatLength > 40) {
      return { length: boatLength, priceCents: 0, priceFormatted: 'Estimate Pending', pricePerFt: 5.00 };
    }
    const pricePerFt = 5.00;
    const multiplier = boatDetailType === 'full' ? 1.6 : boatDetailType === 'interior' ? 1.0 : 0.9;
    const priceCents = Math.round(boatLength * pricePerFt * multiplier * 100);
    return { length: boatLength, priceCents, priceFormatted: formatCurrency(priceCents), pricePerFt };
  }, [boatLength, boatDetailType, boatEstimatePending]);

  // RV detailing length and type
  const [rvLength, setRvLength] = React.useState<number>(25);
  const [rvDetailType, setRvDetailType] = React.useState<'interior' | 'exterior' | 'full'>('full');
  const [rvEstimatePending, setRvEstimatePending] = React.useState<boolean>(false);

  const rvPricing = React.useMemo(() => {
    if (rvEstimatePending) {
      return { length: rvLength, priceCents: 0, priceFormatted: 'Estimate Pending', pricePerFt: 6.00 };
    }
    const pricePerFt = 6.00;
    const multiplier = rvDetailType === 'full' ? 1.5 : rvDetailType === 'interior' ? 1.1 : 1.0;
    const priceCents = Math.round(rvLength * pricePerFt * multiplier * 100);
    return { length: rvLength, priceCents, priceFormatted: formatCurrency(priceCents), pricePerFt };
  }, [rvLength, rvDetailType, rvEstimatePending]);

  // Deodorizing powder scent selection
  const DEODORIZER_SCENTS = ['Black Ice', 'Mahogany Teakwood', 'Blue Lava', 'Seasonal Blend'] as const;
  const [selectedScent, setSelectedScent] = React.useState<string>(DEODORIZER_SCENTS[0]);

  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [customerAddress, setCustomerAddress] = React.useState('');
  const [customerNotes, setCustomerNotes] = React.useState('');
  const [serviceDate, setServiceDate] = React.useState('');
  const [serviceTime, setServiceTime] = React.useState('');
  const [timeZone, setTimeZone] = React.useState<string>(DEFAULT_TIME_ZONE);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submissionError, setSubmissionError] = React.useState<string | null>(null);
  const [suggestedTimes, setSuggestedTimes] = React.useState<SuggestedTime[]>([]);
  const [confirmation, setConfirmation] = React.useState<BookingConfirmation | null>(null);
  const [dynamicTimeSlots, setDynamicTimeSlots] = React.useState<AvailableTimeSlot[]>([]);
  const [bookedTimes, setBookedTimes] = React.useState<BookedSlot[]>([]);
  const [travelTimeMinutes, setTravelTimeMinutes] = React.useState(0);
  const [isLoadingTimes, setIsLoadingTimes] = React.useState(false);

  // Customer tracking state
  const [bookingStep, setBookingStep] = React.useState<'lookup' | 'rooms' | 'services' | 'checkout'>('lookup');
  const [currentCustomer, setCurrentCustomer] = React.useState<CustomerData | null>(null);
  const [isReturningCustomer, setIsReturningCustomer] = React.useState(false);
  const [roomConfigurations, setRoomConfigurations] = React.useState<RoomConfiguration[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = React.useState<Set<string>>(new Set());

  const availableServiceTypes = React.useMemo(() => {
    const categories = SERVICES.filter((service) => service.category === selectedCategory);
    const set = new Set<ServiceFocus>();
    categories.forEach((service) => set.add(service.serviceType));
    return SERVICE_TYPE_ORDER.filter((type) => set.has(type));
  }, [selectedCategory]);

  React.useEffect(() => {
    if (!availableServiceTypes.includes(selectedFocus)) {
      setSelectedFocus(availableServiceTypes[0] ?? 'carpet');
    }
  }, [availableServiceTypes, selectedFocus]);

  // Fetch booked times and calculate available time slots when date/address/services change
  React.useEffect(() => {
    const fetchAndCalculateSlots = async () => {
      if (!serviceDate || !customerAddress) {
        setDynamicTimeSlots(generateAvailableTimes().map((t) => ({
          ...t,
          isAvailable: true,
        })));
        return;
      }

      try {
        setIsLoadingTimes(true);

        // Fetch booked times for the selected date
        const response = await fetch(`/api/calendar/booked-times?date=${serviceDate}`);
        const data = await response.json();
        setBookedTimes(data.bookedTimes || []);

        // Calculate travel time from address (simplified - using average 15 min for now)
        // In a real app, you'd call a routing API here
        // For now, we'll estimate based on distance
        const estimatedTravelTime = 20; // Default 20 minutes
        setTravelTimeMinutes(estimatedTravelTime);

        // Get total service duration from cart
        const serviceDuration = totalDurationMinutes > 0 ? totalDurationMinutes : 60;

        // Calculate available slots
        const slots = calculateAvailableTimeSlots(
          serviceDate,
          serviceDuration,
          estimatedTravelTime,
          data.bookedTimes || []
        );

        setDynamicTimeSlots(slots);
      } catch (error) {
        console.error('[booking] Error fetching booked times:', error);
        // Fall back to static time slots
        setDynamicTimeSlots(generateAvailableTimes().map((t) => ({
          ...t,
          isAvailable: true,
        })));
      } finally {
        setIsLoadingTimes(false);
      }
    };

    fetchAndCalculateSlots();
  }, [serviceDate, customerAddress, cartItems]);

  const servicesForSelection = React.useMemo(
    () =>
      SERVICES.filter(
        (service) => service.category === selectedCategory && service.serviceType === selectedFocus,
      ),
    [selectedCategory, selectedFocus],
  );

  const updateCartWithQuantity = React.useCallback((service: Service, quantity: number) => {
    const nextQuantity = clampQuantity(quantity);

    setSubmissionError(null);
    setConfirmation(null);

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.service.id === service.id);

      if (existingIndex === -1) {
        if (nextQuantity <= 0) {
          return prev;
        }
        return [...prev, { service, quantity: nextQuantity }];
      }

      if (nextQuantity <= 0) {
        return prev.filter((item) => item.service.id !== service.id);
      }

      const next = [...prev];
      next[existingIndex] = { service, quantity: nextQuantity };
      return next;
    });
  }, []);

  const incrementCartItem = (service: Service, delta: number) => {
    setSubmissionError(null);
    setConfirmation(null);

    setCartItems((prev) => {
      const existing = prev.find((item) => item.service.id === service.id);
      const currentQuantity = existing?.quantity ?? 0;
      const nextQuantity = clampQuantity(currentQuantity + delta);
      const filtered = prev.filter((item) => item.service.id !== service.id);
      if (nextQuantity <= 0) {
        return filtered;
      }
      return [...filtered, { service, quantity: nextQuantity }];
    });
    setQuantities((prev) => {
      const current = prev[service.id] ?? 0;
      const nextQuantity = clampQuantity(current + delta);
      return { ...prev, [service.id]: nextQuantity > 0 ? nextQuantity : 1 };
    });
  };

  const handleQuantityChange = (serviceId: string, value: string) => {
    const parsed = Number.parseInt(value, 10);
    const nextQuantity = clampQuantity(Number.isNaN(parsed) ? 0 : parsed);
    setSubmissionError(null);
    setQuantities((prev) => ({ ...prev, [serviceId]: nextQuantity || 1 }));
  };

  const handleAddToCart = (service: Service) => {
    const quantity = quantities[service.id] ?? 1;
    updateCartWithQuantity(service, quantity);
  };

  const handleAddRugToCart = (service: Service, isOffsite: boolean) => {
    const quantity = quantities[service.id] ?? 1;

    // Use appropriate dimensions and pricing based on service type
    const length = isOffsite ? rugOffsiteLength : rugOnsiteLength;
    const width = isOffsite ? rugOffsiteWidth : rugOnsiteWidth;
    const pricing = isOffsite ? rugOffsitePricing : rugOnsitePricing;

    // Create a unique ID for each rug configuration
    const uniqueId = `${service.id}-${length}x${width}-${Date.now()}`;

    // Create a custom service object with calculated pricing
    const customService: Service = {
      ...service,
      id: uniqueId,
      price: pricing.priceFormatted,
      priceCents: pricing.priceCents,
      title: `${service.title} (${length}' × ${width}')`,
      sizeLabel: `${pricing.squareFeet} sq ft @ $${pricing.pricePerSqFt}/sq ft`,
    };

    // Always add as a new item (don't update existing) to allow multiple rugs
    setCartItems((prev) => [...prev, { service: customService, quantity }]);

    // Clear the submission states
    setSubmissionError(null);
    setConfirmation(null);
  };

  const handleAddCarpetToCart = (service: Service) => {
    const quantity = quantities[service.id] ?? 1;

    // Create a unique ID for each carpet configuration
    const uniqueId = `${service.id}-${carpetSquareFeet}sqft-${Date.now()}`;

    // Calculate duration based on square footage (~5 sq ft per minute)
    const durationMinutes = carpetEstimatePending ? 60 : Math.max(30, Math.round(carpetSquareFeet / 5));

    // Create a custom service object with calculated pricing
    const customService: Service = {
      ...service,
      id: uniqueId,
      price: carpetPricing.priceFormatted,
      priceCents: carpetEstimatePending ? null : carpetPricing.priceCents,
      title: carpetEstimatePending ? 'Carpet Cleaning (Estimate Pending)' : `Carpet Cleaning (${carpetSquareFeet} sq ft)`,
      sizeLabel: carpetEstimatePending ? 'Size pending measurement' : `${carpetSquareFeet} sq ft @ $${carpetPricing.pricePerSqFt}/sq ft`,
      durationMinutes,
    };

    // Always add as a new item to allow multiple rooms
    setCartItems((prev) => [...prev, { service: customService, quantity }]);

    // Clear the submission states
    setSubmissionError(null);
    setConfirmation(null);
  };

  const handleAddTileToCart = (service: Service) => {
    const quantity = quantities[service.id] ?? 1;
    const uniqueId = `${service.id}-${tileSquareFeet}sqft-${Date.now()}`;
    const durationMinutes = tileEstimatePending ? 60 : Math.max(40, Math.round(tileSquareFeet / 4));

    const customService: Service = {
      ...service,
      id: uniqueId,
      price: tilePricing.priceFormatted,
      priceCents: tileEstimatePending ? null : tilePricing.priceCents,
      title: tileEstimatePending ? 'Tile & Grout Cleaning (Estimate Pending)' : `Tile & Grout Cleaning (${tileSquareFeet} sq ft)`,
      sizeLabel: tileEstimatePending ? 'Size pending measurement' : `${tileSquareFeet} sq ft @ $${tilePricing.pricePerSqFt}/sq ft`,
      durationMinutes,
    };

    setCartItems((prev) => [...prev, { service: customService, quantity }]);
    setSubmissionError(null);
    setConfirmation(null);
  };

  const handleAddWindowToCart = (service: Service) => {
    const quantity = quantities[service.id] ?? 1;
    const uniqueId = `${service.id}-${windowSquareFeet}sqft-${Date.now()}`;
    const durationMinutes = windowEstimatePending ? 15 : Math.max(8, Math.round(windowSquareFeet * 0.7));

    const customService: Service = {
      ...service,
      id: uniqueId,
      price: windowPricing.priceFormatted,
      priceCents: windowEstimatePending ? null : windowPricing.priceCents,
      title: windowEstimatePending ? 'Window Cleaning (Estimate Pending)' : `Window Cleaning (${windowSquareFeet} sq ft)`,
      sizeLabel: windowEstimatePending ? 'Size pending measurement' : `${windowSquareFeet} sq ft @ $${windowPricing.pricePerSqFt}/sq ft`,
      durationMinutes,
    };

    setCartItems((prev) => [...prev, { service: customService, quantity }]);
    setSubmissionError(null);
    setConfirmation(null);
  };

  const handleAddBoatToCart = (service: Service) => {
    const quantity = quantities[service.id] ?? 1;
    const uniqueId = `${service.id}-${boatLength}ft-${boatDetailType}-${Date.now()}`;
    const isEstimate = boatEstimatePending || boatLength > 40;
    const durationMinutes = isEstimate ? 180 : Math.max(120, boatLength * 6);
    const detailTypeLabel = boatDetailType.charAt(0).toUpperCase() + boatDetailType.slice(1);

    const customService: Service = {
      ...service,
      id: uniqueId,
      price: boatPricing.priceFormatted,
      priceCents: isEstimate ? null : boatPricing.priceCents,
      title: isEstimate ? `Boat ${detailTypeLabel} Detail (Estimate Pending)` : `Boat ${detailTypeLabel} Detail (${boatLength} ft)`,
      sizeLabel: isEstimate ? 'Size pending measurement' : `${boatLength} ft ${detailTypeLabel.toLowerCase()} @ $${boatPricing.pricePerFt}/ft`,
      durationMinutes,
    };

    setCartItems((prev) => [...prev, { service: customService, quantity }]);
    setSubmissionError(null);
    setConfirmation(null);
  };

  const handleAddRvToCart = (service: Service) => {
    const quantity = quantities[service.id] ?? 1;
    const uniqueId = `${service.id}-${rvLength}ft-${rvDetailType}-${Date.now()}`;
    const durationMinutes = rvEstimatePending ? 240 : Math.max(150, rvLength * 7);
    const detailTypeLabel = rvDetailType.charAt(0).toUpperCase() + rvDetailType.slice(1);

    const customService: Service = {
      ...service,
      id: uniqueId,
      price: rvPricing.priceFormatted,
      priceCents: rvEstimatePending ? null : rvPricing.priceCents,
      title: rvEstimatePending ? `RV ${detailTypeLabel} Detail (Estimate Pending)` : `RV ${detailTypeLabel} Detail (${rvLength} ft)`,
      sizeLabel: rvEstimatePending ? 'Size pending measurement' : `${rvLength} ft ${detailTypeLabel.toLowerCase()} @ $${rvPricing.pricePerFt}/ft`,
      durationMinutes,
    };

    setCartItems((prev) => [...prev, { service: customService, quantity }]);
    setSubmissionError(null);
    setConfirmation(null);
  };

  const handleAddDeodzizerToCart = (service: Service) => {
    const quantity = quantities[service.id] ?? 1;

    // Create a unique ID for each scent
    const uniqueId = `${service.id}-${selectedScent.replace(/\s+/g, '-')}-${Date.now()}`;

    // Create a custom service object with selected scent
    const customService: Service = {
      ...service,
      id: uniqueId,
      title: `${service.title} - ${selectedScent}`,
      sizeLabel: selectedScent,
    };

    // Always add as a new item to allow multiple scents
    setCartItems((prev) => [...prev, { service: customService, quantity }]);

    // Clear the submission states
    setSubmissionError(null);
    setConfirmation(null);
  };

  const removeFromCart = (serviceId: string) => {
    setSubmissionError(null);
    setConfirmation(null);
    setCartItems((prev) => prev.filter((item) => item.service.id !== serviceId));
  };

  // Customer flow handlers
  const handleCustomerFound = (customer: CustomerData) => {
    setCurrentCustomer(customer);
    setIsReturningCustomer(true);

    // Pre-fill customer info
    setCustomerName(customer.name);
    if (customer.email) setCustomerEmail(customer.email);
    if (customer.phone) setCustomerPhone(customer.phone);

    // Load saved address
    const defaultAddress = customer.addresses.find(a => a.is_default) || customer.addresses[0];
    if (defaultAddress?.street) {
      const addressParts = [defaultAddress.street, defaultAddress.city, defaultAddress.state, defaultAddress.zip].filter(Boolean);
      setCustomerAddress(addressParts.join(', '));
    }

    // Load saved rooms as configurations
    if (customer.rooms.length > 0) {
      const loadedRooms: RoomConfiguration[] = customer.rooms.map(room => ({
        id: `saved-${room.id}`,
        surfaceType: room.surface_type as 'carpet' | 'tile' | 'hardwood',
        roomName: room.room_name || '',
        squareFeet: room.square_feet,
        isFromDatabase: true,
        databaseId: room.id,
      }));
      setRoomConfigurations(loadedRooms);
      // Pre-select all rooms
      setSelectedRoomIds(new Set(loadedRooms.map(r => r.id)));
    }

    setBookingStep('rooms');
  };

  const handleNewCustomer = () => {
    setIsReturningCustomer(false);
    setCurrentCustomer(null);
    setBookingStep('rooms');
  };

  const handleSkipLookup = () => {
    setIsReturningCustomer(false);
    setCurrentCustomer(null);
    setBookingStep('services');
  };

  const handleRoomsComplete = () => {
    // Convert selected rooms to cart items
    const roomsToAdd = isReturningCustomer
      ? roomConfigurations.filter(r => selectedRoomIds.has(r.id))
      : roomConfigurations;

    // Map each room to a service based on surface type and square feet
    const newCartItems: CartLineItem[] = [];

    for (const room of roomsToAdd) {
      // Calculate price based on square feet (similar to area rug pricing)
      const pricePerSqFt = room.surfaceType === 'carpet' ? 0.30
        : room.surfaceType === 'tile' ? 0.40
          : 0.40; // hardwood

      // Handle estimate pending rooms
      const isEstimatePending = room.estimatePending === true;
      const priceCents = isEstimatePending ? null : Math.round(room.squareFeet * pricePerSqFt * 100);
      const durationMinutes = isEstimatePending ? 60 : Math.max(30, Math.round(room.squareFeet / 5)); // ~5 sq ft per minute

      // Create a custom service for this room
      const customService: Service = {
        id: `room-${room.id}-${Date.now()}`,
        title: room.roomName
          ? `${room.roomName} (${room.surfaceType.charAt(0).toUpperCase() + room.surfaceType.slice(1)})`
          : `${room.surfaceType.charAt(0).toUpperCase() + room.surfaceType.slice(1)} Room`,
        description: isEstimatePending
          ? `${room.surfaceType} cleaning - size to be measured on-site`
          : `${room.squareFeet} sq ft ${room.surfaceType} cleaning`,
        price: isEstimatePending ? 'Estimate Pending' : formatCurrency(priceCents!),
        priceCents,
        durationMinutes,
        imageUrl: room.surfaceType === 'carpet'
          ? '/services/new-pictures/medium-room-carpet-cleaning.jpg'
          : room.surfaceType === 'tile'
            ? '/services/new-pictures/x-small-room-tile-cleaning.jpg'
            : '/services/new-pictures/medium-room-carpet-cleaning.jpg',
        category: 'indoor',
        serviceType: room.surfaceType === 'tile' ? 'tile' : 'carpet',
        sizeLabel: isEstimatePending ? 'Size pending measurement' : `${room.squareFeet} sq ft @ $${pricePerSqFt.toFixed(2)}/sq ft`,
      };

      newCartItems.push({ service: customService, quantity: 1 });
    }

    // Add room services to cart
    if (newCartItems.length > 0) {
      setCartItems(prev => [...prev, ...newCartItems]);
    }

    setBookingStep('services');
  };

  const handleSaveRooms = async (rooms: RoomConfiguration[]) => {
    if (!currentCustomer) return;

    // Save new rooms to database
    for (const room of rooms) {
      if (!room.isFromDatabase) {
        try {
          const response = await fetch(`/api/customers/${currentCustomer.id}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              surface_type: room.surfaceType,
              room_name: room.roomName || null,
              square_feet: room.squareFeet,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            // Mark as saved
            room.isFromDatabase = true;
            room.databaseId = data.room.id;
          }
        } catch (error) {
          console.error('[rooms] Failed to save room:', error);
        }
      }
    }

    setRoomConfigurations([...rooms]);
  };

  const handleBackToLookup = () => {
    setBookingStep('lookup');
  };

  const totalPriceCents = cartItems.reduce((sum, line) => {
    const price = line.service.priceCents ?? 0;
    return sum + price * line.quantity;
  }, 0);

  const totalDurationMinutes = cartItems.reduce(
    (sum, line) => sum + (line.service.durationMinutes ?? 0) * line.quantity,
    0,
  );

  const isReadyToReserve =
    cartItems.length > 0 &&
    Boolean(customerName.trim()) &&
    Boolean(customerEmail.trim()) &&
    Boolean(serviceDate) &&
    Boolean(serviceTime);

  const handleReservation = async () => {
    if (!cartItems.length) {
      setSubmissionError('Add at least one service to your cart.');
      return;
    }

    if (!isReadyToReserve || isSubmitting) {
      setSubmissionError('Please complete the required contact and scheduling details.');
      return;
    }

    const requestedStartIso = toIsoWithTimeZone(serviceDate, serviceTime, timeZone);
    if (!requestedStartIso) {
      setSubmissionError('Please select a valid appointment date and time.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    const payload = {
      items: cartItems.map((item) => ({
        serviceId: item.service.id,
        quantity: item.quantity,
      })),
      customer: {
        name: customerName.trim(),
        email: customerEmail.trim(),
        phone: customerPhone.trim() || undefined,
        address: customerAddress.trim() || undefined,
      },
      notes: customerNotes.trim() ? customerNotes.trim() : undefined,
      requestedStart: requestedStartIso,
      timeZone,
    };

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        // Handle error response with optional suggested times
        const errorData = json as BookingError | null;
        setSuggestedTimes(errorData?.suggestedTimes || []);
        throw new Error(errorData?.error ?? 'Unable to complete your reservation right now.');
      }

      if (!json) {
        throw new Error('Unable to complete your reservation right now.');
      }

      // Success - clear suggested times
      setSuggestedTimes([]);
      const booking = json as BookingConfirmation;
      setConfirmation(booking);
      setCartItems([]);
      setQuantities({});
      setCustomerNotes('');
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : 'Unable to complete your reservation right now.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="services" className="py-24 relative z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <p className="text-sm font-semibold text-brand-cyan uppercase tracking-widest">Build Your Cleaning Plan</p>
          <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-md">Create your custom service cart</h2>
          <p className="text-lg text-premium-light/80">
            Choose services across indoor, outdoor, automotive, or add-on specialties. Bundle multiple items, pick your preferred appointment time, and we will confirm details and charge after the visit.
          </p>
        </div>

        <div className="glass-panel rounded-3xl shadow-2xl p-6 md:p-10 space-y-10">
          {/* Customer Lookup Step */}
          {bookingStep === 'lookup' && (
            <div className="space-y-6">
              <div className="flex items-baseline justify-between flex-wrap gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-brand-cyan">Getting Started</p>
                  <h3 className="text-2xl font-bold text-white">Let's check if we know you</h3>
                </div>
                <p className="text-sm text-gray-300 max-w-md">
                  Returning customers enjoy faster booking with saved room sizes and preferences.
                </p>
              </div>
              <CustomerLookup
                onCustomerFound={handleCustomerFound}
                onNewCustomer={handleNewCustomer}
                onSkip={handleSkipLookup}
              />
            </div>
          )}

          {/* Room Configuration Step */}
          {bookingStep === 'rooms' && (
            <div className="space-y-6">
              <div className="flex items-baseline justify-between flex-wrap gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-brand-cyan">
                    {isReturningCustomer ? 'Welcome Back' : 'Room Setup'}
                  </p>
                  <h3 className="text-2xl font-bold text-white">
                    {isReturningCustomer ? 'Select rooms to clean' : 'Tell us about your rooms'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleBackToLookup}
                  className="text-sm text-brand-cyan hover:underline"
                >
                  &larr; Back
                </button>
              </div>

              {isReturningCustomer && roomConfigurations.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">
                    Select the rooms you'd like cleaned today, or add new ones.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {roomConfigurations.map((room) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => {
                          const newSelected = new Set(selectedRoomIds);
                          if (newSelected.has(room.id)) {
                            newSelected.delete(room.id);
                          } else {
                            newSelected.add(room.id);
                          }
                          setSelectedRoomIds(newSelected);
                        }}
                        className={`p-4 rounded-xl border text-left transition-all ${selectedRoomIds.has(room.id)
                            ? 'border-brand-cyan bg-brand-cyan/10'
                            : 'border-white/10 bg-white/5 hover:border-white/30'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">
                              {room.roomName || `${room.surfaceType} room`}
                            </p>
                            <p className="text-sm text-gray-400">
                              {room.surfaceType} &bull; {room.squareFeet} sq ft
                            </p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedRoomIds.has(room.id)
                              ? 'border-brand-cyan bg-brand-cyan'
                              : 'border-white/30'
                            }`}>
                            {selectedRoomIds.has(room.id) && (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRoomConfigurations([...roomConfigurations, {
                        id: `new-${Date.now()}`,
                        surfaceType: 'carpet',
                        roomName: '',
                        squareFeet: 200,
                      }]);
                    }}
                    className="w-full py-3 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-brand-cyan"
                  >
                    + Add a new room
                  </button>
                </div>
              ) : (
                <RoomConfig
                  rooms={roomConfigurations}
                  onRoomsChange={setRoomConfigurations}
                  onSaveRooms={currentCustomer ? handleSaveRooms : undefined}
                  isReturningCustomer={isReturningCustomer}
                />
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleRoomsComplete}
                  className="px-8 py-3 bg-brand-cyan text-brand-dark font-semibold rounded-lg hover:bg-brand-blue transition-colors"
                >
                  Continue to Services &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Service Selection Steps (existing flow) */}
          {(bookingStep === 'services' || bookingStep === 'checkout') && (
            <>
              <div className="space-y-6">
                <div className="flex items-baseline justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-brand-cyan">Step 1</p>
                    <h3 className="text-2xl font-bold text-white">Select a service category</h3>
                  </div>
                  <p className="text-sm text-gray-300 max-w-md">Switch between categories to see specially curated services. Prices shown include equipment, products, and travel.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {CATEGORY_ORDER.map((category) => {
                    const detail = CATEGORY_DETAILS[category];
                    const isActive = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedCategory(category)}
                        className={`text-left rounded-2xl border transition-all p-5 h-full relative overflow-hidden group ${isActive
                          ? 'bg-gradient-to-br from-brand-dark to-brand-blue border-brand-cyan shadow-lg text-white'
                          : 'border-white/10 hover:border-brand-cyan/60 hover:shadow-md bg-white/5 hover:bg-white/10'
                          }`}
                        aria-pressed={isActive}
                      >
                        <div className={`absolute inset-0 bg-brand-cyan/10 transform transition-transform duration-500 ${isActive ? 'translate-y-0' : 'translate-y-full group-hover:translate-y-0'}`}></div>
                        <div className="relative z-10">
                          <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${isActive ? 'text-brand-cyan' : 'text-brand-cyan/70'}`}>{detail.lead}</p>
                          <p className={`text-xl font-bold mb-2 ${isActive ? 'text-white' : 'text-gray-200'}`}>{detail.label}</p>
                          <p className={`text-sm leading-relaxed ${isActive ? 'text-gray-200' : 'text-gray-400'}`}>{detail.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-baseline justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-brand-cyan">Step 2</p>
                    <h3 className="text-2xl font-bold text-white">Pick the focus area</h3>
                  </div>
                  <p className="text-sm text-gray-300 max-w-md">
                    Toggle between carpet, tile, upholstery, or window offerings tailored to your selected category.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {availableServiceTypes.map((focus) => {
                    const detail = SERVICE_TYPE_DETAILS[focus];
                    const isActive = selectedFocus === focus;
                    return (
                      <button
                        key={focus}
                        type="button"
                        onClick={() => setSelectedFocus(focus)}
                        className={`px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${isActive
                          ? 'bg-brand-cyan text-white border-brand-cyan shadow-md'
                          : 'border-white/10 text-gray-300 hover:border-brand-cyan hover:text-brand-cyan hover:bg-white/5'
                          }`}
                        aria-pressed={isActive}
                      >
                        {detail.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-gray-400">{SERVICE_TYPE_DETAILS[selectedFocus]?.description}</p>
              </div>

              <div className="grid gap-8 xl:grid-cols-[1.6fr_1fr]">
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-white">Service options</h4>
                  <div className="grid gap-6 md:grid-cols-2">
                    {servicesForSelection.map((service) => {
                      const quantity = quantities[service.id] ?? 1;
                      const cartLine = cartItems.find((line) => line.service.id === service.id);
                      const subtotalCents = (service.priceCents ?? 0) * (cartLine?.quantity ?? 0);
                      const isAreaRugOnSite = service.id === 'area-rug-onsite';
                      const isAreaRugOffSite = service.id === 'area-rug-offsite';
                      const isAreaRug = isAreaRugOnSite || isAreaRugOffSite;
                      const isCarpetCleaning = service.id === 'carpet-cleaning';
                      const isTileCleaning = service.id === 'tile-cleaning';
                      const isWindowCleaning = service.id === 'window-cleaning';
                      const isBoatDetail = service.id === 'boat-detail';
                      const isRvDetail = service.id === 'rv-detail';
                      const isDeodorizer = service.id === 'deodorizer-powder';

                      // Get appropriate dimensions and pricing
                      const rugLength = isAreaRugOffSite ? rugOffsiteLength : rugOnsiteLength;
                      const rugWidth = isAreaRugOffSite ? rugOffsiteWidth : rugOnsiteWidth;
                      const rugPricing = isAreaRugOffSite ? rugOffsitePricing : rugOnsitePricing;
                      const maxDimension = isAreaRugOffSite ? 12 : 25;

                      return (
                        <div
                          key={service.id}
                          className="rounded-2xl border border-white/10 bg-white/5 shadow-lg hover:bg-white/10 transition-all flex flex-col backdrop-blur-sm"
                        >
                          <img
                            src={service.imageUrl}
                            alt={service.title}
                            loading="lazy"
                            decoding="async"
                            onError={(event) => {
                              if (event.currentTarget.dataset.fallback === 'true') {
                                return;
                              }
                              event.currentTarget.dataset.fallback = 'true';
                              event.currentTarget.src = '/steam-power-hero2.jpg';
                            }}
                            className="w-full h-44 object-cover rounded-t-2xl"
                          />
                          <div className="p-5 flex flex-col gap-4 flex-grow">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-widest text-brand-cyan">
                                {SERVICE_TYPE_DETAILS[service.serviceType].label}
                              </p>
                              <h5 className="text-lg font-bold text-white">{service.title}</h5>
                              {service.sizeLabel && !isAreaRug && (
                                <p className="text-sm text-brand-cyan font-semibold">{service.sizeLabel}</p>
                              )}
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed flex-grow">{service.description}</p>

                            {/* Custom Area Rug Sizing */}
                            {isAreaRug && (
                              <div className="space-y-4 border-t border-gray-100 pt-4">
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-sm font-medium text-white">
                                        Length: {rugLength} ft
                                      </label>
                                      <span className="text-xs text-gray-500">Max {maxDimension} ft</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={1}
                                      max={maxDimension}
                                      value={rugLength}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (isAreaRugOffSite) {
                                          setRugOffsiteLength(val);
                                        } else {
                                          setRugOnsiteLength(val);
                                        }
                                      }}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-sm font-medium text-white">
                                        Width: {rugWidth} ft
                                      </label>
                                      <span className="text-xs text-gray-500">Max {maxDimension} ft</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={1}
                                      max={maxDimension}
                                      value={rugWidth}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (isAreaRugOffSite) {
                                          setRugOffsiteWidth(val);
                                        } else {
                                          setRugOnsiteWidth(val);
                                        }
                                      }}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
                                    />
                                  </div>
                                </div>
                                <div className="bg-brand-cyan/10 rounded-lg p-3 space-y-1">
                                  <p className="text-xs text-gray-300">
                                    Area: <span className="font-semibold text-white">{rugPricing.squareFeet} sq ft</span>
                                  </p>
                                  <p className="text-xs text-gray-300">
                                    Rate: <span className="font-semibold text-white">${rugPricing.pricePerSqFt} per sq ft</span>
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Carpet Cleaning Sizing */}
                            {isCarpetCleaning && (
                              <div className="space-y-4 border-t border-white/10 pt-4">
                                {/* Size Presets */}
                                <div className="flex gap-2">
                                  {[
                                    { label: 'S', value: 100 },
                                    { label: 'M', value: 200 },
                                    { label: 'L', value: 350 },
                                    { label: 'XL', value: 500 },
                                    { label: '?', value: 0, isPending: true },
                                  ].map((preset) => (
                                    <button
                                      key={preset.label}
                                      type="button"
                                      onClick={() => {
                                        if (preset.isPending) {
                                          setCarpetEstimatePending(true);
                                        } else {
                                          setCarpetEstimatePending(false);
                                          setCarpetSquareFeet(preset.value);
                                        }
                                      }}
                                      title={preset.isPending ? 'Estimate Pending' : `${preset.value} sq ft`}
                                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        preset.isPending
                                          ? carpetEstimatePending
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                          : !carpetEstimatePending && carpetSquareFeet === preset.value
                                            ? 'bg-brand-cyan text-brand-dark'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                      }`}
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>

                                {/* Custom Slider */}
                                {!carpetEstimatePending && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-sm font-medium text-white">
                                        Room Size: {carpetSquareFeet} sq ft
                                      </label>
                                      <span className="text-xs text-gray-500">Max 800 sq ft</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={50}
                                      max={800}
                                      step={10}
                                      value={carpetSquareFeet}
                                      onChange={(e) => setCarpetSquareFeet(Number(e.target.value))}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
                                    />
                                  </div>
                                )}

                                {/* Estimate Pending Message */}
                                {carpetEstimatePending && (
                                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                    <p className="text-sm text-amber-400">
                                      We'll measure and provide an exact quote on-site
                                    </p>
                                  </div>
                                )}

                                {/* Pricing Summary */}
                                <div className="bg-brand-cyan/10 rounded-lg p-3 space-y-1">
                                  <p className="text-xs text-gray-400">
                                    Rate: <span className="font-semibold text-white">$0.30 per sq ft</span>
                                  </p>
                                  {!carpetEstimatePending && (
                                    <p className="text-xs text-gray-400">
                                      Area: <span className="font-semibold text-white">{carpetSquareFeet} sq ft</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Tile Cleaning Sizing */}
                            {isTileCleaning && (
                              <div className="space-y-4 border-t border-white/10 pt-4">
                                <div className="flex gap-2">
                                  {[
                                    { label: 'S', value: 100 },
                                    { label: 'M', value: 200 },
                                    { label: 'L', value: 350 },
                                    { label: '?', value: 0, isPending: true },
                                  ].map((preset) => (
                                    <button
                                      key={preset.label}
                                      type="button"
                                      onClick={() => {
                                        if (preset.isPending) {
                                          setTileEstimatePending(true);
                                        } else {
                                          setTileEstimatePending(false);
                                          setTileSquareFeet(preset.value);
                                        }
                                      }}
                                      title={preset.isPending ? 'Estimate Pending' : `${preset.value} sq ft`}
                                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        preset.isPending
                                          ? tileEstimatePending
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                          : !tileEstimatePending && tileSquareFeet === preset.value
                                            ? 'bg-brand-cyan text-brand-dark'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                      }`}
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>
                                {!tileEstimatePending && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-sm font-medium text-white">Area: {tileSquareFeet} sq ft</label>
                                      <span className="text-xs text-gray-500">Max 600 sq ft</span>
                                    </div>
                                    <input type="range" min={50} max={600} step={10} value={tileSquareFeet}
                                      onChange={(e) => setTileSquareFeet(Number(e.target.value))}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-cyan" />
                                  </div>
                                )}
                                {tileEstimatePending && (
                                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                    <p className="text-sm text-amber-400">We'll measure and provide an exact quote on-site</p>
                                  </div>
                                )}
                                <div className="bg-brand-cyan/10 rounded-lg p-3">
                                  <p className="text-xs text-gray-400">Rate: <span className="font-semibold text-white">$0.40 per sq ft</span></p>
                                </div>
                              </div>
                            )}

                            {/* Window Cleaning Sizing */}
                            {isWindowCleaning && (
                              <div className="space-y-4 border-t border-white/10 pt-4">
                                <div className="flex gap-2">
                                  {[
                                    { label: 'S', value: 9, desc: '3×3 ft' },
                                    { label: 'M', value: 15, desc: '3×5 ft' },
                                    { label: 'L', value: 35, desc: '5×7 ft' },
                                    { label: 'XL', value: 50, desc: '7+ ft' },
                                    { label: '?', value: 0, isPending: true },
                                  ].map((preset) => (
                                    <button
                                      key={preset.label}
                                      type="button"
                                      onClick={() => {
                                        if (preset.isPending) {
                                          setWindowEstimatePending(true);
                                        } else {
                                          setWindowEstimatePending(false);
                                          setWindowSquareFeet(preset.value);
                                        }
                                      }}
                                      title={preset.isPending ? 'Estimate Pending' : preset.desc}
                                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        preset.isPending
                                          ? windowEstimatePending
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                          : !windowEstimatePending && windowSquareFeet === preset.value
                                            ? 'bg-brand-cyan text-brand-dark'
                                            : 'bg-white/10 text-white hover:bg-white/20'
                                      }`}
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>
                                {!windowEstimatePending && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-sm font-medium text-white">Window Size: {windowSquareFeet} sq ft</label>
                                      <span className="text-xs text-gray-500">Per window</span>
                                    </div>
                                    <input type="range" min={4} max={60} step={1} value={windowSquareFeet}
                                      onChange={(e) => setWindowSquareFeet(Number(e.target.value))}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-cyan" />
                                  </div>
                                )}
                                {windowEstimatePending && (
                                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                    <p className="text-sm text-amber-400">We'll measure and provide an exact quote on-site</p>
                                  </div>
                                )}
                                <div className="bg-brand-cyan/10 rounded-lg p-3">
                                  <p className="text-xs text-gray-400">Rate: <span className="font-semibold text-white">$1.00 per sq ft</span></p>
                                </div>
                              </div>
                            )}

                            {/* Boat Detailing */}
                            {isBoatDetail && (
                              <div className="space-y-4 border-t border-white/10 pt-4">
                                <div className="flex gap-2">
                                  {(['interior', 'exterior', 'full'] as const).map((type) => (
                                    <button key={type} type="button" onClick={() => setBoatDetailType(type)}
                                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        boatDetailType === type ? 'bg-brand-cyan text-brand-dark' : 'bg-white/10 text-white hover:bg-white/20'
                                      }`}>
                                      {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                  ))}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-white">Length: {boatLength} ft</label>
                                    <span className="text-xs text-gray-500">{boatLength > 40 ? 'Estimate required' : 'Max 40 ft'}</span>
                                  </div>
                                  <input type="range" min={15} max={45} step={1} value={boatLength}
                                    onChange={(e) => setBoatLength(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-cyan" />
                                </div>
                                <div className="bg-brand-cyan/10 rounded-lg p-3">
                                  <p className="text-xs text-gray-400">Rate: <span className="font-semibold text-white">~$5.00 per ft</span></p>
                                </div>
                              </div>
                            )}

                            {/* RV Detailing */}
                            {isRvDetail && (
                              <div className="space-y-4 border-t border-white/10 pt-4">
                                <div className="flex gap-2">
                                  {(['interior', 'exterior', 'full'] as const).map((type) => (
                                    <button key={type} type="button" onClick={() => setRvDetailType(type)}
                                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        rvDetailType === type ? 'bg-brand-cyan text-brand-dark' : 'bg-white/10 text-white hover:bg-white/20'
                                      }`}>
                                      {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-2 mt-2">
                                  <button type="button" onClick={() => setRvEstimatePending(!rvEstimatePending)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                                      rvEstimatePending ? 'bg-amber-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}>
                                    ? Estimate Pending
                                  </button>
                                </div>
                                {!rvEstimatePending && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-sm font-medium text-white">Length: {rvLength} ft</label>
                                      <span className="text-xs text-gray-500">Max 45 ft</span>
                                    </div>
                                    <input type="range" min={18} max={45} step={1} value={rvLength}
                                      onChange={(e) => setRvLength(Number(e.target.value))}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-cyan" />
                                  </div>
                                )}
                                {rvEstimatePending && (
                                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                    <p className="text-sm text-amber-400">We'll measure and provide an exact quote on-site</p>
                                  </div>
                                )}
                                <div className="bg-brand-cyan/10 rounded-lg p-3">
                                  <p className="text-xs text-gray-400">Rate: <span className="font-semibold text-white">~$6.00 per ft</span></p>
                                </div>
                              </div>
                            )}

                            {/* Deodorizer Scent Selection */}
                            {isDeodorizer && (
                              <div className="space-y-3 border-t border-gray-100 pt-4">
                                <label className="text-sm font-medium text-white">
                                  Select Scent
                                </label>
                                <select
                                  value={selectedScent}
                                  onChange={(e) => setSelectedScent(e.target.value)}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-cyan bg-white"
                                >
                                  {DEODORIZER_SCENTS.map((scent) => (
                                    <option key={scent} value={scent}>
                                      {scent}
                                    </option>
                                  ))}
                                </select>
                                <div className="bg-brand-cyan/10 rounded-lg p-3">
                                  <p className="text-xs text-gray-600">
                                    Selected: <span className="font-semibold text-white">{selectedScent}</span>
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className={`text-xl font-semibold ${
                                  (isCarpetCleaning && carpetEstimatePending) ||
                                  (isTileCleaning && tileEstimatePending) ||
                                  (isWindowCleaning && windowEstimatePending) ||
                                  (isBoatDetail && (boatEstimatePending || boatLength > 40)) ||
                                  (isRvDetail && rvEstimatePending)
                                    ? 'text-amber-400' : 'text-brand-cyan'
                                }`}>
                                  {isAreaRug ? rugPricing.priceFormatted
                                    : isCarpetCleaning ? carpetPricing.priceFormatted
                                    : isTileCleaning ? tilePricing.priceFormatted
                                    : isWindowCleaning ? windowPricing.priceFormatted
                                    : isBoatDetail ? boatPricing.priceFormatted
                                    : isRvDetail ? rvPricing.priceFormatted
                                    : service.price}
                                </span>
                                <span className="text-sm text-gray-500">{formatDuration(
                                  isCarpetCleaning && !carpetEstimatePending ? Math.max(30, Math.round(carpetSquareFeet / 5))
                                  : isTileCleaning && !tileEstimatePending ? Math.max(40, Math.round(tileSquareFeet / 4))
                                  : isWindowCleaning && !windowEstimatePending ? Math.max(8, Math.round(windowSquareFeet * 0.7))
                                  : isBoatDetail ? Math.max(120, boatLength * 6)
                                  : isRvDetail && !rvEstimatePending ? Math.max(150, rvLength * 7)
                                  : service.durationMinutes
                                )}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-200">
                                  Qty
                                  <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={quantity}
                                    onChange={(event) => handleQuantityChange(service.id, event.target.value)}
                                    className="w-16 border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-cyan bg-white/10 text-white"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isAreaRug) {
                                      handleAddRugToCart(service, isAreaRugOffSite);
                                    } else if (isCarpetCleaning) {
                                      handleAddCarpetToCart(service);
                                    } else if (isTileCleaning) {
                                      handleAddTileToCart(service);
                                    } else if (isWindowCleaning) {
                                      handleAddWindowToCart(service);
                                    } else if (isBoatDetail) {
                                      handleAddBoatToCart(service);
                                    } else if (isRvDetail) {
                                      handleAddRvToCart(service);
                                    } else if (isDeodorizer) {
                                      handleAddDeodzizerToCart(service);
                                    } else {
                                      handleAddToCart(service);
                                    }
                                  }}
                                  className="ml-auto inline-flex items-center justify-center px-4 py-2 rounded-full bg-brand-cyan text-white text-sm font-semibold hover:bg-brand-blue transition-colors"
                                >
                                  Add to Cart
                                </button>
                              </div>
                              {cartLine && (
                                <p className="text-xs text-gray-500">
                                  In cart • {cartLine.quantity} × {cartLine.service.price} ={' '}
                                  {cartLine.service.priceCents
                                    ? formatCurrency(subtotalCents)
                                    : 'Estimate pending'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {servicesForSelection.length === 0 && (
                      <div className="col-span-full text-center text-gray-500 border border-dashed border-gray-300 rounded-2xl p-8">
                        <p className="font-semibold text-brand-dark">More services coming soon</p>
                        <p className="text-sm mt-2">We are expanding offerings for this focus area. Pick another category or contact us for a custom quote.</p>
                      </div>
                    )}
                  </div>
                </div>

                <aside className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 shadow-lg p-5 space-y-4 backdrop-blur-sm">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-white">Cart summary</h4>
                        <p className="text-xs uppercase tracking-widest text-brand-cyan">Step 3</p>
                      </div>
                      <span className="text-sm text-gray-400">
                        {cartItems.length} item{cartItems.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {cartItems.length === 0 && <p className="text-sm text-gray-400">Add at least one service to start your booking.</p>}
                      {cartItems.map((line) => {
                        const hasUnitPrice = typeof line.service.priceCents === 'number' && line.service.priceCents > 0;
                        const lineSubtotal = (line.service.priceCents ?? 0) * line.quantity;
                        const lineTotalLabel = hasUnitPrice ? formatCurrency(lineSubtotal) : 'Estimate pending';
                        return (
                          <div key={line.service.id} className="rounded-xl border border-white/10 p-4 space-y-3 bg-white/5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-white">{line.service.title}</p>
                                {line.service.sizeLabel && (
                                  <p className="text-xs text-brand-cyan">{line.service.sizeLabel}</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromCart(line.service.id)}
                                className="text-xs font-semibold text-brand-cyan hover:text-brand-blue"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-300">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => incrementCartItem(line.service, -1)}
                                  className="w-7 h-7 inline-flex items-center justify-center rounded-full border border-white/20 hover:border-brand-cyan text-white"
                                  aria-label={`Reduce quantity for ${line.service.title}`}
                                >
                                  −
                                </button>
                                <span className="font-semibold text-white">{line.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => incrementCartItem(line.service, 1)}
                                  className="w-7 h-7 inline-flex items-center justify-center rounded-full border border-white/20 hover:border-brand-cyan text-white"
                                  aria-label={`Increase quantity for ${line.service.title}`}
                                >
                                  +
                                </button>
                              </div>
                              <span className="font-semibold text-brand-cyan">{lineTotalLabel}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
                      <div className="flex justify-between text-white font-semibold">
                        <span>Estimated total</span>
                        <span>{totalPriceCents > 0 ? formatCurrency(totalPriceCents) : 'Estimate pending'}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Service time</span>
                        <span>{totalDurationMinutes ? formatDuration(totalDurationMinutes) : 'TBD'}</span>
                      </div>
                      <p className="text-xs text-gray-500">Final charges occur after the service is completed and verified on-site.</p>
                    </div>
                  </div>

                  <form className="rounded-2xl border border-white/10 bg-white/5 shadow-lg p-5 space-y-4 backdrop-blur-sm">
                    <div className="flex items-baseline justify-between">
                      <h4 className="text-lg font-semibold text-white">Reserve your time</h4>
                      <p className="text-xs uppercase tracking-widest text-brand-cyan">Step 4</p>
                    </div>
                    <div className="grid gap-4">
                      <label className="text-sm font-medium text-gray-200 space-y-1">
                        Name
                        <input
                          type="text"
                          value={customerName}
                          onChange={(event) => {
                            setCustomerName(event.target.value);
                            setSubmissionError(null);
                            setConfirmation(null);
                          }}
                          placeholder="How should we address you?"
                          className="w-full border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-cyan bg-white/10 text-white placeholder-gray-400"
                        />
                      </label>
                      <label className="text-sm font-medium text-gray-200 space-y-1">
                        Email
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(event) => {
                            setCustomerEmail(event.target.value);
                            setSubmissionError(null);
                            setConfirmation(null);
                          }}
                          placeholder="we'll send confirmation here"
                          className="w-full border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-cyan bg-white/10 text-white placeholder-gray-400"
                        />
                      </label>
                      <label className="text-sm font-medium text-gray-200 space-y-1">
                        Phone (optional)
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(event) => {
                            setCustomerPhone(event.target.value);
                            setSubmissionError(null);
                            setConfirmation(null);
                          }}
                          placeholder="Helpful for day-of updates"
                          className="w-full border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-cyan bg-white/10 text-white placeholder-gray-400"
                        />
                      </label>
                      <label className="text-sm font-medium text-gray-200 space-y-1">
                        Service Address
                        <input
                          type="text"
                          value={customerAddress}
                          onChange={(event) => {
                            setCustomerAddress(event.target.value);
                            setSubmissionError(null);
                            setConfirmation(null);
                          }}
                          placeholder="Street address for service"
                          className="w-full border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-cyan bg-white/10 text-white placeholder-gray-400"
                        />
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="text-sm font-medium text-gray-200 space-y-1">
                          Preferred date
                          <select
                            value={serviceDate}
                            onChange={(event) => {
                              setServiceDate(event.target.value);
                              setSubmissionError(null);
                              setSuggestedTimes([]);
                              setConfirmation(null);
                            }}
                            className="w-full border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-cyan bg-white/10 text-white"
                          >
                            <option value="">Select a date...</option>
                            {generateAvailableDates().map((date) => (
                              <option key={date.dateString} value={date.dateString}>
                                {date.displayLabel}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm font-medium text-gray-200 space-y-1">
                          Preferred start time
                          {isLoadingTimes && <span className="text-xs text-gray-400 ml-2">(Loading...)</span>}
                          <select
                            value={serviceTime}
                            onChange={(event) => {
                              setServiceTime(event.target.value);
                              setSubmissionError(null);
                              setSuggestedTimes([]);
                              setConfirmation(null);
                            }}
                            className="w-full border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-cyan bg-white/10 text-white disabled:bg-white/5 disabled:text-gray-500"
                            disabled={isLoadingTimes}
                          >
                            <option value="">Select a time...</option>
                            {dynamicTimeSlots.map((slot) => (
                              <option
                                key={slot.timeString}
                                value={slot.timeString}
                                disabled={!slot.isAvailable}
                              >
                                {slot.displayLabel}
                                {!slot.isAvailable && ` (${slot.reason})`}
                              </option>
                            ))}
                          </select>
                          {dynamicTimeSlots.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              {getAvailableSlots(dynamicTimeSlots).length} of {dynamicTimeSlots.length} slots available
                            </p>
                          )}
                        </label>
                      </div>
                      <label className="text-sm font-medium text-gray-200 space-y-1">
                        Time zone
                        <select
                          value={timeZone}
                          onChange={(event) => {
                            setTimeZone(event.target.value);
                            setSubmissionError(null);
                            setConfirmation(null);
                          }}
                          className="w-full border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-cyan bg-white/10 text-white"
                        >
                          {TIME_ZONE_OPTIONS.map((zone) => (
                            <option key={zone} value={zone}>
                              {zone.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-gray-200 space-y-1">
                        Notes for our technicians (optional)
                        <textarea
                          value={customerNotes}
                          onChange={(event) => {
                            setCustomerNotes(event.target.value);
                            setSubmissionError(null);
                          }}
                          rows={3}
                          placeholder="Gate codes, parking instructions, pets we should greet, or specific problem areas."
                          className="w-full border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-cyan bg-white/10 text-white placeholder-gray-400"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleReservation}
                      className={`w-full inline-flex items-center justify-center rounded-full py-3 text-sm font-semibold transition-colors ${isReadyToReserve && !isSubmitting
                        ? 'bg-brand-cyan text-white hover:bg-brand-blue'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      disabled={!isReadyToReserve || isSubmitting}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Review & Confirm'}
                    </button>
                    <div className="space-y-3">
                      {submissionError && (
                        <div className="space-y-2">
                          <p className="text-xs text-red-600" role="alert">
                            {submissionError}
                          </p>
                          {suggestedTimes.length > 0 && (
                            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 space-y-2">
                              <p className="text-xs font-semibold text-yellow-800">Suggested alternative times:</p>
                              <div className="space-y-1">
                                {suggestedTimes.map((suggestion, index) => (
                                  <button
                                    key={index}
                                    onClick={() => {
                                      // Parse the ISO date and convert to local date/time inputs
                                      const suggestedDate = new Date(suggestion.date);

                                      // Extract date as YYYY-MM-DD
                                      const year = suggestedDate.getUTCFullYear();
                                      const month = String(suggestedDate.getUTCMonth() + 1).padStart(2, '0');
                                      const day = String(suggestedDate.getUTCDate()).padStart(2, '0');
                                      const dateString = `${year}-${month}-${day}`;

                                      // Extract time as HH:MM
                                      const hours = String(suggestedDate.getUTCHours()).padStart(2, '0');
                                      const minutes = String(suggestedDate.getUTCMinutes()).padStart(2, '0');
                                      const timeString = `${hours}:${minutes}`;

                                      setServiceDate(dateString);
                                      setServiceTime(timeString);
                                      setSubmissionError(null);
                                      setSuggestedTimes([]);
                                    }}
                                    className="block w-full text-left text-xs px-2 py-1.5 rounded bg-yellow-100 hover:bg-yellow-200 text-yellow-900 font-medium transition-colors"
                                  >
                                    {suggestion.dayName}: {suggestion.timeRange}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {confirmation && (
                        <div className="rounded-xl border border-brand-cyan/40 bg-brand-cyan/10 px-4 py-3 text-xs text-brand-dark space-y-1">
                          <p className="font-semibold text-sm text-brand-dark">
                            Reservation received for {formatAppointmentWindow(confirmation.startTime, confirmation.timeZone)}.
                          </p>
                          <p>
                            Estimated total {confirmation.totalPriceCents > 0 ? formatCurrency(confirmation.totalPriceCents) : 'Estimate pending'} •
                            {confirmation.durationMinutes ? ` ${formatDuration(confirmation.durationMinutes)} on site` : ' Time TBD'}.
                          </p>
                          <p>
                            {confirmation.emailSent
                              ? 'A confirmation email is on its way.'
                              : 'We were unable to email a confirmation automatically. We will follow up shortly.'}
                          </p>
                          {confirmation.calendarUrl && (
                            <a
                              href={confirmation.calendarUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex text-brand-cyan font-semibold hover:text-brand-blue"
                            >
                              View calendar event
                            </a>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-400">
                        We will verify availability, email a confirmation with your appointment details, and capture payment after service completion.
                      </p>
                    </div>
                  </form>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Services;
