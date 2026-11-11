/** The top bar's mail icon asks the composer to start a note to Tyler. */
export const CONTACT_EVENT = "composer:contact"

/** Opens the visitor's mail app with the note addressed and ready; they only press send. */
export function mailtoLink(email: string, note: string): string {
  return `mailto:${email}?subject=${encodeURIComponent("A note from jacksontylerbruce.com")}&body=${encodeURIComponent(note)}`
}
