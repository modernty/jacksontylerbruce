const HEIGHT = /\b(how tall|tall is (he|tyler)|his height|tyler'?s height|height|how much does (he|tyler) weigh|weigh(s|t)?|how heavy|how big is (he|tyler))\b/
const STUDY = /(?<!case )\b(study|studied|school|college|university|degree|education|educated|major(ed)?|alma mater|virginia tech)\b/

/** Where Tyler studied. A fact the chat can state; the title stays "designer". */
export const EDUCATION = "Studied Architecture at Virginia Tech."

/** Personal facts kept in code because they are not in the Notion Q&A. No subject, per the voice. */
export function personalReply(question: string): string | null {
  const q = question.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
  if (HEIGHT.test(q)) return "6'2\". 200 lbs."
  if (STUDY.test(q) && /\b(he|his|him|tyler|you|your)\b/.test(q)) return EDUCATION
  return null
}
