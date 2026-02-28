import { useEffect, useRef } from "react";

type Params = {
  enabled?: boolean;
  minLength?: number;
  maxInterKeyDelayMs?: number;
  onScan: (code: string) => void;
};

// Handles USB/Bluetooth barcode scanners working as keyboard wedge.
// A scan is considered valid when keys come quickly and end with Enter.
export const useBarcodeScanner = ({
  enabled = true,
  minLength = 6,
  maxInterKeyDelayMs = 65,
  onScan,
}: Params) => {
  const bufferRef = useRef("");
  const lastTsRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      bufferRef.current = "";
      lastTsRef.current = 0;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const now = Date.now();
      const delta = now - lastTsRef.current;
      const key = event.key;

      if (key === "Escape") {
        reset();
        return;
      }

      if (key === "Enter") {
        const code = bufferRef.current.trim();
        if (code.length >= minLength) {
          onScan(code);
          event.preventDefault();
        }
        reset();
        return;
      }

      if (key.length !== 1) {
        if (key === "Backspace") reset();
        return;
      }

      // If typing speed is too slow, start a new capture window.
      if (delta > maxInterKeyDelayMs) {
        bufferRef.current = "";
      }

      bufferRef.current += key;
      lastTsRef.current = now;
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, maxInterKeyDelayMs, minLength, onScan]);
};
