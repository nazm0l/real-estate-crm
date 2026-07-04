import { cookies } from "next/headers"

export type Language = "en" | "bn"

export async function getLanguage(): Promise<Language> {
  const store = await cookies()
  const val = store.get("lang")?.value
  return val === "bn" ? "bn" : "en"
}

export const SYSTEM_PROMPTS: Record<Language, string> = {
  en: "You are a real estate CRM assistant for Bangladesh. Reply concisely in simple English. Use ৳ for currency amounts.",
  bn: "আপনি বাংলাদেশের একটি রিয়েল এস্টেট CRM সহকারী। সহজ বাংলায় সংক্ষিপ্তভাবে উত্তর দিন। মুদ্রার জন্য ৳ ব্যবহার করুন।",
}
