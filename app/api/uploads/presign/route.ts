import { NextResponse } from "next/server";
import { z } from "zod";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSession } from "@/lib/session";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { r2Client } from "@/lib/r2";
import { parseJsonBody } from "@/lib/parse-body";

const presignSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  folder: z.enum(["logos", "properties"]),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (!process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
    return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
  }

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = presignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { fileName, fileType, folder } = parsed.data;

  // logos → workspace settings (same guard as settings/workspace PATCH); properties → property create
  const required =
    folder === "logos" ? PERMISSIONS.ROLES_MANAGE : PERMISSIONS.PROPERTIES_CREATE;
  if (!(await hasPermission(session.user.roleId, required))) {
    return new Response("Forbidden", { status: 403 });
  }

  const key = `${session.user.tenantId}/${folder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

  return NextResponse.json({ uploadUrl, publicUrl });
}
