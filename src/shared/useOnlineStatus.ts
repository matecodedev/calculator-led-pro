import { useEffect, useState } from 'react';

/**
 * Whether the browser currently has a network connection.
 *
 * This is the one status a field tool can honestly report: venues have no
 * usable signal, and a technician needs to know whether what they are looking
 * at came off the network or off the device.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => globalThis.navigator?.onLine ?? true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}
