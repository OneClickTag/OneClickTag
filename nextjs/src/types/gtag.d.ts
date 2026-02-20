/* eslint-disable @typescript-eslint/no-explicit-any */

interface Window {
  dataLayer: Record<string, any>[];
  gtag: (...args: any[]) => void;
}
