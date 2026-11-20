import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall, CheckCircle2, Volume2, ShoppingBag } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ROLE_PERMISSIONS } from '../../config/rbac';

const ORDER_ALERT_AUDIO_SRC =
  '/assets/aistudio/scottishperson-sound-effect-old-phone-191761_df4cb6e9.mp3';

export const NewOrderAlertManager: React.FC = () => {
  const navigate = useNavigate();
  const {
    adminUser,
    userRole,
    pendingIncomingOrders,
    acceptOrder,
  } = useStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  const shouldRing =
    Boolean(adminUser && ROLE_PERMISSIONS[userRole].canAccessAdminPortal) &&
    pendingIncomingOrders.length > 0;
  const latestOrder = pendingIncomingOrders[0] || null;

  const tryPlayAlert = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.loop = true;
      await audio.play();
      setNeedsAudioUnlock(false);
    } catch {
      setNeedsAudioUnlock(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (shouldRing) {
      void tryPlayAlert();
    } else {
      audio.pause();
      audio.currentTime = 0;
      setNeedsAudioUnlock(false);
    }
  }, [shouldRing, pendingIncomingOrders.length]);

  // Unlock and resume looping ringtone on next user gesture if browser blocked autoplay
  useEffect(() => {
    if (!shouldRing || !needsAudioUnlock) return;

    const unlock = () => {
      void tryPlayAlert();
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [shouldRing, needsAudioUnlock]);

  // Ensure audio stops cleanly on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  return (
    <>
      <audio
        ref={audioRef}
        src={ORDER_ALERT_AUDIO_SRC}
        loop
        preload="auto"
        aria-hidden="true"
      />

      {shouldRing && latestOrder && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-md z-60 bg-[#1a0833] text-white border-2 border-amber-400 rounded-2xl shadow-2xl p-3.5 sm:p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 animate-bounce shadow-md">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    New Order Alert ({pendingIncomingOrders.length})
                  </span>
                  <span className="text-[10px] font-mono bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">
                    RINGING
                  </span>
                </div>
                <p className="text-xs font-semibold text-white mt-0.5 truncate">
                  #{latestOrder.orderId} · {latestOrder.contactName} · ₹{latestOrder.total}
                </p>
                <p className="text-[11px] text-purple-200 truncate">
                  {latestOrder.store.name} ({latestOrder.items.length} cut
                  {latestOrder.items.length > 1 ? 's' : ''})
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {needsAudioUnlock && (
              <button
                type="button"
                onClick={() => void tryPlayAlert()}
                className="min-h-[44px] sm:min-h-0 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Play Sound</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => acceptOrder(latestOrder.orderId)}
              className="flex-1 min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Accept Order</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/orders')}
              className="min-h-[44px] sm:min-h-0 px-3 py-2 bg-purple-900 hover:bg-purple-800 text-purple-100 border border-purple-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-300" />
              <span>Customer Orders</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
