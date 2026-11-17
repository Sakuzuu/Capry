import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const maxSize = 3 * 1024 * 1024;
function sameOrigin(request: NextRequest) {
  try { return new URL(request.headers.get("origin") ?? "").host === request.headers.get("host"); } catch { return false; }
}
function imageType(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if ([137,80,78,71,13,10,26,10].every((byte,i) => bytes[i] === byte)) return { mime: "image/png", ext: "png" };
  if (new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "Inicia sesión para subir una portada." }, { status: 401 });
  if (Number(request.headers.get("content-length")) > maxSize + 65536) return NextResponse.json({ error: "La imagen debe pesar menos de 3 MB." }, { status: 413 });
  try {
    // Bound streaming requests too, including clients without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "Falta la imagen." }, { status: 400 });
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let length = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxSize + 65536) { await reader.cancel(); return NextResponse.json({ error: "La imagen debe pesar menos de 3 MB." }, { status: 413 }); }
      chunks.push(new Uint8Array(value));
    }
    const form = await new Response(new Blob(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    const file = form.get("cover");
    if (!(file instanceof File) || file.size === 0 || file.size > maxSize) return NextResponse.json({ error: "Elige una imagen de hasta 3 MB." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = imageType(bytes);
    if (!type || file.type !== type.mime) return NextResponse.json({ error: "Usa una imagen JPG, PNG o WebP válida." }, { status: 400 });
    const path = `${crypto.randomUUID()}.${type.ext}`;
    const { error } = await client.storage.from("event-covers").upload(path, bytes, { contentType: type.mime, cacheControl: "31536000", upsert: false });
    if (error) throw error;
    return NextResponse.json({ path }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "No se pudo subir la portada. Intenta otra vez." }, { status: 503 }); }
}
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const path = request.nextUrl.searchParams.get("path") ?? "";
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path)) return NextResponse.json({ error: "Portada inválida." }, { status: 400 });
  const { error } = await client.storage.from("event-covers").remove([path]);
  return NextResponse.json(error ? { error: "No se pudo retirar la portada." } : { ok: true }, { status: error ? 503 : 200 });
}
