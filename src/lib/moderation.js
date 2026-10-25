// Frontend copy of the banned-words list (also enforced server-side on send).
const BANNED_WORDS = [
  'fuck', 'fucking', 'fuk', 'motherfucker', 'shit', 'bullshit', 'bitch',
  'bastard', 'cunt', 'dick', 'dickhead', 'asshole', 'ass', 'prick',
  'twat', 'wanker', 'bollocks', 'slut', 'whore', 'hoe', 'nigger',
  'nigga', 'faggot', 'retard', 'retarded', 'piss', 'crap', 'damn',
  'jackass', 'dumbass', 'douchebag', 'coon', 'kys', 'screw you'
];

export function findViolation(text) {
  const normalized = String(text || '')
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1|!/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4|@/g, 'a')
    .replace(/5|\$/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]+/g, ' ')
    .trim();
  if (!normalized) return null;
  const words = normalized.split(/\s+/).filter(Boolean);
  return BANNED_WORDS.find((w) => words.includes(w) || normalized.includes(w)) || null;
}