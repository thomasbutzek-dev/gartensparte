export default function NewsPinnedField({ defaultChecked = false }: { defaultChecked?: boolean }) {
  return (
    <label className="flex items-start gap-2 text-sm text-stone-700">
      <input type="checkbox" name="pinned" value="1" defaultChecked={defaultChecked} className="mt-0.5" />
      <span>
        <span className="font-medium">Oben halten</span>
        <span className="mt-0.5 block text-stone-500">
          Bleibt auf der Website ganz oben, auch wenn neuere Meldungen kommen.
        </span>
      </span>
    </label>
  );
}
