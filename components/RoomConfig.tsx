import React from 'react';

export interface RoomConfiguration {
  id: string;
  surfaceType: 'carpet' | 'tile' | 'hardwood';
  roomName: string;
  squareFeet: number;
  isFromDatabase?: boolean;
  databaseId?: string;
}

interface RoomConfigProps {
  rooms: RoomConfiguration[];
  onRoomsChange: (rooms: RoomConfiguration[]) => void;
  onSaveRooms?: (rooms: RoomConfiguration[]) => Promise<void>;
  isReturningCustomer?: boolean;
}

const SURFACE_TYPES = [
  { value: 'carpet', label: 'Carpet', pricePerSqFt: 0.30, color: 'bg-blue-500' },
  { value: 'tile', label: 'Tile', pricePerSqFt: 0.35, color: 'bg-amber-500' },
  { value: 'hardwood', label: 'Hardwood', pricePerSqFt: 0.40, color: 'bg-orange-700' },
] as const;

const SIZE_PRESETS = [
  { label: 'S', value: 100, description: 'Small (100 sq ft)' },
  { label: 'M', value: 250, description: 'Medium (250 sq ft)' },
  { label: 'L', value: 400, description: 'Large (400 sq ft)' },
  { label: 'XL', value: 600, description: 'Extra Large (600 sq ft)' },
];

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);

const RoomConfigSlider: React.FC<{
  room: RoomConfiguration;
  index: number;
  onUpdate: (room: RoomConfiguration) => void;
  onRemove: () => void;
}> = ({ room, index, onUpdate, onRemove }) => {
  const surfaceInfo = SURFACE_TYPES.find(s => s.value === room.surfaceType) || SURFACE_TYPES[0];
  const estimatedPrice = Math.round(room.squareFeet * surfaceInfo.pricePerSqFt * 100);

  return (
    <div className="border border-white/10 rounded-xl p-4 bg-white/5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${surfaceInfo.color}`} />
          <div>
            <input
              type="text"
              value={room.roomName}
              onChange={(e) => onUpdate({ ...room, roomName: e.target.value })}
              placeholder={`${surfaceInfo.label} Room ${index + 1}`}
              className="bg-transparent border-b border-white/20 text-white font-medium focus:outline-none focus:border-brand-cyan pb-1"
            />
            <p className="text-xs text-gray-400 mt-1">{surfaceInfo.label}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-400 transition-colors"
          aria-label="Remove room"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Size Presets */}
      <div className="flex gap-2">
        {SIZE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onUpdate({ ...room, squareFeet: preset.value })}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              room.squareFeet === preset.value
                ? 'bg-brand-cyan text-brand-dark'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Custom size</span>
          <span className="text-white font-medium">{room.squareFeet} sq ft</span>
        </div>
        <input
          type="range"
          min={50}
          max={800}
          step={10}
          value={room.squareFeet}
          onChange={(e) => onUpdate({ ...room, squareFeet: Number(e.target.value) })}
          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>50 sq ft</span>
          <span>800 sq ft</span>
        </div>
      </div>

      {/* Estimated Price */}
      <div className="flex justify-between items-center pt-2 border-t border-white/10">
        <span className="text-sm text-gray-400">Estimated price</span>
        <span className="text-brand-cyan font-semibold">{formatCurrency(estimatedPrice)}</span>
      </div>
    </div>
  );
};

const RoomConfig: React.FC<RoomConfigProps> = ({
  rooms,
  onRoomsChange,
  onSaveRooms,
  isReturningCustomer = false,
}) => {
  const [roomCounts, setRoomCounts] = React.useState<Record<string, number>>({
    carpet: 0,
    tile: 0,
    hardwood: 0,
  });
  const [showAddRoom, setShowAddRoom] = React.useState(!isReturningCustomer);
  const [isSaving, setIsSaving] = React.useState(false);

  // Initialize room counts from existing rooms
  React.useEffect(() => {
    const counts: Record<string, number> = { carpet: 0, tile: 0, hardwood: 0 };
    rooms.forEach(room => {
      if (counts[room.surfaceType] !== undefined) {
        counts[room.surfaceType]++;
      }
    });
    setRoomCounts(counts);
  }, []);

  const generateRoomId = () => `room-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const handleRoomCountChange = (surfaceType: string, count: number) => {
    const newCount = Math.max(0, Math.min(10, count));
    const currentCount = roomCounts[surfaceType] || 0;

    setRoomCounts(prev => ({ ...prev, [surfaceType]: newCount }));

    // Add or remove rooms as needed
    let newRooms = [...rooms];

    if (newCount > currentCount) {
      // Add rooms
      for (let i = currentCount; i < newCount; i++) {
        newRooms.push({
          id: generateRoomId(),
          surfaceType: surfaceType as 'carpet' | 'tile' | 'hardwood',
          roomName: '',
          squareFeet: 200, // Default size
        });
      }
    } else if (newCount < currentCount) {
      // Remove rooms of this type (from the end)
      const roomsOfType = newRooms.filter(r => r.surfaceType === surfaceType);
      const roomsToRemove = roomsOfType.slice(newCount);
      newRooms = newRooms.filter(r => !roomsToRemove.includes(r));
    }

    onRoomsChange(newRooms);
  };

  const handleRoomUpdate = (updatedRoom: RoomConfiguration) => {
    onRoomsChange(rooms.map(r => r.id === updatedRoom.id ? updatedRoom : r));
  };

  const handleRoomRemove = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setRoomCounts(prev => ({
        ...prev,
        [room.surfaceType]: Math.max(0, (prev[room.surfaceType] || 1) - 1),
      }));
    }
    onRoomsChange(rooms.filter(r => r.id !== roomId));
  };

  const handleAddSingleRoom = (surfaceType: 'carpet' | 'tile' | 'hardwood') => {
    const newRoom: RoomConfiguration = {
      id: generateRoomId(),
      surfaceType,
      roomName: '',
      squareFeet: 200,
    };
    onRoomsChange([...rooms, newRoom]);
    setRoomCounts(prev => ({
      ...prev,
      [surfaceType]: (prev[surfaceType] || 0) + 1,
    }));
    setShowAddRoom(false);
  };

  const handleSaveRooms = async () => {
    if (!onSaveRooms) return;
    setIsSaving(true);
    try {
      await onSaveRooms(rooms);
    } finally {
      setIsSaving(false);
    }
  };

  const totalEstimate = React.useMemo(() => {
    return rooms.reduce((total, room) => {
      const surfaceInfo = SURFACE_TYPES.find(s => s.value === room.surfaceType) || SURFACE_TYPES[0];
      return total + Math.round(room.squareFeet * surfaceInfo.pricePerSqFt * 100);
    }, 0);
  }, [rooms]);

  const totalSquareFeet = rooms.reduce((sum, r) => sum + r.squareFeet, 0);

  return (
    <div className="space-y-6">
      {/* Room Count Selectors */}
      {!isReturningCustomer && rooms.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">How many rooms need cleaning?</h3>
            <p className="text-sm text-gray-400 mt-1">
              Select the number of rooms for each surface type
            </p>
          </div>

          <div className="grid gap-4">
            {SURFACE_TYPES.map((surface) => (
              <div key={surface.value} className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${surface.color}`} />
                  <div>
                    <p className="text-white font-medium">{surface.label}</p>
                    <p className="text-xs text-gray-400">${surface.pricePerSqFt.toFixed(2)} per sq ft</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleRoomCountChange(surface.value, (roomCounts[surface.value] || 0) - 1)}
                    className="w-8 h-8 rounded-full border border-white/20 text-white hover:border-brand-cyan flex items-center justify-center"
                    disabled={!roomCounts[surface.value]}
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-white font-semibold">
                    {roomCounts[surface.value] || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRoomCountChange(surface.value, (roomCounts[surface.value] || 0) + 1)}
                    className="w-8 h-8 rounded-full border border-white/20 text-white hover:border-brand-cyan flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Room Configuration Cards */}
      {rooms.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Configure your rooms</h3>
            <p className="text-sm text-gray-400">{rooms.length} room{rooms.length !== 1 ? 's' : ''}</p>
          </div>

          <p className="text-sm text-gray-400">
            Drag the slider or use presets to set the approximate size. This helps us provide accurate estimates.
          </p>

          <div className="grid gap-4">
            {rooms.map((room, index) => (
              <RoomConfigSlider
                key={room.id}
                room={room}
                index={index}
                onUpdate={handleRoomUpdate}
                onRemove={() => handleRoomRemove(room.id)}
              />
            ))}
          </div>

          {/* Add Another Room */}
          {showAddRoom ? (
            <div className="flex gap-2">
              {SURFACE_TYPES.map((surface) => (
                <button
                  key={surface.value}
                  type="button"
                  onClick={() => handleAddSingleRoom(surface.value as 'carpet' | 'tile' | 'hardwood')}
                  className="flex-1 py-3 border border-white/20 rounded-lg text-white hover:border-brand-cyan transition-colors flex items-center justify-center gap-2"
                >
                  <div className={`w-3 h-3 rounded-full ${surface.color}`} />
                  <span className="text-sm">+ {surface.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddRoom(true)}
              className="w-full py-3 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-brand-cyan transition-colors"
            >
              + Add another room
            </button>
          )}

          {/* Summary */}
          <div className="bg-brand-cyan/10 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Total area</span>
              <span className="text-white font-medium">{totalSquareFeet.toLocaleString()} sq ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Estimated total</span>
              <span className="text-brand-cyan font-semibold text-lg">{formatCurrency(totalEstimate)}</span>
            </div>
            <p className="text-xs text-gray-500 pt-2 border-t border-white/10">
              Final price confirmed after on-site inspection
            </p>
          </div>

          {/* Save Rooms Button (for returning customers or new setup) */}
          {onSaveRooms && rooms.some(r => !r.isFromDatabase) && (
            <button
              type="button"
              onClick={handleSaveRooms}
              disabled={isSaving}
              className="w-full py-3 bg-white/10 border border-brand-cyan text-brand-cyan rounded-lg hover:bg-brand-cyan hover:text-brand-dark transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save rooms for future bookings'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomConfig;
