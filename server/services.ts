import { SERVICES } from '../data/services';

export const getServiceById = (id: string) => SERVICES.find((service) => service.id === id);
