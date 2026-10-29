/** The only public name for the current employer. Roles and that client's label both read this. */
export function employerPublicName(): string {
  return process.env.EMPLOYER_PUBLIC_NAME ?? 'Loblaw / PC Health'
}

export function clientLabel(client: { name: string; usesEmployerName?: boolean }): string {
  return client.usesEmployerName ? employerPublicName() : client.name
}
