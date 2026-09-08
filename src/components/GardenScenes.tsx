import type { VereinsSettings } from "@/lib/settings";
import { photoMuted, photoScrim, photoText } from "@/lib/ui";

const arts = [
  <svg key="parzelle" viewBox="0 0 160 110" aria-hidden className="h-full w-full text-green-800">
    <rect x="18" y="48" width="52" height="40" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M18 48 L44 26 L70 48" fill="none" stroke="currentColor" strokeWidth="3" />
    <rect x="36" y="64" width="14" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M92 88 V52" stroke="currentColor" strokeWidth="3" />
    <circle cx="92" cy="40" r="16" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M118 88c8-18 18-26 30-28" fill="none" stroke="currentColor" strokeWidth="2.5" />
  </svg>,
  <svg key="gelaende" viewBox="0 0 160 110" aria-hidden className="h-full w-full text-green-800">
    <path d="M12 78 C48 58, 80 98, 148 70" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M28 88 C60 70, 96 104, 140 84" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="58" y="28" width="44" height="28" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M58 28 L80 12 L102 28" fill="none" stroke="currentColor" strokeWidth="3" />
  </svg>,
  <svg key="verein" viewBox="0 0 160 110" aria-hidden className="h-full w-full text-green-800">
    <path d="M20 72 h120" stroke="currentColor" strokeWidth="3" />
    <path d="M36 72 V44 M60 72 V38 M84 72 V44 M108 72 V38 M132 72 V44" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="48" cy="28" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="112" cy="24" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M36 88c6-10 16-10 22 0M100 88c6-10 16-10 22 0" fill="none" stroke="currentColor" strokeWidth="2.5" />
  </svg>,
];

export function sceneCardsFromSettings(settings: VereinsSettings) {
  return [
    { title: settings.scene1Title, text: settings.scene1Text, image: settings.scene1Image, slot: 1 },
    { title: settings.scene2Title, text: settings.scene2Text, image: settings.scene2Image, slot: 2 },
    { title: settings.scene3Title, text: settings.scene3Text, image: settings.scene3Image, slot: 3 },
  ]
    .map((card, index) => ({ ...card, art: arts[index] }))
    .filter((card) => card.title || card.text || card.image);
}

export default function GardenScenes({ settings }: { settings: VereinsSettings }) {
  const scenes = sceneCardsFromSettings(settings);
  if (scenes.length === 0) return null;

  return (
    <section className="bg-stone-50 py-10">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 sm:grid-cols-3">
        {scenes.map((scene) => (
          <article
            key={scene.slot}
            className="relative min-h-56 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"
          >
            {scene.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/kachel/${scene.slot}`} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-green-50 px-6 pt-8">
                <div className="h-24 w-full">{scene.art}</div>
              </div>
            )}
            <div className={`relative flex h-full min-h-56 flex-col justify-end p-6 ${scene.image ? `${photoScrim} ${photoText}` : "text-sparte-deep"}`}>
              {scene.title ? <h2 className="font-semibold">{scene.title}</h2> : null}
              {scene.text ? (
                <p className={`mt-2 text-sm ${scene.image ? photoMuted : "text-stone-600"}`}>{scene.text}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
