/**
 * Dynamic time slot calculation considering:
 * - Service duration
 * - 30-minute buffer between jobs
 * - Travel time to customer location
 * - Already booked times
 */

export interface BookedSlot {
  start: string; // ISO datetime
  end: string; // ISO datetime
  summary: string;
}

export interface AvailableTimeSlot {
  timeString: string; // HH:MM format
  displayLabel: string; // "7:00 AM" format
  isAvailable: boolean;
  reason?: string; // Why it's unavailable
}

/**
 * Calculate all possible time slots for a day (7 AM - 5 PM hourly)
 */
const generateHourlySlots = (): AvailableTimeSlot[] => {
  const slots: AvailableTimeSlot[] = [];

  // 7 AM (07:00) through 5 PM (17:00)
  for (let hour = 7; hour < 18; hour++) {
    const hourString = String(hour).padStart(2, '0');
    const timeString = `${hourString}:00`;

    const displayLabel =
      hour === 12
        ? '12:00 PM'
        : hour < 12
          ? `${hour}:00 AM`
          : `${hour - 12}:00 PM`;

    slots.push({
      timeString,
      displayLabel,
      isAvailable: true,
    });
  }

  return slots;
};

/**
 * Check if a time slot conflicts with booked appointments
 * Accounts for service duration and 30-minute buffer
 */
const isTimeSlotConflict = (
  selectedDate: string,
  slotStartHour: number,
  serviceDurationMinutes: number,
  travelTimeMinutes: number,
  bookedSlots: BookedSlot[]
): boolean => {
  // Calculate when this job would end (service + 30 min buffer)
  const bufferMinutes = 30;
  const totalJobDurationMinutes = serviceDurationMinutes + bufferMinutes;

  // Calculate slot times using the selected date
  const slotStart = new Date(`${selectedDate}T${String(slotStartHour).padStart(2, '0')}:00:00Z`);

  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + serviceDurationMinutes);

  // Account for travel time after the job
  const timeNeeded = new Date(slotStart);
  timeNeeded.setMinutes(timeNeeded.getMinutes() + totalJobDurationMinutes + travelTimeMinutes);

  // Check against booked times
  for (const booked of bookedSlots) {
    const bookedStart = new Date(booked.start);
    const bookedEnd = new Date(booked.end);

    // Check if there's any overlap
    if (slotStart < bookedEnd && timeNeeded > bookedStart) {
      console.log(`[conflict] ${slotStartHour}:00 conflicts:`, {
        slotStart: slotStart.toISOString(),
        timeNeeded: timeNeeded.toISOString(),
        bookedStart: bookedStart.toISOString(),
        bookedEnd: bookedEnd.toISOString(),
      });
      return true; // Conflict found
    }
  }

  return false; // No conflict
};

/**
 * Calculate available time slots for a date
 */
export const calculateAvailableTimeSlots = (
  selectedDate: string,
  serviceDurationMinutes: number,
  travelTimeMinutes: number,
  bookedTimes: BookedSlot[]
): AvailableTimeSlot[] => {
  // Start with all hourly slots
  let slots = generateHourlySlots();

  // Filter for conflicts with booked appointments
  slots = slots.map((slot) => {
    const hourMatch = slot.timeString.match(/(\d{2}):/);
    if (!hourMatch) return slot;

    const hour = parseInt(hourMatch[1], 10);
    const hasConflict = isTimeSlotConflict(selectedDate, hour, serviceDurationMinutes, travelTimeMinutes, bookedTimes);

    if (hasConflict) {
      return {
        ...slot,
        isAvailable: false,
        reason: 'Conflicts with existing booking',
      };
    }

    return slot;
  });

  // Filter out slots that end after 6 PM (end of business day)
  slots = slots.map((slot) => {
    const hourMatch = slot.timeString.match(/(\d{2}):/);
    if (!hourMatch) return slot;

    const hour = parseInt(hourMatch[1], 10);
    const endHour = hour + Math.ceil(serviceDurationMinutes / 60);

    if (endHour >= 18) {
      return {
        ...slot,
        isAvailable: false,
        reason: 'Service would extend past 6 PM',
      };
    }

    return slot;
  });

  return slots;
};

/**
 * Filter slots to only show available ones
 */
export const getAvailableSlots = (slots: AvailableTimeSlot[]): AvailableTimeSlot[] => {
  return slots.filter((slot) => slot.isAvailable);
};

/**
 * Get reason why a slot is unavailable
 */
export const getUnavailableReason = (slot: AvailableTimeSlot): string => {
  return slot.reason || 'Unavailable';
};

/**
 * Format time info for display
 */
export const formatTimeSlotInfo = (
  slots: AvailableTimeSlot[],
  serviceDurationMinutes: number,
  travelTimeMinutes: number
): string => {
  const availableCount = slots.filter((s) => s.isAvailable).length;
  const totalCount = slots.length;

  return `${availableCount} of ${totalCount} time slots available (Service: ${serviceDurationMinutes}min + Travel: ${travelTimeMinutes}min + 30min buffer)`;
};
