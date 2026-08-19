import { useRegisterSW } from 'virtual:pwa-register/react';
import { CloudOff, RefreshCw, X } from 'lucide-react';

import { buttonFocusClass } from './controls';

/**
 * Reports the two things a technician needs to know about the offline cache:
 * that it is ready, and that a newer version is waiting.
 *
 * The update is never applied on its own. Reloading mid-plan would be the same
 * class of failure as the autosave that used to overwrite hand-drawn routing.
 */
export default function ServiceWorkerNotice() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  const dismiss = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 sm:bottom-14 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-40 bg-[#161616] border border-[#444] rounded-sm shadow-lg p-4 flex items-start gap-3"
    >
      {needRefresh ? (
        <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 text-[#CCFF00]" aria-hidden="true" />
      ) : (
        <CloudOff className="w-4 h-4 shrink-0 mt-0.5 text-[#CCFF00]" aria-hidden="true" />
      )}

      <div className="flex-1">
        <p className="text-xs text-[#E0E0E0]">
          {needRefresh
            ? 'A new version is ready. Reload when you are between screens — your saved work is kept.'
            : 'Ready to work offline. The whole app is on this device now.'}
        </p>
        {needRefresh && (
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className={`mt-3 px-3 py-2 min-h-11 bg-[#CCFF00] text-black text-[11px] font-bold uppercase tracking-wider rounded-sm hover:bg-[#aacc00] transition-colors ${buttonFocusClass}`}
          >
            Reload now
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className={`text-neutral-400 hover:text-white shrink-0 ${buttonFocusClass}`}
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
