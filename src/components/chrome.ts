/** Pages with the name-and-location bar and the plain chat bar. */
export function quietPage(path: string): boolean {
  return path === "/" || path === "/about" || path.startsWith("/work/") || path.startsWith("/timeline") || path.startsWith("/focus/")
}

/** Pages that answer in their own conversation column instead of routing to another view. */
export function inlineChat(path: string): boolean {
  return path === "/about" || path.startsWith("/work/")
}
