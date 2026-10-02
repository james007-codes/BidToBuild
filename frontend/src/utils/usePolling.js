import { useEffect, useRef } from "react";

// Calls fn now and then every `ms` while the tab is visible. Re-runs when deps change.
export function usePolling(fn, ms, deps = []) {
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    saved.current();
    if (!ms) return undefined;

    const id = setInterval(() => {
      if (document.visibilityState === "visible") saved.current({ silent: true });
    }, ms);

    return () => clearInterval(id);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

export default usePolling;
