import React from 'react';
import { useStore } from '../context/StoreContext';
import { ShieldCheck, Phone, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  const { setIsArchitectureOpen, setIsLocationModalOpen } = useStore();

  return (
    <footer className="bg-[#120524] text-purple-300 text-xs border-t border-purple-900/60">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 pb-8 sm:pb-10 border-b border-purple-900/60">
          {/* Col 1: Brand & Promise */}
          <div className="space-y-3">
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-white block">
                Fish Meat Store
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 tracking-wide block uppercase mt-0.5">
                A Franchise of FreshToHome
              </span>
            </div>
            <p className="text-purple-300/90 text-xs leading-relaxed">
              Premium fresh raw fish, poultry, and tender goat meat retail. Distributed through local physical butcher shops with cold-chain integrity and 4km hyperlocal home delivery.
            </p>
            <div className="flex items-center gap-1.5 text-purple-200 text-xs pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>FSSAI Lic. No. 11224333000892</span>
            </div>
          </div>

          {/* Col 2: Retail Categories */}
          <div className="space-y-2">
            <span className="font-semibold text-white uppercase tracking-wider text-[11px] block">
              Fresh Categories
            </span>
            <ul className="space-y-1.5 text-purple-300/80 text-xs">
              <li>Freshwater Fish (Rohu, Catla, Tilapia, Live Murrel, Basa)</li>
              <li>Seawater Catch (Silver Pomfret, Kingfish, Salmon)</li>
              <li>Sea Prawns & Mud Crabs</li>
              <li>Poultry (Skinless, Drumsticks, Boneless, Country)</li>
              <li>Goat Mutton (Curry Cut, Raan Leg, Shoulder, Boneless, Paya, Chops)</li>
            </ul>
          </div>

          {/* Col 3: Operations & Cold Chain */}
          <div className="space-y-2">
            <span className="font-semibold text-white uppercase tracking-wider text-[11px] block">
              Hyperlocal Standards
            </span>
            <ul className="space-y-1.5 text-purple-300/80 text-xs">
              <li>Operating Hours: 6:30 AM - 10:00 PM Daily</li>
              <li>Delivery Perimeter: Strict 4.0 Kilometre Radius</li>
              <li>Storage Discipline: 0°C to 4°C Walk-in Chillers</li>
              <li>Weight Variants: 250g, 500g, 750g, 1000g Net Weight</li>
            </ul>
          </div>

          {/* Col 4: Lead Developer & Architecture Deliverables */}
          <div className="space-y-2">
            <span className="font-semibold text-white uppercase tracking-wider text-[11px] block">
              Engineering Specs
            </span>
            <p className="text-purple-300/80 text-xs">
              Complete Information Architecture, PLP component layout, PostGIS geospatial pseudocode, and recommended cloud stack.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setIsArchitectureOpen(true)}
                className="px-4 min-h-[44px] py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-lg transition-colors cursor-pointer text-xs font-semibold shadow-xs"
              >
                Open Architecture & Logic Specs
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-purple-400 text-[11px] text-center sm:text-left">
          <div>
            © {new Date().getFullYear()} Fish Meat Store. All rights reserved. Sourced responsibly and butchered fresh.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="hover:text-emerald-300 transition-colors cursor-pointer min-h-[44px] sm:min-h-0 inline-flex items-center px-1"
            >
              Store Directory
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsArchitectureOpen(true)}
              className="hover:text-emerald-300 transition-colors cursor-pointer min-h-[44px] sm:min-h-0 inline-flex items-center px-1"
            >
              Technical Sitemap
            </button>
            <span aria-hidden="true">·</span>
            <span>Customer Care: +91 80 4123 7890</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
