'use client';
declare global {
  interface Window {
    monroneylabels?: {
      begin: () => void;
      url: (vin: string, vendor: string) => string;
      fillStickers: (tag?: string) => void;
      shouldShowSticker: (vin: string, year: string | number, make: string) => boolean;
    };
  }
}



import { useEffect, useState } from 'react';

interface MonroneyStickerProps {
  year: string;
  make: string;
  vin: string;
  vendorId?: string;
}

export function MonroneySticker({ year, make, vin, vendorId = "MonroneyLabelsTest" }: MonroneyStickerProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  useEffect(() => {
    // Check if script is already loaded
    const existingScript = document.querySelector('script[src="https://labels-prod.s3.amazonaws.com/icon.js"]');
    if (existingScript) {
      setIsScriptLoaded(true);
      if (window.monroneylabels && typeof window.monroneylabels.begin === 'function') {
        window.monroneylabels.begin();
      }
      return;
    }

    // Load the vendor script dynamically
    const script = document.createElement('script');
    script.src = '/monroney-icon.js';
    script.type = 'text/javascript';
    script.defer = true;
    script.async = true;
    script.setAttribute('data-monroney-labels', 'true');

    const handleLoad = () => {
      setIsScriptLoaded(true);
      if (window.monroneylabels && typeof window.monroneylabels.begin === 'function') {
        window.monroneylabels.begin();
      }
    };

    const handleError = (error: ErrorEvent) => {
      console.error('Error loading Monroney script:', error);
      setScriptError('Failed to load Monroney script');
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (isScriptLoaded && window.monroneylabels && typeof window.monroneylabels.begin === 'function') {
      window.monroneylabels.begin();
    }
  }, [isScriptLoaded]);

  if (scriptError) {
    return <div className="text-red-500">Error: {scriptError}</div>;
  }

  return (
    <div className="monroney-container" style={{ width: '100%', height: '100%', minHeight: '50px' }}>
      <span 
        className="monroney-labels" 
        data-year={year}
        data-make={make.toLowerCase()}
        data-vin={vin}
        data-vendor-id={vendorId}
        data-target="_blank"
      >Window Sticker</span>
    </div>
  );
}