import React from "react";

const Embed: React.FC = () => {
  // allow optional stage via ?stage=N and optional ratio via ?ratio=9:16 or ?ratio=10:16
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams('');
  const stage = params.get('stage') || '1';
  const ratioParam = params.get('ratio') || '9:16';
  const src = `${window.location.origin}/?embed=1&stage=${stage}`;

  // parse ratio string like "9:16" -> [9,16] and compute padding-top percentage = (height/width)*100
  const parseRatio = (r: string) => {
    const cleaned = r.replace('/', ':');
    const parts = cleaned.split(':').map((p) => Number(p));
    if (parts.length === 2 && parts.every((n) => Number.isFinite(n) && n > 0)) return parts as [number, number];
    return [9, 16] as [number, number];
  };

  const [rw, rh] = parseRatio(ratioParam);
  const paddingTop = `${(rh / rw) * 100}%`;

  return (
    <div className="w-full h-screen flex items-center justify-center p-2 bg-background">
      <div className="relative" style={{ width: '100%', maxWidth: 420 }}>
        {/* Aspect ratio controlled by ?ratio=WIDTH:HEIGHT (e.g. 9:16 or 10:16) */}
        <div style={{ position: 'relative', paddingTop }}>
          <iframe
            title="LavaSpoon-X Embed"
            src={src}
            allow="geolocation; microphone; camera; fullscreen"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: '0', background: 'transparent' }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">Embed preview — ratio: {rw}:{rh} — use <code>?embed=1&stage=1&ratio={rw}:{rh}</code></p>
      </div>
    </div>
  );
};

export default Embed;
