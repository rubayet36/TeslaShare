'use client';

import dynamic from 'next/dynamic';

const DhakaMapDynamic = dynamic(() => import('./DhakaMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center text-slate-400 space-y-2">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      <span className="text-xs font-medium">Initializing Dhaka Leaflet Map...</span>
    </div>
  ),
});

export default DhakaMapDynamic;
