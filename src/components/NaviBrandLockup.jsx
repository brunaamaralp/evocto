import React from 'react';

/** Stub brand lockup — Evocto uses its own branding. */
export default function NaviBrandLockup({ className = '' }) {
  return (
    <div className={className} style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
      Evocto
    </div>
  );
}
