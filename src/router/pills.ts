import type { Intent, Pill } from "./types"

export const DEFAULT_PILLS: Pill[] = [
  { label: "How do you design trust into AI products?", href: "/focus/trust" },
  { label: "Show me Overmatch", href: "/work/overmatch-patterns#summary" },
  { label: "Walk me through your career", href: "/timeline" },
]

const CAREER: Pill = { label: "Walk me through your career", href: "/timeline" }
const PROJECTS: Pill = { label: "Show me your projects", href: "/timeline/projects" }
const TRUST: Pill = { label: "How do you design trust into AI products?", href: "/focus/trust" }

const BY_INTENT: Partial<Record<Intent, Pill[]>> = {
  focus: [
    { label: "Show me Model Playground", href: "/work/model-playground#summary" },
    { label: "Show me ATLS", href: "/work/atls#summary" },
    CAREER,
  ],
  project: [TRUST, CAREER, PROJECTS],
  role: [PROJECTS, TRUST, CAREER],
  compare: [CAREER, PROJECTS, TRUST],
  location: [CAREER, PROJECTS, TRUST],
  about: [PROJECTS, CAREER, TRUST],
  process: [TRUST, PROJECTS, CAREER],
  availability: [CAREER, PROJECTS, TRUST],
  off_topic: [CAREER, PROJECTS, TRUST],
  decline: [CAREER, PROJECTS, TRUST],
}

export function followUpsFor(intent: Intent): Pill[] {
  return BY_INTENT[intent] ?? DEFAULT_PILLS
}

export function sheetCopy(topic: string): { title: string; body: string; cta: Pill } {
  const timeline: Pill = { label: "See the timeline \u2192", href: "/timeline" }
  const projects: Pill = { label: "See the projects \u2192", href: "/timeline/projects" }
  switch (topic) {
    case "location":
      return { title: "Miami, FL", body: "Tyler is based in Miami, FL.", cta: timeline }
    case "about":
      return {
        title: "Designer and design director",
        body: "Tyler is a designer and design director. The timeline and the case studies are the public record of the work.",
        cta: projects,
      }
    case "process":
      return {
        title: "How the work gets made",
        body: "A brief gets structured first, then the interface, then a handoff a developer can build from.",
        cta: timeline,
      }
    case "availability":
      return {
        title: "Working together",
        body: "The two current roles are open as of 2026. Tyler is based in Miami, FL.",
        cta: timeline,
      }
    case "decline":
      return {
        title: "Not on this site",
        body: "That stays off this site. The timeline, the focuses, and the public case studies are open.",
        cta: timeline,
      }
    default:
      return {
        title: "Ask about the work",
        body: "This site answers questions about the public work. Try the timeline, a focus, or a case study.",
        cta: timeline,
      }
  }
}
