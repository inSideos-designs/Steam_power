/**
 * Business availability and scheduling utilities
 */

// Business hours: 7 AM to 6 PM
export const BUSINESS_HOURS_START = 7; // 7 AM
export const BUSINESS_HOURS_END = 18; // 6 PM (18:00)

// 2025 Federal Holidays
export const FEDERAL_HOLIDAYS_2025 = [
  { date: '2025-01-01', name: 'New Year\'s Day' },
  { date: '2025-01-20', name: 'MLK Jr. Day' },
  { date: '2025-02-17', name: 'Presidents\' Day' },
  { date: '2025-03-17', name: 'St. Patrick\'s Day' }, // Not official but often observed
  { date: '2025-05-26', name: 'Memorial Day' },
  { date: '2025-06-19', name: 'Juneteenth' },
  { date: '2025-07-04', name: 'Independence Day' },
  { date: '2025-09-01', name: 'Labor Day' },
  { date: '2025-10-13', name: 'Columbus Day' },
  { date: '2025-11-11', name: 'Veterans Day' },
  { date: '2025-11-27', name: 'Thanksgiving' },
  { date: '2025-11-28', name: 'Thanksgiving (Friday)' }, // Day after Thanksgiving
  { date: '2025-12-25', name: 'Christmas' },
];

/**
 * Check if a date is a federal holiday
 */
export const isFederalHoliday = (date: Date): boolean => {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return FEDERAL_HOLIDAYS_2025.some((holiday) => holiday.date === dateStr);
};

/**
 * Check if booking is allowed on a given date
 * Rules:
 * - Only Saturday, Sunday, or Federal Holidays
 * - NOT Monday-Friday unless it's a federal holiday
 */
export const isBookableDay = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;
  const isWeekend = isSaturday || isSunday;

  // Allow weekends
  if (isWeekend) {
    return true;
  }

  // Allow federal holidays (even on weekdays)
  if (isFederalHoliday(date)) {
    return true;
  }

  // Not a weekend or holiday - not bookable
  return false;
};

/**
 * Check if time is within business hours (7 AM - 6 PM)
 */
export const isWithinBusinessHours = (date: Date): boolean => {
  const hour = date.getHours();
  return hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;
};

/**
 * Check if a booking request is valid
 */
export const isValidBookingTime = (startDate: Date, endDate: Date): { valid: boolean; reason?: string } => {
  // Check if booking starts on a bookable day
  if (!isBookableDay(startDate)) {
    const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
    return {
      valid: false,
      reason: `We are closed on ${dayName}s. Please select a weekend date or federal holiday.`,
    };
  }

  // Check if start time is within business hours
  if (!isWithinBusinessHours(startDate)) {
    return {
      valid: false,
      reason: `Bookings must be between 7 AM and 6 PM. Your selected time ${startDate.toLocaleTimeString(
        'en-US',
        { hour: 'numeric', minute: '2-digit' }
      )} is outside business hours.`,
    };
  }

  // Check if end time is within business hours
  if (!isWithinBusinessHours(endDate)) {
    return {
      valid: false,
      reason: `Service must complete by 6 PM. Your selected end time ${endDate.toLocaleTimeString(
        'en-US',
        { hour: 'numeric', minute: '2-digit' }
      )} extends past business hours.`,
    };
  }

  return { valid: true };
};

/**
 * Suggest alternative time slots (1-2 hours ahead)
 * Returns up to 3 suggestions
 */
export const suggestAlternativeTimes = (
  requestedStart: Date,
  requestedEnd: Date,
  durationMinutes: number
): Array<{ start: Date; end: Date; dayName: string; timeRange: string }> => {
  const suggestions: Array<{ start: Date; end: Date; dayName: string; timeRange: string }> = [];
  let currentDate = new Date(requestedStart);

  // Try the next 60 days to find available slots
  const maxAttempts = 60;
  let attempts = 0;

  while (suggestions.length < 3 && attempts < maxAttempts) {
    attempts++;

    // Move to next potential time slot (1-2 hours ahead initially, then next days)
    if (suggestions.length === 0) {
      // First suggestion: 1-2 hours ahead of original request
      currentDate = new Date(requestedStart);
      currentDate.setHours(currentDate.getHours() + 1);
    } else if (suggestions.length === 1) {
      // Second suggestion: 2 hours ahead
      currentDate = new Date(requestedStart);
      currentDate.setHours(currentDate.getHours() + 2);
    } else {
      // Third and beyond: next bookable day at start of business
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(BUSINESS_HOURS_START, 0, 0, 0);
    }

    // Check if this date/time is valid
    const suggestedEnd = new Date(currentDate);
    suggestedEnd.setMinutes(suggestedEnd.getMinutes() + durationMinutes);

    const validation = isValidBookingTime(currentDate, suggestedEnd);
    if (validation.valid) {
      suggestions.push({
        start: currentDate,
        end: suggestedEnd,
        dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        timeRange: `${currentDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })} - ${suggestedEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      });
    }
  }

  return suggestions;
};

/**
 * Format a list of suggested times for user display
 */
export const formatSuggestedTimes = (
  suggestions: Array<{ dayName: string; timeRange: string }>
): string => {
  if (suggestions.length === 0) {
    return 'No alternative times available in the next 60 days.';
  }

  return suggestions.map((s, i) => `${i + 1}. ${s.dayName}: ${s.timeRange}`).join('\n');
};
