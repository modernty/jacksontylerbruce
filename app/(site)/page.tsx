import { redirect } from "next/navigation"
import { keywordRoute, withQuestion } from "@/src/router/keyword"

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  if (q?.trim()) redirect(withQuestion(keywordRoute(q).href, q))
  redirect("/timeline")
}
