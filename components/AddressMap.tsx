import React from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface AddressMapProps {
  customerAddress?: string;
  businessLocation?: { latitude: number; longitude: number };
  lastJobLocation?: { latitude: number; longitude: number };
  travelTime?: { fromBusiness: number; fromLastJob?: number };
}

const AddressMap: React.FC<AddressMapProps> = ({
  customerAddress,
  businessLocation = { latitude: 40.4208, longitude: -74.1908 }, // Default: 46 Monmouth Rd, Monroe NJ
  lastJobLocation,
  travelTime,
}) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);

  React.useEffect(() => {
    // Only initialize map if we have a container and customer address
    if (!mapRef.current || !customerAddress) {
      return;
    }

    // Initialize map if not already done
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: true,
        dragging: true,
      }).setView([40.4208, -74.1908], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Invalidate size to ensure map renders correctly if container size changed
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add business location marker
    L.marker([businessLocation.latitude, businessLocation.longitude], {
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    })
      .bindPopup('<b>Your Office</b><br>46 Monmouth Rd, Monroe NJ')
      .addTo(map);

    // Try to geocode customer address if provided
    if (customerAddress) {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customerAddress)}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);

            // Add customer location marker
            L.marker([lat, lon], {
              icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
              }),
            })
              .bindPopup(`<b>Customer Location</b><br>${customerAddress}`)
              .addTo(map);

            // Add last job location if provided
            if (lastJobLocation) {
              L.marker([lastJobLocation.latitude, lastJobLocation.longitude], {
                icon: L.icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41],
                }),
              })
                .bindPopup('<b>Last Job Location</b>')
                .addTo(map);
            }

            // Fit bounds to show all markers
            const group = new L.FeatureGroup([
              L.marker([businessLocation.latitude, businessLocation.longitude]),
              L.marker([lat, lon]),
              ...(lastJobLocation ? [L.marker([lastJobLocation.latitude, lastJobLocation.longitude])] : []),
            ]);
            map.fitBounds(group.getBounds().pad(0.1));
          }
        })
        .catch((error) => console.error('[map] Geocoding error:', error));
    }
  }, [customerAddress, businessLocation, lastJobLocation]);

  return (
    <div className="space-y-3">
      <div
        ref={mapRef}
        className="w-full rounded-lg border border-gray-200 shadow-sm"
        style={{ height: '300px', minHeight: '300px', position: 'relative', zIndex: 0 }}
      />
      {travelTime && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="font-semibold text-blue-900">From Your Office</p>
            <p className="text-blue-700">~{travelTime.fromBusiness} min drive</p>
          </div>
          {travelTime.fromLastJob && (
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
              <p className="font-semibold text-orange-900">From Last Job</p>
              <p className="text-orange-700">~{travelTime.fromLastJob} min drive</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressMap;
