/** The only public name for the current employer (the role). Its clients carry their own names. */
export function employerPublicName(): string {
  return process.env.EMPLOYER_PUBLIC_NAME ?? 'LCA'
}

export function clientLabel(client: { name: string; usesEmployerName?: boolean }): string {
  return client.usesEmployerName ? employerPublicName() : client.name
}
