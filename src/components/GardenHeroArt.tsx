/** Dekoratives Anlagenmotiv für den Hero – nur Grafik, kein Foto. */
export default function GardenHeroArt() {
  return (
    <svg
      viewBox="0 0 420 360"
      aria-hidden
      className="pointer-events-none absolute right-[-2rem] top-8 hidden h-[22rem] w-auto opacity-25 md:block lg:right-8 lg:opacity-35"
    >
      <path d="M40 300h340" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M70 300 V210 h90 v90" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M70 210 L115 168 L160 210" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="98" y="248" width="28" height="52" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="84" y="228" width="22" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="250" cy="168" r="46" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="292" cy="188" r="32" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M250 214 V300" stroke="currentColor" strokeWidth="3" />
      <path d="M210 300c8-28 22-44 40-52" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M188 300c4-18 10-28 22-36M318 300c-6-22-4-40 10-54" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M340 300c2-40 18-68 40-86" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="378" cy="198" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="358" cy="214" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
