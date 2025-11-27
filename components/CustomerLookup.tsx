import React from 'react';

// Types for customer data from the API
export interface SavedRoom {
  id: string;
  surface_type: string;
  room_name: string | null;
  square_feet: number;
  notes: string | null;
}

export interface SavedAddress {
  id: string;
  label: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  is_default: boolean;
}

export interface CustomerData {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  addresses: SavedAddress[];
  rooms: SavedRoom[];
  recentBookings: Array<{
    id: string;
    scheduled_at: string;
    total_cents: number;
    status: string;
  }>;
}

interface CustomerLookupProps {
  onCustomerFound: (customer: CustomerData) => void;
  onNewCustomer: () => void;
  onSkip: () => void;
}

type LookupState = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

const CustomerLookup: React.FC<CustomerLookupProps> = ({
  onCustomerFound,
  onNewCustomer,
  onSkip,
}) => {
  const [lookupValue, setLookupValue] = React.useState('');
  const [lookupState, setLookupState] = React.useState<LookupState>('idle');
  const [customer, setCustomer] = React.useState<CustomerData | null>(null);
  const [errorMessage, setErrorMessage] = React.useState('');

  const isEmail = (value: string) => value.includes('@');

  const handleLookup = async () => {
    if (!lookupValue.trim()) return;

    setLookupState('loading');
    setErrorMessage('');

    try {
      const params = new URLSearchParams();
      if (isEmail(lookupValue)) {
        params.set('email', lookupValue.trim());
      } else {
        params.set('phone', lookupValue.trim());
      }

      const response = await fetch(`/api/customers/lookup?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lookup failed');
      }

      if (data.found && data.customer) {
        setCustomer(data.customer);
        setLookupState('found');
      } else {
        setLookupState('not_found');
      }
    } catch (error) {
      console.error('[customer-lookup] Error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to lookup customer');
      setLookupState('error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup();
    }
  };

  const handleContinueAsReturning = () => {
    if (customer) {
      onCustomerFound(customer);
    }
  };

  const handleContinueAsNew = () => {
    onNewCustomer();
  };

  // Render based on state
  if (lookupState === 'found' && customer) {
    return (
      <div className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan/5 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-cyan/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-brand-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Welcome back, {customer.name.split(' ')[0]}!</h3>
            <p className="text-sm text-gray-400">We found your account</p>
          </div>
        </div>

        {customer.rooms.length > 0 && (
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-300 mb-2">Your saved rooms:</p>
            <div className="space-y-2">
              {customer.rooms.slice(0, 5).map((room) => (
                <div key={room.id} className="flex justify-between text-sm">
                  <span className="text-white">
                    {room.room_name || `${room.surface_type} room`}
                  </span>
                  <span className="text-brand-cyan">{room.square_feet} sq ft</span>
                </div>
              ))}
              {customer.rooms.length > 5 && (
                <p className="text-xs text-gray-500">+ {customer.rooms.length - 5} more rooms</p>
              )}
            </div>
          </div>
        )}

        {customer.recentBookings.length > 0 && (
          <p className="text-xs text-gray-400">
            Last service: {new Date(customer.recentBookings[0].scheduled_at).toLocaleDateString()}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleContinueAsReturning}
            className="flex-1 bg-brand-cyan text-brand-dark font-semibold py-3 rounded-lg hover:bg-brand-blue transition-colors"
          >
            Continue with my saved info
          </button>
          <button
            type="button"
            onClick={handleContinueAsNew}
            className="px-4 py-3 border border-white/20 text-white rounded-lg hover:border-brand-cyan transition-colors"
          >
            Start fresh
          </button>
        </div>
      </div>
    );
  }

  if (lookupState === 'not_found') {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-cyan/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-brand-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Welcome!</h3>
            <p className="text-sm text-gray-400">Let's set up your home for the first time</p>
          </div>
        </div>

        <p className="text-sm text-gray-300">
          We'll save your room configurations so you won't have to enter them again for future bookings.
        </p>

        <button
          type="button"
          onClick={handleContinueAsNew}
          className="w-full bg-brand-cyan text-brand-dark font-semibold py-3 rounded-lg hover:bg-brand-blue transition-colors"
        >
          Get started
        </button>

        <button
          type="button"
          onClick={() => {
            setLookupState('idle');
            setLookupValue('');
          }}
          className="w-full text-sm text-gray-400 hover:text-white"
        >
          Try a different email or phone
        </button>
      </div>
    );
  }

  // Default: lookup form
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Is this your first cleaning with us?</h3>
        <p className="text-sm text-gray-400 mt-1">
          Enter your email or phone to check if we have your info on file
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={lookupValue}
          onChange={(e) => setLookupValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Email or phone number"
          className="flex-1 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-cyan bg-white/10 text-white placeholder-gray-400"
          disabled={lookupState === 'loading'}
        />
        <button
          type="button"
          onClick={handleLookup}
          disabled={!lookupValue.trim() || lookupState === 'loading'}
          className="px-6 py-3 bg-brand-cyan text-brand-dark font-semibold rounded-lg hover:bg-brand-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {lookupState === 'loading' ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            'Look up'
          )}
        </button>
      </div>

      {lookupState === 'error' && (
        <p className="text-sm text-red-400">{errorMessage}</p>
      )}

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="w-full py-3 border border-white/20 text-white rounded-lg hover:border-brand-cyan transition-colors text-sm"
      >
        Skip - I'm new here
      </button>
    </div>
  );
};

export default CustomerLookup;
