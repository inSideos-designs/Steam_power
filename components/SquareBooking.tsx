import React, { useEffect, useRef, useState } from 'react';
import { SERVICES } from '../constants';

const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APP_ID || 'sandbox-sq0idb-RxBonLpvkHQlaqapzNBrQA';
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID || 'REPLACE_WITH_YOUR_SANDBOX_LOCATION_ID';
const SQUARE_SCRIPT_URL = 'https://sandbox.web.squarecdn.com/v1/square.js';

interface TokenResult {
  status: string;
  token?: string;
  errors?: Array<{ detail?: string; message?: string }>;
}

interface SquareCard {
  attach: (selector: string | HTMLElement) => Promise<void>;
  tokenize: () => Promise<TokenResult>;
  destroy?: () => void;
}

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => {
        card: () => Promise<SquareCard>;
      };
    };
  }
}

let squareScriptPromise: Promise<void> | null = null;

const loadSquareScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Square SDK can only load in the browser.'));
  }

  if (window.Square) {
    return Promise.resolve();
  }

  if (!squareScriptPromise) {
    squareScriptPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById('square-payments-sdk');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load Square SDK script.')));
        return;
      }

      const script = document.createElement('script');
      script.id = 'square-payments-sdk';
      script.src = SQUARE_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Square SDK script.'));
      document.head.appendChild(script);
    });
  }

  return squareScriptPromise;
};

const SquareBooking: React.FC = () => {
  const [card, setCard] = useState<SquareCard | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceIndex, setServiceIndex] = useState(0);
  const [serverStatus, setServerStatus] = useState<string>('');
  const cardContainerRef = useRef<HTMLDivElement | null>(null);
  const missingLocation = !SQUARE_LOCATION_ID || SQUARE_LOCATION_ID.startsWith('REPLACE');
  const selectedService = SERVICES[serviceIndex];
  const serviceSupportsInstantCheckout = typeof selectedService?.priceCents === 'number' && (selectedService?.priceCents ?? 0) > 0;

  useEffect(() => {
    let isMounted = true;
    let mountedCard: SquareCard | null = null;

    const init = async () => {
      if (!window.isSecureContext) {
        setStatus('error');
        setMessage('The Web Payments SDK requires HTTPS or localhost.');
        return;
      }

      setStatus('loading');
      try {
        await loadSquareScript();
        if (!window.Square) {
          throw new Error('Square SDK did not load.');
        }

        const payments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
        const cardInstance = await payments.card();
        await cardInstance.attach('#card-container');

        if (!isMounted) {
          cardInstance.destroy?.();
          return;
        }

        mountedCard = cardInstance;
        setCard(cardInstance);
        setStatus('ready');
        setMessage('Enter card details using the Square secure field.');
      } catch (error) {
        const fallback = error instanceof Error ? error.message : 'Unable to initialize Square payments.';
        setStatus('error');
        setMessage(fallback);
      }
    };

    if (!missingLocation) {
      init();
    }

    return () => {
      isMounted = false;
      mountedCard?.destroy?.();
    };
  }, [missingLocation]);

  const sendTokenToBackend = async (nonce: string) => {
    try {
      const response = await fetch('/api/square/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: nonce,
          serviceId: selectedService.id,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Square sandbox payment failed.');
      }

      const paymentId = payload.payment?.id ? `Payment ID: ${payload.payment.id}` : '';
      setServerStatus(`Sandbox payment created. ${paymentId}`.trim());
    } catch (error) {
      const fallback = error instanceof Error ? error.message : 'Unable to reach the Steam Powered API server.';
      setServerStatus(fallback);
      throw error;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!card) {
      return;
    }
    if (!serviceSupportsInstantCheckout) {
      setMessage('Select a service with a fixed price or use the Square link for custom-quoted jobs.');
      return;
    }

    setIsSubmitting(true);
    setMessage(`Tokenizing card for ${selectedService.title}...`);
    setToken('');
    setServerStatus('');
    try {
      const result = await card.tokenize();
      if (result.status === 'OK' && result.token) {
        setToken(result.token);
        setMessage('Success! Sending token to Steam Powered API...');
        await sendTokenToBackend(result.token);
        setMessage('Payment submitted to Square sandbox successfully.');
      } else if (result.errors?.length) {
        const detail = result.errors.map((err) => err.detail || err.message || 'Unknown error').join('\n');
        setMessage(detail);
      } else {
        setMessage('Unable to tokenize card.');
      }
    } catch (error) {
      if (!(error instanceof Error && /Square sandbox payment failed|Unable to reach/.test(error.message))) {
        const fallback = error instanceof Error ? error.message : 'Unexpected error while tokenizing card.';
        setMessage(fallback);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="booking" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-semibold text-brand-cyan uppercase tracking-widest mb-3">Secure Booking</p>
            <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mb-6">Reserve Your Steam Cleaning Visit</h2>
            <p className="text-lg text-gray-600 mb-4">
              Use our Square-powered checkout to securely share your preferred payment method before the appointment. We use the sandbox environment for testing, so you can try it with Square's sample cards.
            </p>
            <ul className="space-y-3 text-gray-600">
              <li>• 256-bit encryption handled by Square</li>
              <li>• Works on modern browsers (no IE11 support)</li>
              <li>• Requires HTTPS or localhost for security</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-2xl shadow-lg p-8">
            {missingLocation ? (
              <div className="text-center">
                <p className="text-lg font-semibold text-brand-dark mb-2">Add your Square location ID</p>
                <p className="text-gray-600">
                  Set <code className="bg-gray-200 px-1 rounded">VITE_SQUARE_LOCATION_ID</code> in your <code className="bg-gray-200 px-1 rounded">.env</code> file to finish the connection.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="service" className="block text-sm font-semibold text-brand-dark mb-2">Service</label>
                  <select
                    id="service"
                    value={serviceIndex}
                    onChange={(event) => setServiceIndex(Number(event.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-cyan bg-white"
                  >
                    {SERVICES.map((service, index) => (
                      <option key={service.id} value={index}>
                        {service.title} — {service.price}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-gray-500">{selectedService.description}</p>
                  {!serviceSupportsInstantCheckout && (
                    <p className="mt-2 text-sm text-brand-dark">
                      Pricing is custom for this item. Use the Square link below or contact us for a quote.
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="card-container" className="block text-sm font-semibold text-brand-dark mb-2">
                    Card details
                  </label>
                  <div
                    id="card-container"
                    ref={cardContainerRef}
                    className="rounded-lg border border-dashed border-brand-light-blue bg-white px-4 py-5"
                  ></div>
                </div>
                <button
                  type="submit"
                  disabled={status !== 'ready' || isSubmitting || !serviceSupportsInstantCheckout}
                  className="w-full py-3 rounded-full font-semibold text-white bg-brand-cyan hover:bg-brand-blue transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? 'Processing...' : 'Generate Secure Token'}
                </button>
                <div className="text-sm text-gray-600 whitespace-pre-wrap min-h-[3rem]">
                  {message || (status === 'loading' ? 'Loading secure fields…' : '')}
                </div>
                {serverStatus && (
                  <div className="text-sm text-brand-dark bg-white border border-brand-light-blue rounded-lg p-3">
                    {serverStatus}
                  </div>
                )}
                {token && (
                  <div className="bg-white border border-brand-light-blue rounded-lg p-3 text-sm space-y-1">
                    <div className="font-semibold text-brand-dark">Token:</div>
                    <div className="font-mono break-all">{token}</div>
                    <div className="text-xs text-gray-500">
                      Stored securely on the server only long enough to call Square's Payments API.
                    </div>
                  </div>
                )}
                {selectedService.squareLink && (
                  <a
                    href={selectedService.squareLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center border border-brand-cyan text-brand-cyan hover:bg-brand-cyan hover:text-white font-semibold py-3 rounded-full transition-colors"
                  >
                    Book {selectedService.title} on Square
                  </a>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SquareBooking;
