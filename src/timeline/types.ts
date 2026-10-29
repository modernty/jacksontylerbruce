export type RoleMark = {
  name: string
  year: string
  start: number
  end: number | null
  lane: number
}

export type ProjectMark = {
  name: string
  start: number
  end: number
  org: string
  lane: number
  focus: string
  themes: string[]
  onTimeline: boolean
}

export type TimelineModel = {
  now: number
  ink: string
  roles: RoleMark[]
  projects: ProjectMark[]
  focus: [string, string][]
  names: Record<string, string>
}

export type TimelineCard = {
  t: string
  c: string
  d: string
  f: string
  s: string
  u: string
}
