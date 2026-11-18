import React, { useState } from 'react';
import { PhoneCall, MessageCircle, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getStoreWhatsAppRaw, getStoreWhatsAppLocal10 } from '../utils/whatsapp';

export const FloatingOrderBar: React.FC = () => {
  const { activeStore } = useStore();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const waRaw = getStoreWhatsAppRaw(activeStore);
  const waLocal = getStoreWhatsAppLocal10(activeStore);
  const waHref = `https://wa.me/${waRaw}?text=${encodeURIComponent(
    `Hi ${activeStore.name}, I would like to order fresh fish and meat`
  )}`;

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 max-w-[calc(100vw-1.5rem)] flex items-center gap-2 animate-bounce-short">
      <div className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 pl-3 sm:pl-3.5 pr-1.5 sm:pr-2 rounded-full shadow-2xl border-2 border-emerald-400 flex items-center gap-1.5 sm:gap-2.5 transition-all">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] sm:min-h-[36px] text-xs sm:text-sm font-extrabold hover:underline whitespace-nowrap"
          title={`Order via WhatsApp or Call (${activeStore.name})`}
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <span className="hidden sm:inline">Order via WhatsApp / Call:</span>
          <span className="font-mono font-black text-white">{waLocal}</span>
        </a>

        <div className="flex items-center gap-1 shrink-0">
          <a
            href={`tel:${waLocal}`}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-white text-emerald-800 flex items-center justify-center hover:bg-emerald-50 transition-transform active:scale-90"
            title={`Call ${waLocal}`}
            aria-label={`Call ${waLocal}`}
          >
            <PhoneCall className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-800" />
          </a>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-emerald-950 text-white flex items-center justify-center hover:bg-black transition-transform active:scale-90"
            title={`Chat on WhatsApp (${waLocal})`}
            aria-label={`Chat on WhatsApp (${waLocal})`}
          >
            <MessageCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-300" />
          </a>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="w-9 h-9 sm:w-6 sm:h-6 rounded-full text-emerald-100 hover:text-white flex items-center justify-center cursor-pointer"
            aria-label="Dismiss quick order floating bar"
          >
            <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
