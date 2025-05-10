'use client';

import dynamic from 'next/dynamic';

// Dynamically import the SomaCube component with no SSR
const SomaCube = dynamic(() => import('./SomaCube'), {
  ssr: false
});

export default function SomaCubeGame() {
  return (
    <div className="min-h-screen bg-gray-100">
      <SomaCube />
    </div>
  );
} 