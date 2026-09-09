import { PNG } from "pngjs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { pngToIco, resizeLogoToIcon } from "@/lib/image";

function wideLogo(): Buffer {
  const png = new PNG({ width: 120, height: 40, colorType: 6 });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 47;
    png.data[i + 1] = 125;
    png.data[i + 2] = 50;
    png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}

describe("Favicon aus dem Logo", () => {
  it("setzt das Logo quadratisch und behält Transparenz", async () => {
    const icon = await resizeLogoToIcon(wideLogo(), 32);
    expect(icon).not.toBeNull();
    const meta = await sharp(icon!).metadata();
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(32);
    expect(meta.format).toBe("png");
    expect(meta.hasAlpha).toBe(true);
  });

  it("packt das PNG in eine ICO-Datei", async () => {
    const icon = await resizeLogoToIcon(wideLogo(), 32);
    const ico = pngToIco(icon!);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(1);
    expect(ico.readUInt8(6)).toBe(32);
    expect(ico.readUInt8(7)).toBe(32);
    expect(ico.subarray(22).equals(icon!)).toBe(true);
  });
});
