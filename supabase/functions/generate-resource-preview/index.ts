/**
 * Avery Institute preview service — Version 4 renderer repair.
 * Private PDFs remain in resource-files. Only permanently watermarked JPEGs
 * are written to the public resource-thumbnails bucket.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { PDFiumLibrary } from "npm:@hyzyla/pdfium@2.1.13"
import jpeg from "npm:jpeg-js@0.4.4"
const MAX_PREVIEW_PAGES = 12
const MAX_PREVIEW_WIDTH = 960
const MAX_JPEG_BYTES = 4_500_000
const APP_ORIGINS = new Set([
  "https://averyinsti-qnbmu2v8.manus.space",
  "http://localhost:3000",
])

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin && APP_ORIGINS.has(origin)
      ? origin
      : "https://averyinsti-qnbmu2v8.manus.space",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
}

function respond(body: Record<string, unknown>, status: number, origin: string | null) {
  return Response.json(body, { status, headers: corsHeaders(origin) })
}

const GLYPHS: Record<string, string[]> = {
  " ": ["000", "000", "000", "000", "000", "000", "000"], "-": ["000", "000", "000", "111", "000", "000", "000"], ".": ["000", "000", "000", "000", "000", "110", "110"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"], B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"], C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"], D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"], E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"], F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"], G: ["01111", "10000", "10000", "10111", "10001", "10001", "01110"], H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"], I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"], J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"], K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"], L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"], M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"], N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"], O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"], P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"], Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"], R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"], S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"], T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"], U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"], V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"], W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"], X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"], Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"], Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
}

function blend(data: Uint8Array, index: number, red: number, green: number, blue: number, alpha: number) {
  data[index] = Math.round(data[index] * (1 - alpha) + red * alpha)
  data[index + 1] = Math.round(data[index + 1] * (1 - alpha) + green * alpha)
  data[index + 2] = Math.round(data[index + 2] * (1 - alpha) + blue * alpha)
  data[index + 3] = 255
}

function drawText(data: Uint8Array, width: number, height: number, text: string, x: number, y: number, scale: number) {
  let cursor = x
  for (const character of text) {
    const glyph = GLYPHS[character] || GLYPHS[" "]
    for (let row = 0; row < glyph.length; row += 1) for (let column = 0; column < glyph[row].length; column += 1) {
      if (glyph[row][column] !== "1") continue
      for (let dy = 0; dy < scale; dy += 1) for (let dx = 0; dx < scale; dx += 1) {
        const px = cursor + column * scale + dx
        const py = y + row * scale + dy
        if (px >= 0 && px < width && py >= 0 && py < height) blend(data, (py * width + px) * 4, 93, 25, 8, 0.82)
      }
    }
    cursor += (glyph[0].length + 1) * scale
  }
}

function watermarkAndEncodeJpeg(rgba: Uint8Array, width: number, height: number, pageNumber: number): Uint8Array {
  const pixels = new Uint8Array(rgba)
  for (let index = 0; index < pixels.length; index += 4) blend(pixels, index, 255, 255, 255, 0.10)
  const scale = Math.max(3, Math.floor(width / 180))
  const lines = ["AVERY INSTITUTE", "PREVIEW ONLY", "AVERYSINSTITUTE.COM"]
  const groupHeight = lines.length * 9 * scale
  for (let top = Math.max(28, Math.round(height * 0.12)); top < height - groupHeight; top += Math.max(groupHeight + 38, Math.round(height / 3))) {
    lines.forEach((line, lineIndex) => {
      const textWidth = line.length * 6 * scale
      drawText(pixels, width, height, line, Math.max(16, Math.round((width - textWidth) / 2)), top + lineIndex * 9 * scale, scale)
    })
  }
  drawText(pixels, width, height, `PREVIEW PAGE ${pageNumber}`, 20, Math.max(20, height - 10 * scale), scale)
  return new Uint8Array(jpeg.encode({ data: pixels, width, height }, 58).data)
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin")
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) })
  if (req.method !== "POST") return respond({ error: "Method not allowed." }, 405, origin)
  if (origin && !APP_ORIGINS.has(origin)) return respond({ error: "Origin not allowed." }, 403, origin)

  const authorization = req.headers.get("authorization")
  if (!authorization?.startsWith("Bearer ")) return respond({ error: "Authentication is required." }, 401, origin)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return respond({ error: "Preview service is not configured." }, 500, origin)

  let resourceId = ""
  try {
    const payload = await req.json()
    resourceId = typeof payload?.resourceId === "string" ? payload.resourceId : ""
  } catch {
    return respond({ error: "A JSON request body is required." }, 400, origin)
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(resourceId)) {
    return respond({ error: "A valid resource ID is required." }, 400, origin)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: userResult, error: userError } = await userClient.auth.getUser()
  if (userError || !userResult.user) return respond({ error: "Unable to verify the signed-in user." }, 401, origin)

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userResult.user.id)
    .maybeSingle()
  if (profileError || profile?.role !== "admin") return respond({ error: "Administrator access is required to generate previews." }, 403, origin)

  const { data: resource, error: resourceError } = await adminClient
    .from("resources")
    .select("id, storage_path, mime_type")
    .eq("id", resourceId)
    .maybeSingle()
  if (resourceError || !resource?.storage_path) return respond({ error: "Resource file not found." }, 404, origin)
  if (resource.mime_type !== "application/pdf" && !resource.storage_path.toLowerCase().endsWith(".pdf")) {
    return respond({ error: "Previews can only be generated for PDF resources." }, 400, origin)
  }

  const { data: originalPdf, error: downloadError } = await adminClient.storage
    .from("resource-files")
    .download(resource.storage_path)
  if (downloadError || !originalPdf) return respond({ error: "Unable to read the private PDF." }, 502, origin)

  const uploadedPaths: string[] = []
  let document: Awaited<ReturnType<PDFiumLibrary["loadDocument"]>> | null = null
  let library: Awaited<ReturnType<typeof PDFiumLibrary.init>> | null = null
  try {
    library = await PDFiumLibrary.init()
    document = await library.loadDocument(new Uint8Array(await originalPdf.arrayBuffer()))
    const actualPageCount = document.getPageCount()
    const previewPageCount = Math.max(1, Math.min(actualPageCount, MAX_PREVIEW_PAGES))

    for (let pageIndex = 0; pageIndex < previewPageCount; pageIndex += 1) {
      const page = document.getPage(pageIndex)
      const sourceSize = page.getOriginalSize()
      const scale = Math.min(1, MAX_PREVIEW_WIDTH / Math.max(1, sourceSize.originalWidth))
      const rendered = await page.render({ scale, colorSpace: "BGRA", render: "bitmap", renderFormFields: true })
      const jpeg = watermarkAndEncodeJpeg(new Uint8Array(rendered.data), rendered.width, rendered.height, pageIndex + 1)
      if (!jpeg.byteLength || jpeg.byteLength > MAX_JPEG_BYTES) throw new Error(`Preview page ${pageIndex + 1} does not meet the safe-size limit.`)

      const path = `${resource.id}-full-preview-page-${pageIndex + 1}.jpg`
      const { error: uploadError } = await adminClient.storage.from("resource-thumbnails").upload(path, jpeg, {
        cacheControl: "31536000",
        contentType: "image/jpeg",
        upsert: true,
      })
      if (uploadError) throw uploadError
      uploadedPaths.push(path)
    }

    const thumbnailPath = uploadedPaths[0]
    const { error: updateError } = await adminClient
      .from("resources")
      .update({ thumbnail_path: thumbnailPath, page_count: actualPageCount })
      .eq("id", resource.id)
    if (updateError) throw updateError

    return respond({ thumbnailPath, pages: uploadedPaths.length, previewPaths: uploadedPaths }, 200, origin)
  } catch (error) {
    console.error("PDF preview generation failed", error)
    if (uploadedPaths.length) await adminClient.storage.from("resource-thumbnails").remove(uploadedPaths)
    return respond({
      error: "Unable to render and store the watermarked PDF preview.",
      detail: error instanceof Error ? error.message : String(error),
    }, 422, origin)
  } finally {
    document?.destroy()
    library?.destroy()
  }
})
