import { ImageResponse } from "next/og";
import { logoIconPng } from "@/lib/site-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function AppleIcon() {
  const png = await logoIconPng(size.width);
  if (png) {
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2f7d32",
          color: "white",
          fontSize: 110,
          fontWeight: 700,
        }}
      >
        G
      </div>
    ),
    { ...size },
  );
}
