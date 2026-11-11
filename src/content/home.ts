/**
 * Tyler is based in more than one city. The profile names them ("Miami"); a place
 * is home when it is the profile's place or its city is one of those names.
 */
export function isHome(place: { id: string; name: string }, profile: { placeId: string; location: string }): boolean {
  if (place.id === profile.placeId) return true
  const cities = profile.location.split(/,| and /).map((city) => city.trim())
  return cities.includes(place.name.split(",")[0].trim())
}
