/** The only public name for the current employer. */
export function employerPublicName(): string {
  return process.env.EMPLOYER_PUBLIC_NAME ?? 'Loblaw / PC Health'
}
