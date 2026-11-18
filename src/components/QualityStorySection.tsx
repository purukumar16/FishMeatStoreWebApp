import React from 'react';
import { ThermometerSnowflake, ShieldAlert, Award, Clock, MapPin, Scissors } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const QualityStorySection: React.FC = () => {
  const { stores, setIsLocationModalOpen } = useStore();

  return (
    <section className="bg-[#18082e] text-purple-100 py-10 sm:py-16 border-t border-purple-900/60">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="max-w-2xl mb-8 sm:mb-12">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            The Hyperlocal Retail Advantage
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Why We Never Use Central Mega-Hubs.
          </h2>
          <p className="text-xs sm:text-sm text-purple-200/80 mt-2 leading-relaxed">
            Central warehouses require freezing or chemical preservatives so meat survives 4-6 hour van transit routes across cities. We operate exclusively through neighborhood walk-in retail chillers with a strict 4-kilometre delivery radius.
          </p>
        </div>

        {/* 3 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="p-4 sm:p-6 bg-purple-950/60 rounded-xl border border-purple-800/60 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-900 text-emerald-400 flex items-center justify-center border border-purple-700/50">
              <ThermometerSnowflake className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">
              0°C - 4°C Unbroken Chill Chain
            </h3>
            <p className="text-xs text-purple-200/90 leading-relaxed">
              From source arrival to retail display, every cut is kept within the bacteriostatic 0°C to 4°C zone. Never frozen, preserving natural moisture, delicate cell walls, and tenderness.
            </p>
          </div>

          <div className="p-4 sm:p-6 bg-purple-950/60 rounded-xl border border-purple-800/60 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-900 text-emerald-400 flex items-center justify-center border border-purple-700/50">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">
              Strict 4km Store Delivery Radius
            </h3>
            <p className="text-xs text-purple-200/90 leading-relaxed">
              Because delivery riders travel at most 4 kilometers, transit takes just 15 to 25 minutes. Packaged with insulated food-grade gel ice packs, it reaches your kitchen in peak butchery condition.
            </p>
          </div>

          <div className="p-4 sm:p-6 bg-purple-950/60 rounded-xl border border-purple-800/60 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-900 text-emerald-400 flex items-center justify-center border border-purple-700/50">
              <Scissors className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">
              Cut to Your Custom Order
            </h3>
            <p className="text-xs text-purple-200/90 leading-relaxed">
              Nothing is pre-cut sitting in plastic trays for days. When you order, our store master butchers slice, debone, or clean to your specific cooking requirements and weight selections.
            </p>
          </div>
        </div>

        {/* Physical Stores Network Directory */}
        <div className="bg-purple-950/80 p-4 sm:p-6 rounded-2xl border border-purple-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Our 5 Active Physical Retail Stores in Bengaluru</span>
              </h3>
              <p className="text-xs text-purple-300 mt-0.5">
                Visit our walk-in meat and fish showcases or order home delivery within 4km of any location.
              </p>
            </div>
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium self-start sm:self-auto cursor-pointer min-h-[44px] sm:min-h-0 inline-flex items-center"
            >
              Check My Radius Status
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 text-xs">
            {stores.map((s) => (
              <div key={s.id} className="p-3 bg-[#21093b] rounded-lg border border-purple-800/80 space-y-1">
                <div className="font-semibold text-purple-100">{s.neighborhood}</div>
                <div className="text-[11px] text-purple-300 truncate">{s.address}</div>
                <div className="text-[10px] text-emerald-400 font-mono">Chiller: {s.chillerTempC}°C · 4km SLA</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
