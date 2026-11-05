import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const migration = readFileSync("supabase/migrations/20261103194500_checklist_multiuser.sql", "utf8")

function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) found.push(...sourceFiles(path))
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts")) found.push(path)
  }
  return found
}

test("checklist rows are isolated to auth.uid for authenticated only", () => {
  for (const table of ["checklist_items", "checklist_day_logs", "checklist_week_targets"]) {
    for (const action of ["select", "insert", "update", "delete"]) {
      const start = migration.indexOf(`create policy ${table}_${action}`)
      assert.ok(start >= 0, `${table}_${action}`)
      const next = migration.indexOf("create policy", start + 1)
      const policy = migration.slice(start, next === -1 ? undefined : next)
      assert.match(policy, new RegExp(`for ${action} to authenticated`))
      assert.match(policy, /user_id = auth\.uid\(\)/)
      if (action === "insert" || action === "update") assert.match(policy, /with check \(user_id = auth\.uid\(\)\)/)
      if (action === "select" || action === "delete") assert.equal(/with check/i.test(policy), false)
    }
    assert.match(migration, new RegExp(`grant select, insert, update, delete on table public\\.${table} to authenticated`))
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from public, anon`))
    assert.match(migration, new RegExp(`primary key \\(user_id,`))
  }
  assert.equal(/for (select|insert|update|delete) to anon/i.test(migration), false)
  assert.equal(/create policy checklist_legacy/i.test(migration), false)
  for (const legacy of ["checklist_legacy_items", "checklist_legacy_day_logs", "checklist_legacy_week_targets"]) {
    assert.match(migration, new RegExp(`alter table public\\.${legacy} enable row level security`))
  }
})

test("legacy claim is revoked from anon and the email stays out of app source", () => {
  assert.match(migration, /create or replace function public\.claim_legacy_checklist\(\)/)
  assert.match(migration, /security definer/)
  assert.match(migration, /revoke all on function public\.claim_legacy_checklist\(\) from public/)
  assert.match(migration, /revoke all on function public\.claim_legacy_checklist\(\) from anon/)
  assert.match(migration, /grant execute on function public\.claim_legacy_checklist\(\) to authenticated/)
  assert.match(migration, /email_confirmed_at/)
  assert.match(migration, /from auth\.users/)
  assert.match(migration, /checklist_legacy_day_logs/)
  assert.match(migration, /on conflict \(user_id, id\) do update/)
  assert.match(migration, /on conflict \(user_id, day\) do update/)
  assert.match(migration, /on conflict \(user_id, week_start\) do update/)
  assert.equal((migration.match(/delete from public\.checklist_legacy_/g) ?? []).length, 3)
  assert.equal((migration.match(/where true/g) ?? []).length, 3)
  const app = [...sourceFiles("src"), ...sourceFiles("app")].map((file) => readFileSync(file, "utf8")).join("\n")
  assert.equal(app.includes("CHECKLIST_ALLOWED_EMAILS"), false)
  assert.equal(app.includes(migration.match(/distinct from '([^']+)'/)?.[1] ?? "missing-email"), false)
})
