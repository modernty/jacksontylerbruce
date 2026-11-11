/**
 * Prints the questions the exact answers missed, grouped, most asked first, with what answered
 * each: a fuzzy Q&A match, the model, a site route, or the fallback. Good ones become Alternates
 * or new rows in the Notion Chat Q&A, then sync into content/qa.json.
 *
 * Reads the shared store (UPSTASH_REDIS_REST_URL / _TOKEN). Without one there is nothing kept
 * between requests, so run it against production env: `vercel env pull` first.
 */
import { readMisses } from "@/src/router/chat"

async function main() {
  const rows = await readMisses()
  const groups = new Map<string, { q: string; how: string; count: number; last: string }>()
  for (const row of rows) {
    const key = `${row.q.toLowerCase().trim()}|${row.how}`
    const group = groups.get(key) ?? { q: row.q, how: row.how, count: 0, last: row.at }
    group.count += 1
    if (row.at > group.last) group.last = row.at
    groups.set(key, group)
  }
  if (!groups.size) console.log("No misses kept. Is the shared store configured?")
  for (const group of [...groups.values()].sort((a, b) => b.count - a.count)) {
    console.log(`${String(group.count).padStart(3)}  ${group.how.padEnd(28)}  ${group.last}  ${group.q}`)
  }
}

void main()
