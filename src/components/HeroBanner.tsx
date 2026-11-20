import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ThermometerSnowflake,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { MainCategory } from '../types';

import { Fish360Viewer } from './Fish360Viewer';

interface RotationalImage {
  src: string;
  alt: string;
  badge: string;
  categoryTag: string;
  category: MainCategory;
}

const ROTATIONAL_IMAGES: RotationalImage[] = [
  {
    src: '/assets/aistudio/image_e75f641f_037683bf.jpg',
    alt: 'Fresh Coastal Seafood Catch - Wild Fish, Crab & Prawns on Crushed Ice',
    badge: 'Deep-Sea Catch',
    categoryTag: 'Fishes & Seafood',
    category: 'FISHES & SEAFOOD',
  },
  {
    src: '/assets/aistudio/image_71a5ee63.jpg',
    alt: 'Tender Antibiotic-Free Poultry - Wholesome Meals',
    badge: '100% Antibiotic-Free',
    categoryTag: 'Fresh Poultry',
    category: 'CHICKEN',
  },
  {
    src: '/assets/aistudio/image_b2c4b106_6ebf9e06.jpg',
    alt: 'Pasture Grazed Goats at Sunrise - Responsibly Sourced Tender Mutton',
    badge: 'Pasture Grazed',
    categoryTag: 'Tender Mutton',
    category: 'MUTTON',
  },
];

export const HeroBanner: React.FC = () => {
  const {
    activeStore,
    setIsLocationModalOpen,
    searchQuery,
    setSelectedCategory,
    setSelectedSubcategory,
    setShowFavoritesOnly,
  } = useStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const isSearching = searchQuery.length > 0;

  // 3-second rotational timer
  useEffect(() => {
    if (isPaused || isSearching) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % ROTATIONAL_IMAGES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused, isSearching]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + ROTATIONAL_IMAGES.length) % ROTATIONAL_IMAGES.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % ROTATIONAL_IMAGES.length);
  };

  const handleSlideCategoryClick = (category: MainCategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory('ALL');
    setShowFavoritesOnly(false);
    const catalogEl = document.getElementById('fresh-catalog-grid');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const claimTags = (
    <div className="flex flex-wrap items-center justify-center gap-1.5 w-full text-xs text-purple-200">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/70 border border-purple-800/60 text-emerald-300 font-medium text-[11px]">
        <ThermometerSnowflake className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>0°C - 4°C Chill</span>
      </div>

      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/70 border border-purple-800/60 text-emerald-300 font-medium text-[11px]">
        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>30-45 Mins</span>
      </div>

      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/70 border border-purple-800/60 text-emerald-300 font-medium text-[11px]">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>150+ Tests</span>
      </div>

      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/70 border border-purple-800/60 text-emerald-300 font-medium text-[11px]">
        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Strict 4km</span>
      </div>
    </div>
  );

  const assignedStoreBadge = (
    <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3 py-1.5 sm:py-1 bg-purple-950/80 border border-purple-700/60 rounded-lg text-xs text-purple-200 max-w-full">
      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <span>
        Assigned Store: <strong className="text-white">{activeStore.name}</strong>
      </span>
      <span aria-hidden="true" className="text-purple-600">·</span>
      <button
        type="button"
        onClick={() => setIsLocationModalOpen(true)}
        className="text-emerald-300 hover:text-emerald-200 underline font-semibold cursor-pointer min-h-[36px] sm:min-h-0 inline-flex items-center"
      >
        Change (Within 4km)
      </button>
    </div>
  );

  return (
    <section className="bg-[#18082e] text-white relative overflow-hidden border-b border-purple-900/50">
      <div className={`max-w-7xl mx-auto px-3 sm:px-6 ${isSearching ? 'py-2.5 sm:py-3' : 'py-4 sm:py-5 lg:py-6'}`}>
        {/* Top Animation Section: 360-Degree Fish Rotation Viewer (Left) + Sliding Category Showcase (Right) */}
        {!isSearching ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-center">
            {/* Left Column: Interactive 360-Frame 360-Degree Fish School Viewer */}
            <div className="lg:col-span-7 w-full">
              <Fish360Viewer />
            </div>

            {/* Right Image Showcase Column with Core Tags Above & Rotational Sliding Animation */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center w-full">
              <div className="w-full mx-auto space-y-2.5 flex flex-col items-center">
                {/* 4 Core Brand Claims directly above the sliding image */}
                {claimTags}

                <div
                  className="w-full relative rounded-2xl overflow-hidden border border-purple-800/80 shadow-2xl bg-purple-950 aspect-[16/9] group"
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                >
                  {/* Stacked Rotating Images with smooth Cross-Fade */}
                  {ROTATIONAL_IMAGES.map((img, idx) => {
                    const isActive = idx === currentImageIndex;
                    return (
                      <div
                        key={img.src}
                        role="button"
                        tabIndex={isActive ? 0 : -1}
                        aria-label={`Open ${img.categoryTag} category`}
                        title={`Click to browse ${img.categoryTag}`}
                        onClick={() => handleSlideCategoryClick(img.category)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSlideCategoryClick(img.category);
                          }
                        }}
                        className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                          isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                        }`}
                      >
                        <img
                          src={img.src}
                          alt={img.alt}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                        {/* Category Pill Tag for context */}
                        <div className="absolute bottom-2.5 left-2.5 z-20">
                          <div className="bg-[#1c0836]/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-purple-700/80 text-[10px] text-purple-200 shadow-md flex items-center gap-1.5 group-hover:border-emerald-400/70 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-white font-semibold">{img.categoryTag}</span>
                            <span className="text-purple-400">·</span>
                            <span className="text-emerald-300">{img.badge}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Persistent Top Badges */}
                  <div className="pointer-events-none absolute top-2.5 left-2.5 z-20">
                    <div className="bg-[#1c0836]/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-purple-700/80 text-[10px] text-purple-200 shadow-md">
                      <span className="text-emerald-300 font-medium">Hyperlocal Hub: </span>
                      <span className="font-semibold text-white">{activeStore.neighborhood}</span>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute top-2.5 right-2.5 z-20">
                    <div className="bg-[#1c0836]/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-purple-700/80 flex items-center gap-1.5 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-semibold text-white">Chilled at {activeStore.chillerTempC}°C</span>
                    </div>
                  </div>

                  {/* Prev / Next Manual Controls */}
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous image"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-2 sm:p-1.5 rounded-full bg-[#18082e]/85 text-white hover:bg-purple-900 border border-purple-600/70 opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next image"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-2 sm:p-1.5 rounded-full bg-[#18082e]/85 text-white hover:bg-purple-900 border border-purple-600/70 opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>

                  {/* Pagination Dots with 3s active progress */}
                  <div className="absolute bottom-2.5 right-2.5 z-30 flex items-center gap-1.5 bg-[#1c0836]/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-purple-700/70">
                    {ROTATIONAL_IMAGES.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(idx);
                        }}
                        aria-label={`Jump to slide ${idx + 1}`}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === currentImageIndex ? 'w-4 bg-emerald-400' : 'w-1.5 bg-purple-400/60 hover:bg-white'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Tagline & Assigned Store directly below sliding image */}
                <div className="w-full text-center pt-1 pb-0 flex flex-col items-center justify-center">
                  <p className="font-display text-lg sm:text-xl font-black tracking-wide text-emerald-400 drop-shadow-sm text-center">
                    &ldquo;100% Fresh, 0% Chemicals&rdquo;
                  </p>
                  <p className="text-[11px] text-purple-300/90 font-medium mt-0.5 text-center">
                    Never packed in advance · Cut fresh upon your order
                  </p>
                  <div className="mt-2.5 flex justify-center w-full">
                    {assignedStoreBadge}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center">{assignedStoreBadge}</div>
            <div className="shrink-0">{claimTags}</div>
          </div>
        )}
      </div>
    </section>
  );
};
