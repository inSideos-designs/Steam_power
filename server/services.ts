import { SERVICES } from '../data/services';
import type { Service } from '../types';

export interface CartItemInput {
  serviceId: string;
  quantity: number;
}

export interface CartLineItem {
  service: Service;
  quantity: number;
}

export const getServiceById = (id: string) => SERVICES.find((service) => service.id === id);

export const resolveCartItems = (items: CartItemInput[]): CartLineItem[] => {
  return items.map((item) => {
    const service = getServiceById(item.serviceId);
    if (!service) {
      throw new Error(`Service not found: ${item.serviceId}`);
    }

    const numericQuantity = Number(item.quantity);
    const quantity = Number.isFinite(numericQuantity)
      ? Math.max(1, Math.floor(numericQuantity))
      : 1;

    return {
      service,
      quantity,
    };
  });
};

export const calculateCartTotals = (cartItems: CartLineItem[]) => {
  return cartItems.reduce(
    (acc, item) => {
      const priceCents = item.service.priceCents ?? 0;
      acc.totalPriceCents += priceCents * item.quantity;
      acc.totalDurationMinutes += (item.service.durationMinutes ?? 0) * item.quantity;
      return acc;
    },
    {
      totalPriceCents: 0,
      totalDurationMinutes: 0,
    },
  );
};
