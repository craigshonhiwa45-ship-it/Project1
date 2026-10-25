// Shared list of banned words for community content (chat, feed, comments).
export const BANNED_WORDS = [
  'fuck', 'fucking', 'fuk', 'motherfucker', 'shit', 'bullshit', 'bitch',
  'bastard', 'cunt', 'dick', 'dickhead', 'asshole', 'ass', 'prick',
  'twat', 'wanker', 'bollocks', 'slut', 'whore', 'hoe', 'nigger',
  'nigga', 'faggot', 'retard', 'retarded', 'piss', 'crap', 'damn',
  'jackass', 'dumbass', 'douchebag', 'coon', 'kys', 'screw you'
];

// Normalizes text so leetspeak and spacing tricks still match.
export function normalizeForModeration(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1|!/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4|@/g, 'a')
    .replace(/5|\$/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]+/g, ' ')
    .trim();
}

export function containsViolation(text) {
  const normalized = normalizeForModeration(text);
  if (!normalized) return false;
  const words = normalized.split(/\s+/).filter(Boolean);
  return BANNED_WORDS.some((w) => words.includes(w) || normalized.includes(w));
}