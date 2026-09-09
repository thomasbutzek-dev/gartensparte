import { siteFaviconIco } from "@/lib/site-icon";

export const dynamic = "force-dynamic";

export async function GET() {
  const ico = await siteFaviconIco();
  return new Response(new Uint8Array(ico), {
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=60",
    },
  });
}
