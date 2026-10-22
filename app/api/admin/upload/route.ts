import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isRequestAuthorizedAdmin } from "@/lib/admin-auth";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Upload a product photo */
export async function POST(request: Request) {
  const isAuth = await isRequestAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name || "upload.jpg";
    const ext = path.extname(originalName).toLowerCase() || ".jpg";
    const baseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .toLowerCase();
    const fileName = `${Date.now()}_${baseName}${ext}`;

    // 1. Try Supabase Storage if configured
    if (supabaseConfigured()) {
      try {
        const { error } = await supabaseAdmin()
          .storage.from("product-media")
          .upload(fileName, buffer, {
            contentType: file.type || "image/jpeg",
            upsert: true,
          });

        if (!error) {
          const { data: publicUrlData } = supabaseAdmin()
            .storage.from("product-media")
            .getPublicUrl(fileName);

          return NextResponse.json({
            ok: true,
            url: publicUrlData.publicUrl,
            fileName,
          });
        }
      } catch (err) {
        console.warn("Supabase Storage upload failed, falling back to local storage:", err);
      }
    }

    // 2. Local fallback storage in public/assets/uploads/
    const uploadDir = path.join(process.cwd(), "public", "assets", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    const localFilePath = path.join(uploadDir, fileName);
    await fs.writeFile(localFilePath, buffer);

    const publicUrl = `assets/uploads/${fileName}`;
    return NextResponse.json({
      ok: true,
      url: publicUrl,
      fileName,
    });
  } catch (error: any) {
    console.error("POST /api/admin/upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}
