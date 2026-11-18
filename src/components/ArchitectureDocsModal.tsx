import React, { useState } from 'react';
import { X, BookOpen, Layers, Server, MapPin, Database, CheckCircle2, Code2, Cpu } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const SystemSpecsContent: React.FC = () => {
  const [activeDocTab, setActiveDocTab] = useState<'ia_sitemap' | 'ui_layout' | 'tech_stack' | 'geo_logic'>('ia_sitemap');

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white">
      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-200 px-4 sm:px-6 bg-stone-50 overflow-x-auto gap-4 sm:gap-6 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveDocTab('ia_sitemap')}
            className={`min-h-[44px] py-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeDocTab === 'ia_sitemap'
                ? 'border-purple-900 text-purple-950'
                : 'border-transparent text-stone-500 hover:text-purple-900'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>1. Information Architecture & Sitemap</span>
          </button>

          <button
            onClick={() => setActiveDocTab('ui_layout')}
            className={`min-h-[44px] py-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeDocTab === 'ui_layout'
                ? 'border-purple-900 text-purple-950'
                : 'border-transparent text-stone-500 hover:text-purple-900'
            }`}
          >
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span>2. UI Layout (Homepage & PLP)</span>
          </button>

          <button
            onClick={() => setActiveDocTab('tech_stack')}
            className={`min-h-[44px] py-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeDocTab === 'tech_stack'
                ? 'border-purple-900 text-purple-950'
                : 'border-transparent text-stone-500 hover:text-purple-900'
            }`}
          >
            <Server className="w-4 h-4 text-emerald-600" />
            <span>3. Recommended Tech Stack</span>
          </button>

          <button
            onClick={() => setActiveDocTab('geo_logic')}
            className={`min-h-[44px] py-3 border-b-2 cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeDocTab === 'geo_logic'
                ? 'border-purple-900 text-purple-950'
                : 'border-transparent text-stone-500 hover:text-purple-900'
            }`}
          >
            <Code2 className="w-4 h-4 text-emerald-600" />
            <span>4. 4km Radius & Store Logic</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-stone-800 text-xs sm:text-sm leading-relaxed">
          {/* TAB 1: Information Architecture & Sitemap */}
          {activeDocTab === 'ia_sitemap' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-xl font-bold text-stone-900 mb-2">
                  1. Information Architecture (IA) & Multi-Store Flow
                </h3>
                <p className="text-stone-600 text-xs">
                  The architecture is designed around the fundamental constraint that <strong>no central mega-warehouse exists</strong>. Inventory is distributed across localized physical retail stores equipped with walk-in chillers (0°C - 4°C). Every page interaction is scoped to the user’s assigned physical store within a strict 4km delivery radius.
                </p>
              </div>

              {/* Sitemap Chart */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3 font-mono text-xs">
                <div className="font-bold text-purple-900 uppercase">Hierarchical Sitemap Structure:</div>
                <pre className="text-stone-700 whitespace-pre overflow-x-auto text-[11px] leading-5">
{`├── / (Homepage & Hyperlocal Storefront)
│   ├── [Location Entry Gate] -> Geo-Detection / Address Modal -> 4km Radius Validation
│   │   ├── IF Distance <= 4km -> Locks session to Store ID (e.g., Indiranagar Flagship)
│   │   └── IF Distance > 4km  -> Out-of-Area Lead Capture ("Vote for your Locality")
│   ├── Hero Showcase (Cold Chain 0-4°C, 150+ Lab Tests, 45-75 min SLA)
│   ├── Hyperlocal Store Status Indicator (Chiller temp, Live inventory)
│   ├── Primary Category Segmented Bar (Fishes & Seafood, Chicken, Mutton)
│   └── Featured Fresh Cuts Grid with Dynamic Weight Switchers
│
├── /category/:mainCategory (PLP - Product Listing Page)
│   ├── /category/fishes-and-seafood
│   │   ├── ?sub=freshwater   (Rohu Bengali Cut, Catla, Basa Fillet)
│   │   ├── ?sub=seawater     (Silver Pomfret, Kingfish/Surmai, Atlantic Salmon)
│   │   ├── ?sub=prawns       (Sea White Prawns, Jumbo Black Tiger Prawns)
│   │   └── ?sub=crabs        (Live Mud Crabs, Blue Swimmer Crabs)
│   ├── /category/chicken (All Chicken)
│   │   ├── ?sub=curry-cut      (Curry Cut: With Skin, Without Skin)
│   │   ├── ?sub=boneless-mince (Boneless & Mince: Prime Breast Fillet, Fine Keema)
│   │   ├── ?sub=specialty-cuts (Specialty Cuts: Naati Koli Country Chicken, Soup Bones)
│   │   ├── ?sub=offals         (Offals: Fresh Liver, Deep Cleaned Gizzard)
│   │   └── ?sub=premium-cuts   (Premium Cuts: Juicy Drumsticks, Whole Leg with Thigh)
│   └── /category/mutton
│       ├── ?sub=curry-cut    (Goat Ribs, Chops, Shoulder Mix)
│       ├── ?sub=goat-leg     (Marrow Bone Raan Cut for Biryani)
│       ├── ?sub=goat-shoulder(Collagen Rich Dasti Cut for Rogan Josh)
│       ├── ?sub=goat-boneless(100% Lean Cubes, Zero Bone)
│       ├── ?sub=goat-liver   (Buttery Fresh Kaleji)
│       └── ?sub=mutton-paya  (Flame-torched, Scraped Trotters)
│
├── /product/:productId (PDP - Product Detail Modal / Page)
│   ├── High-Resolution Cold Meat / Seafood Photography
│   ├── Weight Selector (250g, 500g, 750g, 1kg) with Dynamic Price Update
│   ├── Net vs. Gross Weight Breakdown & Pieces / Servings Estimator
│   ├── Custom Order Butchery Preferences (Curry Cut, Biryani Cut, Small Pieces)
│   └── Real-time Local Store Inventory Counter
│
├── /cart (Slide-Out Cart Drawer)
│   ├── Itemized Cuts + Custom Butchery Notes
│   ├── Dynamic Delivery Slot Picker (Express 45-75m vs Scheduled Tomorrow)
│   └── Free Delivery Progress Bar (Threshold ₹499)
│
├── /checkout (Hyperlocal Single-Page Checkout)
│   ├── Store Address Conformance Verification (within 4km)
│   ├── Recipient Name & Phone Number for Chilled Delivery OTP
│   └── Payment: UPI (GPay/PhonePe), Cash on Delivery (COD), Card
│
├── /auth (Dual-Login Gateway)
│   ├── [Customer Route] -> Mobile-first, passwordless OTP (+91 10-digit input, 30s timer, auto-reading 6-digit OTP, fast onboarding)
│   └── [Admin Route]    -> Desktop-first corporate security (Work email, CapsLock check, 3-attempt lockout, mandatory TOTP MFA, SOC2 timeout)
│
├── /admin/control-room (Real-Time Inventory & Stock Control Room)
│   ├── [KPI Metrics Bar] -> Total SKUs, Out of Stock (Red Alert), Low Stock (Amber), Expiry Hazards (<48h)
│   ├── [Real-Time Stock Grid] -> Live batch tracking, search-as-you-type, category filters, multi-select batch actions
│   ├── [Inbound Intake Drawer] -> Vendor procurement, Gross vs Net yield, Cold-chain check (>4°C alert), Barcode label generator
│   ├── [Smart Reorder & POs] -> Threshold triggers, velocity trend recommendation, 1-click EDI PO dispatch
│   └── [Waste & Shrinkage Log] -> Perishable write-off logging with mandatory reason codes & root-cause analytics
│
└── /order/track/:orderId (Live Cold-Chain Tracking)
    ├── Chiller Temperature Log (e.g. 1.8°C monitored)
    ├── Multi-Step Timeline: Placed -> Store Allocated -> Butchered & Sealed -> Out for Delivery -> Delivered
    └── Direct Contact to Local Store Master Butcher`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: UI Layout Description */}
          {activeDocTab === 'ui_layout' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-xl font-bold text-stone-900 mb-2">
                  2. Component-by-Component UI Layout Description
                </h3>
                <p className="text-stone-600 text-xs">
                  Detailed breakdown of the Homepage and Product Listing Page (PLP) designed specifically for raw meat and seafood retail with Licious-inspired aesthetics.
                </p>
              </div>

              {/* Homepage Layout */}
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 space-y-3">
                <h4 className="font-bold text-purple-950 text-sm">A. Homepage Component Breakdown</h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <strong className="text-stone-900">1. Top Navigation Bar (Header)</strong>
                    <p className="text-stone-500 mt-0.5">
                      Adheres to the Top Bar Contract. Zone 1: "Fish Meat Store" single wordmark in dark purple. Zone 2: Clean single-line links for Fishes & Seafood, Chicken, Mutton, Stores, and Architecture Specs. Zone 3: Hyperlocal Delivery Target badge showing current distance (e.g., "Indiranagar · 0.7 km away") and Cart count badge in fresh emerald green.
                    </p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <strong className="text-stone-900">2. Cold-Chain Trust Banner</strong>
                    <p className="text-stone-500 mt-0.5">
                      Subtle dark purple strip reminding customers of the unbroken 0°C to 4°C temperature discipline, active store chiller telemetry, and 4km hyperlocal radius limit.
                    </p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <strong className="text-stone-900">3. Hero Banner & Hyperlocal Proof</strong>
                    <p className="text-stone-500 mt-0.5">
                      Split-screen layout in rich royal purple: Left column features bold display typography ("The Absolute Standard in Fresh Fish & Raw Meat"), search bar with instant filter, and 4 claim-to-proof items (0-4°C chill, 45-75m delivery, 150+ safety tests, 4km boundary). Right column shows high-resolution commercial overhead photograph of fresh cuts on ice with real-time chiller temp badge.
                    </p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <strong className="text-stone-900">4. Category & Subcategory Segmented Bar</strong>
                    <p className="text-stone-500 mt-0.5">
                      Sticky segmented control with dark purple active tabs enabling seamless switching between All Cuts, Fishes & Seafood, Chicken, and Mutton. When a category is active, secondary subcategory chips render immediately underneath with fresh emerald active state.
                    </p>
                  </div>
                </div>
              </div>

              {/* PLP Layout */}
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 space-y-3">
                <h4 className="font-bold text-purple-950 text-sm">B. Product Listing Page (PLP) & Card Specification</h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <strong className="text-stone-900">Product Card Hierarchy:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-stone-600">
                      <li><strong>Image Container (65% height):</strong> High-definition photography on neutral stone backdrop with subtle hover zoom, dark purple subcategory tag, and chiller temp indicator.</li>
                      <li><strong>100% Fresh Cut-to-Order:</strong> Guarantee that products are never packed in advance in the retail store; each cut is prepared fresh upon order placement.</li>
                      <li><strong>Zero-Pill Metadata Line:</strong> Clean inline text with bullet separators (e.g. <code>Serves 2-3 · 10-12 pcs · Cleaned & Gutted</code>). No garish candy badges.</li>
                      <li><strong>Product Title & Description:</strong> Bold 16px display font with 2-line appetizing cut notes.</li>
                      <li><strong>Price & Add to Cart:</strong> Large tabular price (e.g. <code>₹340</code>) alongside per-kg reference, and responsive emerald "Add Cut" button with confirmation feedback. When an item is marked out of stock by an admin, the Add button is disabled with <code>cursor-not-allowed</code> and displays a prominent <strong>"Out Of Stock"</strong> message on mouseover.</li>
                    </ul>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <strong className="text-stone-900">Slide-Out Cart & Cutting Preferences Drawer:</strong>
                    <p className="text-stone-500 mt-0.5">
                      Slide-out drawer containing live inventory validation against the assigned store, weight selection breakdown, inline custom cutting notes (e.g. "Make pieces small", "Send extra soup bones"), and dynamic delivery slot picker.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dual-Login Architecture */}
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 space-y-3">
                <h4 className="font-bold text-purple-950 text-sm">C. Dual-Login Security & UX Architecture</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-1.5">
                    <div className="font-bold text-purple-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>1. Customer Login (Mobile-First, Low Friction)</span>
                    </div>
                    <ul className="list-disc list-inside text-stone-600 space-y-1 text-[11px]">
                      <li>Split-screen desktop with fresh cuts imagery / Full-screen mobile view.</li>
                      <li>Country code selector (+91 default) with 10-digit auto numeric keypad (`inputMode="numeric"`).</li>
                      <li>Auto-reading 6-digit OTP verification with 30s countdown timer and disabled-until-timeout resend.</li>
                      <li>Instant auto-advancing focus, paste splitting, and inline regex validation.</li>
                      <li>Secondary route for Email / Social authentication and new user ₹200 onboarding.</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-1.5">
                    <div className="font-bold text-purple-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-900" />
                      <span>2. Admin Operations Portal (High-Security)</span>
                    </div>
                    <ul className="list-disc list-inside text-stone-600 space-y-1 text-[11px]">
                      <li>Professional, strict, enterprise-grade dark card interface (`bg-[#120524]`) with zero food imagery.</li>
                      <li>Corporate credentials (`@fishmeatstore.com`) with Caps Lock event listener (`getModifierState`).</li>
                      <li>Strict 3-failed-attempt lockout warning system triggering a 60-second terminal freeze and Infosec log.</li>
                      <li>Mandatory Multi-Factor Authentication (MFA) via 6-digit TOTP / FIDO2 security keys.</li>
                      <li>Enforced 15-minute inactivity session auto-logout under SOC2 Type II compliance.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Tech Stack */}
          {activeDocTab === 'tech_stack' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-xl font-bold text-stone-900 mb-2">
                  3. Recommended Production Tech Stack
                </h3>
                <p className="text-stone-600 text-xs">
                  Optimized for low-latency location matching, multi-store real-time inventory locking, and high-conversion e-commerce.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Frontend */}
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-purple-950 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span>Frontend Architecture</span>
                  </div>
                  <ul className="space-y-1.5 text-stone-600">
                    <li><strong>Framework:</strong> React 19 + TypeScript on Vite (or Next.js 15 App Router with SSR for SEO).</li>
                    <li><strong>Styling:</strong> Tailwind CSS v4 with dark and light purple surfaces and emerald green accents.</li>
                    <li><strong>State Management:</strong> Zustand or React Context for client-side geolocation, cart state, and local store locking.</li>
                    <li><strong>Icons & Motion:</strong> Lucide React for crisp interactive affordances; Motion for slide-out drawers and micro-interactions.</li>
                  </ul>
                </div>

                {/* Backend */}
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-purple-950 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span>Backend & API Services</span>
                  </div>
                  <ul className="space-y-1.5 text-stone-600">
                    <li><strong>Runtime:</strong> Node.js (Fastify / Express) or Go microservices for ultra-fast response times (&lt;30ms).</li>
                    <li><strong>Hyperlocal Routing Engine:</strong> PostGIS spatial queries (<code>ST_DWithin</code> with spherical distance) to identify stores within 4,000 meters in ~2ms.</li>
                    <li><strong>Inventory Lock Engine:</strong> Redis distributed locks (Redlock) to hold item batches during checkout without race conditions.</li>
                    <li><strong>Real-time Telemetry:</strong> WebSockets / MQTT for IoT walk-in chiller temperature sensor monitoring.</li>
                  </ul>
                </div>

                {/* Database */}
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-purple-950 text-sm">
                    <Database className="w-4 h-4 text-purple-900" />
                    <span>Database Architecture</span>
                  </div>
                  <ul className="space-y-1.5 text-stone-600">
                    <li><strong>Primary RDBMS:</strong> PostgreSQL with PostGIS extension for spatial geospatial geometries (<code>ST_Point</code>, spatial indexing <code>GIST</code>).</li>
                    <li><strong>Cache & Sessions:</strong> Redis for geospatial radius cache (<code>GEORADIUS</code>) and active shopping carts.</li>
                    <li><strong>Schema Partitioning:</strong> Store-partitioned inventory tables so stock updates at Store A never lock queries at Store B.</li>
                  </ul>
                </div>

                {/* Mapping & Location APIs */}
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-purple-950 text-sm">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>Mapping & Geocoding APIs</span>
                  </div>
                  <ul className="space-y-1.5 text-stone-600">
                    <li><strong>Client Address Lookup:</strong> Google Places Autocomplete API with session tokens to minimize query costs.</li>
                    <li><strong>Reverse Geocoding:</strong> Google Geocoding API for GPS coordinates to formatted street address.</li>
                    <li><strong>Distance Matrix:</strong> Google Distance Matrix API (traffic-aware driving distance) as a secondary validation to the primary straight-line Haversine filter.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 4km Logic & Pseudocode */}
          {activeDocTab === 'geo_logic' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-xl font-bold text-stone-900 mb-2">
                  4. Step-by-Step Logic & Pseudocode for 4km Radius Check
                </h3>
                <p className="text-stone-600 text-xs">
                  Here is the exact algorithmic workflow and database queries used to match customers to the nearest physical retail store within 4.0 km.
                </p>
              </div>

              {/* Workflow Steps */}
              <div className="space-y-3">
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <strong className="text-purple-950 font-bold block mb-1">
                    Step 1: Location Capture
                  </strong>
                  <p className="text-stone-600 text-xs">
                    Trigger HTML5 Geolocation API (<code>navigator.geolocation.getCurrentPosition</code>) or user input via Google Places Autocomplete. Extract precision coordinates: <code>(latitude, longitude)</code>.
                  </p>
                </div>

                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <strong className="text-purple-950 font-bold block mb-1">
                    Step 2: Spatial Proximity Query (PostGIS / Haversine)
                  </strong>
                  <p className="text-stone-600 text-xs">
                    Evaluate distances to all active physical stores using great-circle distance. Find the store with minimum distance: <code>d_min = min(distance(user, store_i))</code>.
                  </p>
                </div>

                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <strong className="text-purple-950 font-bold block mb-1">
                    Step 3: 4.0 km Boundary Evaluation
                  </strong>
                  <ul className="list-disc list-inside text-stone-600 text-xs mt-1 space-y-1">
                    <li><strong>Case A (d_min &le; 4.0 km):</strong> User is approved for delivery. Assign <code>activeStoreId = store.id</code>, lock catalog to that store's live batch inventory, and display 45-75 min express delivery slot.</li>
                    <li><strong>Case B (d_min &gt; 4.0 km):</strong> Delivery cannot be completed while preserving the cold chain. Render polite out-of-area modal, prompt email/phone lead capture to vote for their locality, and allow previewing demo stores.</li>
                  </ul>
                </div>
              </div>

              {/* Code Snippets */}
              <div className="space-y-3 font-mono text-xs">
                <div className="font-bold text-stone-900">A. SQL PostGIS Production Query:</div>
                <div className="bg-[#18082e] text-purple-100 p-4 rounded-xl overflow-x-auto text-[11px] leading-relaxed border border-purple-900/60">
{`-- Find the nearest active store within 4,000 meters (4km)
SELECT 
  id,
  name,
  address,
  chiller_temp_c,
  ST_Distance(
    geom::geography, 
    ST_SetSRID(ST_MakePoint($user_lon, $user_lat), 4326)::geography
  ) / 1000.0 AS distance_km
FROM stores
WHERE is_active = true
  AND ST_DWithin(
    geom::geography, 
    ST_SetSRID(ST_MakePoint($user_lon, $user_lat), 4326)::geography, 
    4000.0 -- 4,000 meters threshold
  )
ORDER BY distance_km ASC
LIMIT 1;`}
                </div>

                <div className="font-bold text-stone-900 mt-4">B. TypeScript / Node.js Haversine Fallback:</div>
                <div className="bg-[#18082e] text-purple-100 p-4 rounded-xl overflow-x-auto text-[11px] leading-relaxed border border-purple-900/60">
{`function findNearestStore(userLat: number, userLon: number, maxRadiusKm = 4.0) {
  const R = 6371; // Earth radius in km
  let closestStore = null;
  let minDistance = Infinity;

  for (const store of PHYSICAL_STORES) {
    const dLat = (store.latitude - userLat) * (Math.PI / 180);
    const dLon = (store.longitude - userLon) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(userLat * (Math.PI / 180)) *
      Math.cos(store.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
    const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (distanceKm < minDistance) {
      minDistance = distanceKm;
      closestStore = store;
    }
  }

  return {
    store: closestStore,
    distanceKm: Math.round(minDistance * 10) / 10,
    isWithinRange: minDistance <= maxRadiusKm,
  };
}`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

export const ArchitectureDocsModal: React.FC = () => {
  const { isArchitectureOpen, setIsArchitectureOpen } = useStore();

  if (!isArchitectureOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-stone-950/80 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-purple-900/60 flex items-center justify-between bg-[#21093b] text-white gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 bg-purple-900 text-emerald-300 rounded-lg border border-purple-700/60 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold font-display text-white">
                Fish Meat Store — Architecture, UI/UX & Engineering Specifications
              </h2>
              <p className="text-xs text-purple-200">
                A Franchise of FreshToHome · Licious-inspired retail e-commerce architecture with 4km store-to-door hyperlocal routing
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsArchitectureOpen(false)}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg bg-purple-900/60 text-purple-200 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Close specifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <SystemSpecsContent />

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500 shrink-0">
          <span>Fish Meat Store Architectural Specification</span>
          <button
            onClick={() => setIsArchitectureOpen(false)}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 bg-purple-950 hover:bg-purple-900 text-white font-medium rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Close & Back to Storefront
          </button>
        </div>
      </div>
    </div>
  );
};
