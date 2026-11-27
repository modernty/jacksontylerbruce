/**
 * The questions a first visit starts with: the case studies, the career, and the product design work.
 * Each is answered from the site's own content, so they never call the model. Kept apart from the
 * prompt components so the router's tests can read them.
 */
export const STARTERS: readonly string[] = ["Show me some case studies", "Tell me about your experience", "Show me all product design projects"]
