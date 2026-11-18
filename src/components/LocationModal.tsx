import React, { useState } from 'react';
import { X, Navigation, CheckCircle2, AlertTriangle, Store as StoreIcon, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { DEMO_LOCATION_PRESETS, PHYSICAL_STORES } from '../data/stores';

export const LocationModal: React.FC = () => {
  const {
    isLocationModalOpen,
    setIsLocationModalOpen,
    userLocation,
    activeStore,
    setLocationFromPreset,
    setUserCustomLocation,
    requestBrowserGeolocation,
    geoLoading,
    geoError,
    manuallySelectStore,
  } = useStore();

  const [customAddress, setCustomAddress] = useState('');
  const [activeTab, setActiveTab] = useState<'presets' | 'stores' | 'custom'>('presets');

  if (!isLocationModalOpen) return null;

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAddress.trim()) return;

    // Simulate geocoding to a location in central Bangalore
    // e.g., if user types something, we calculate a plausible coordinate
    const hash = customAddress.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const mockLat = 12.92 + (hash % 100) * 0.001;
    const mockLon = 77.60 + (hash % 100) * 0.0012;

    setUserCustomLocation(customAddress, mockLat, mockLon);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-stone-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-stone-900">
              Select Your Delivery Location
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              We deliver strictly within <strong className="text-purple-900">4 kilometres</strong> of each retail store to guarantee unbroken 0-4°C chill chain freshness.
            </p>
          </div>
          <button
            onClick={() => setIsLocationModalOpen(false)}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer shrink-0"
            aria-label="Close location modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Location Status Bar */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="text-xs min-w-0">
            <span className="text-stone-500">Currently Delivering To:</span>
            <div className="font-semibold text-stone-800 text-sm">
              {userLocation.address}
            </div>
            <div className="text-stone-500 mt-0.5 flex flex-wrap items-center gap-2">
              <span>Nearest Hub: <strong className="text-stone-700">{activeStore.name}</strong></span>
              <span aria-hidden="true">·</span>
              {userLocation.distanceToNearestKm !== null && (
                <span>Distance: <strong className={userLocation.isWithinRange ? 'text-emerald-700' : 'text-purple-700'}>{userLocation.distanceToNearestKm} km</strong></span>
              )}
            </div>
          </div>

          <button
            onClick={requestBrowserGeolocation}
            disabled={geoLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 min-h-[44px] sm:min-h-0 py-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Navigation className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
            <span>{geoLoading ? 'Detecting...' : 'Detect GPS'}</span>
          </button>
        </div>

        {geoError && (
          <div className="p-3 mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{geoError}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 px-4 sm:px-5 pt-2 sm:pt-3 gap-4 sm:gap-6 text-xs font-medium overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab('presets')}
            className={`min-h-[44px] sm:min-h-0 pb-2.5 cursor-pointer border-b-2 transition-colors shrink-0 ${
              activeTab === 'presets'
                ? 'border-purple-900 text-purple-950 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Test Location Presets (4km & Out-of-Range)
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`min-h-[44px] sm:min-h-0 pb-2.5 cursor-pointer border-b-2 transition-colors shrink-0 ${
              activeTab === 'stores'
                ? 'border-purple-900 text-purple-950 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            All 5 Physical Retail Stores
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`min-h-[44px] sm:min-h-0 pb-2.5 cursor-pointer border-b-2 transition-colors shrink-0 ${
              activeTab === 'custom'
                ? 'border-purple-900 text-purple-950 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Manual Address / Coordinates
          </button>
        </div>

        {/* Tab 1: Presets */}
        {activeTab === 'presets' && (
          <div className="p-5 space-y-3">
            <p className="text-xs text-stone-600">
              Click any neighborhood to immediately test how our 4km matching algorithm responds:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DEMO_LOCATION_PRESETS.map((preset) => {
                const isCurrent = userLocation.address === preset.address;
                return (
                  <button
                    key={preset.label}
                    onClick={() => setLocationFromPreset(preset)}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer relative ${
                      isCurrent
                        ? 'border-purple-900 bg-stone-50 ring-1 ring-purple-900'
                        : 'border-stone-200 hover:border-stone-400 hover:bg-stone-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs text-stone-900">
                        {preset.label}
                      </span>
                      {preset.inRange ? (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ≤ 4km In Range
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          &gt; 4km Out of Range
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 mt-1">
                      {preset.address}
                    </div>
                    <div className="text-[11px] text-stone-600 mt-2 pt-2 border-t border-stone-100 flex items-center justify-between">
                      <span>Nearest: {preset.expectedNearest.split(' ')[0]}</span>
                      <span className="font-mono font-medium text-stone-800">
                        ~{preset.expectedDistanceKm} km
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Retail Stores List */}
        {activeTab === 'stores' && (
          <div className="p-5 space-y-3">
            <p className="text-xs text-stone-600">
              Select a physical retail store to simulate standing inside its local 4km fulfillment perimeter:
            </p>
            <div className="space-y-2.5">
              {PHYSICAL_STORES.map((store) => {
                const isActive = activeStore.id === store.id;
                return (
                  <div
                    key={store.id}
                    className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all ${
                      isActive
                        ? 'border-purple-900 bg-stone-50'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StoreIcon className="w-4 h-4 text-purple-900 shrink-0" />
                        <span className="font-semibold text-xs text-stone-900">{store.name}</span>
                        {isActive && (
                          <span className="text-[10px] bg-purple-900 text-white font-medium px-1.5 py-0.5 rounded">
                            Active Menu
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500">{store.address}</p>
                      <div className="text-[11px] text-stone-500 flex flex-wrap items-center gap-2 sm:gap-3">
                        <span>Chiller: <strong className="text-emerald-700">{store.chillerTempC}°C</strong></span>
                        <span aria-hidden="true">·</span>
                        <span>Hours: {store.openingHours}</span>
                        <span aria-hidden="true">·</span>
                        <span>Max Radius: 4.0 km</span>
                      </div>
                    </div>

                    <button
                      onClick={() => manuallySelectStore(store.id)}
                      className={`w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
                        isActive
                          ? 'bg-purple-900 text-white'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-200'
                      }`}
                    >
                      {isActive ? 'Current Store' : 'Switch Store'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Custom Address Input */}
        {activeTab === 'custom' && (
          <div className="p-4 sm:p-5">
            <form onSubmit={handleManualSearch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Enter Street Name, Apartment, or Landmark:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    placeholder="ISIRI HUB, 138/138, near cold man, Budigere Cross, Bommenahalli"
                    className="flex-1 min-h-[44px] sm:min-h-0 px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-900 focus:border-purple-900"
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] sm:min-h-0 px-4 py-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs shrink-0"
                  >
                    Calculate 4km
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-stone-500">
                In production, this integrates with Google Places Autocomplete & Geocoding API to extract exact latitude and longitude, then verifies distance against all active retail stores via Haversine / Distance Matrix.
              </p>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
          <span>Active store: <strong className="text-purple-950">{activeStore.neighborhood}</strong></span>
          <button
            onClick={() => setIsLocationModalOpen(false)}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 bg-purple-950 hover:bg-purple-900 text-white font-medium rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};
