/** Parts of the world, by country. The globe links them; the chat answers questions about them. */
export const REGIONS = [
  { id: "north-america", name: "North America", words: ["north america", "the us", "the states", "america", "usa"], countries: ["United States"] },
  {
    id: "caribbean",
    name: "the Caribbean and Central America",
    words: ["caribbean", "central america", "latin america", "islands"],
    countries: ["Mexico", "Costa Rica", "El Salvador", "Dominican Republic", "Puerto Rico", "Jamaica", "Bahamas", "Cayman Islands"],
  },
  { id: "south-america", name: "South America", words: ["south america", "latin america"], countries: ["Colombia"] },
  { id: "europe", name: "Europe", words: ["europe", "european"], countries: ["United Kingdom", "France", "Spain", "Italy", "Germany", "Switzerland"] },
  { id: "south-asia", name: "South Asia", words: ["south asia", "asia"], countries: ["India"] },
  { id: "east-asia", name: "East Asia", words: ["east asia", "asia"], countries: ["Japan"] },
] as const

export function regionOf(country: string): string {
  return REGIONS.find((region) => (region.countries as readonly string[]).includes(country))?.id ?? country
}
