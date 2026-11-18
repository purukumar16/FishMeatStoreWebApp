import React, { useState } from 'react';
import { X, MapPinOff, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { DEMO_LOCATION_PRESETS } from '../data/stores';

export const OutOfAreaModal: React.FC = () => {
  const {
    isOutOfAreaModalOpen,
    setIsOutOfAreaModalOpen,
    userLocation,
    submitLeadCapture,
    leadSubmittedSuccess,
    setLeadSubmittedSuccess,
    setLocationFromPreset,
  } = useStore();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOutOfAreaModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !phone) return;
    submitLeadCapture(email, phone, userLocation.address);
  };

  const handlePickInRangePreset = (index: number) => {
    const preset = DEMO_LOCATION_PRESETS[index];
    setLocationFromPreset(preset);
    setIsOutOfAreaModalOpen(false);
    setLeadSubmittedSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto border border-stone-200">
        {/* Header Banner */}
        <div className="bg-[#21093b] p-4 sm:p-6 text-white relative">
          <button
            onClick={() => setIsOutOfAreaModalOpen(false)}
            className="absolute top-3 right-3 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg bg-purple-900/60 text-purple-200 hover:text-white transition-colors cursor-pointer"
            aria-label="Close out-of-area modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1 pr-10">
            <MapPinOff className="w-4 h-4 shrink-0" />
            <span>HYPERLOCAL RADIUS BOUNDARY CHECK</span>
          </div>

          <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
            We aren't in your area yet!
          </h3>
          <p className="text-xs text-purple-100/90 mt-2 leading-relaxed">
            Your address at <strong className="text-white">{userLocation.address}</strong> is{' '}
            <strong className="text-emerald-300">{userLocation.distanceToNearestKm ?? '9+'} km</strong> from our nearest retail store.
            To guarantee 100% freshness and an unbroken 0°C - 4°C chill chain without chemical preservatives, we strictly limit delivery to a 4km radius.
          </p>
        </div>

        {/* Lead Capture or Success State */}
        <div className="p-4 sm:p-6">
          {leadSubmittedSuccess ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-purple-950">
                Vote Recorded for {userLocation.neighborhood || 'Your Locality'}!
              </h4>
              <p className="text-xs text-stone-600 max-w-sm mx-auto">
                Thank you! We prioritize opening new physical stores based on customer density. You'll receive an exclusive opening coupon worth ₹200 as soon as we launch near you.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs text-stone-900">
                <span className="font-semibold block text-stone-900">Vote to bring Fish Meat Store to your area</span>
                <span className="text-stone-600">Drop your contact details below. We notify you the moment a retail hub launches in your 4km circle.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-900 focus:border-purple-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-900 focus:border-purple-900"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Notify Me When You Launch Here
              </button>
            </form>
          )}

          {/* Quick Demo Switcher so the user can test in-range flow */}
          <div className="mt-6 pt-5 border-t border-stone-200">
            <span className="text-[11px] font-semibold text-stone-900 uppercase tracking-wider block mb-2">
              Want to preview the store & test ordering?
            </span>
            <p className="text-xs text-stone-600 mb-3">
              Switch to an in-range neighborhood (≤ 4km) to browse live cuts and test weight variant pricing:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => handlePickInRangePreset(0)}
                className="p-2.5 text-left border border-stone-200 rounded-lg hover:border-stone-400 hover:bg-stone-50 transition-all cursor-pointer group"
              >
                <div className="font-semibold text-xs text-stone-900 group-hover:text-stone-950 flex items-center justify-between">
                  <span>Indiranagar (0.7km)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-[11px] text-stone-500">Served by Flagship Hub</div>
              </button>
              <button
                onClick={() => handlePickInRangePreset(1)}
                className="p-2.5 text-left border border-stone-200 rounded-lg hover:border-stone-400 hover:bg-stone-50 transition-all cursor-pointer group"
              >
                <div className="font-semibold text-xs text-stone-900 group-hover:text-stone-950 flex items-center justify-between">
                  <span>Koramangala (0.2km)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-[11px] text-stone-500">Served by 4th Block Hub</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
