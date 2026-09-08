import { gardenAttributeOptions } from "@/lib/garden-attributes";
import { input, label } from "@/lib/ui";

export default function GardenMerkmaleFields({ selected }: { selected: string[] }) {
  const options = gardenAttributeOptions();
  return (
    <div>
      <p className={label}>Merkmale</p>
      <div className="space-y-1.5">
        {options.map((item) => (
          <label key={item.value} className="flex items-center gap-2 text-sm text-stone-800">
            <input type="checkbox" name="attribute" value={item.value} defaultChecked={selected.includes(item.value)} />
            {item.label}
          </label>
        ))}
      </div>
      <input id="newAttribute" name="newAttribute" className={`${input} mt-2`} placeholder="Weiteres Merkmal, z.B. Wildwuchs" />
    </div>
  );
}
