import { NextResponse } from "next/server";

type ParseResult =
  | { data: unknown; error?: undefined }
  | { data?: undefined; error: Response };

// Malformed/empty JSON bodies throw before Zod runs — this turns that 500 into a clean 400.
export async function parseJsonBody(req: Request): Promise<ParseResult> {
  try {
    return { data: await req.json() };
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
}
