import { useEffect, useState } from 'react';

/** True once `src` has downloaded and decoded (or failed — the app should never hang on an image). */
export function useImageReady(src) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.src = src;
    image
      .decode()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return ready;
}
