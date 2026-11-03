export function StorageMissing() {
  return (
    <section>
      <h1>Checklist</h1>
      <p className="ck-error">storage not configured</p>
    </section>
  )
}

export function SeedMissing() {
  return (
    <section>
      <h1>Checklist</h1>
      <p className="ck-error">The checklist seed was refused.</p>
    </section>
  )
}
