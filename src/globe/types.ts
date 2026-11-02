/** What the globe needs to draw one place. Built on the server from the catalog. */
export type GlobePlace = {
  id: string
  name: string
  country: string
  lat: number
  lng: number
  kind: "lived" | "traveled" | "client"
  home: boolean
}

export type GlobeProps = {
  places: GlobePlace[]
  /** The place to turn to and label, for example from the list or the chat. */
  focusId?: string | null
  onHover?: (id: string | null) => void
}
