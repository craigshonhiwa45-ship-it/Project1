import { base44 } from '@/api/base44Client';

export function distanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => typeof v !== 'number')) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}

export function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export async function updateMyLocation() {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          await base44.auth.updateMe({ lat, lng, location_updated: new Date().toISOString() });
          resolve({ lat, lng });
        } catch {
          resolve({ lat, lng });
        }
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export function matchScore(me, buddy) {
  let score = 0;
  const myModules = me?.modules || [];
  const shared = (buddy?.modules || []).filter((m) => myModules.includes(m));
  score += shared.length * 25;
  if (me?.university && buddy?.university === me.university) score += 30;
  if (me?.course && buddy?.course === me.course) score += 15;
  if (me?.year && buddy?.year === me.year) score += 10;
  return Math.min(100, score);
}

export async function sendFriendRequest(meId, buddyId) {
  const [sent, received] = await Promise.all([
    base44.entities.Friendship.filter({ requester_id: meId, addressee_id: buddyId }),
    base44.entities.Friendship.filter({ requester_id: buddyId, addressee_id: meId }),
  ]);
  if (sent.length || received.length) {
    return { ok: false, status: sent[0]?.status || received[0]?.status, existing: received[0] || sent[0] };
  }
  const record = await base44.entities.Friendship.create({
    requester_id: meId,
    addressee_id: buddyId,
    status: 'pending',
  });
  return { ok: true, record };
}

export async function findOrCreateDirectConversation(meId, buddyId, buddyName) {
  const convos = await base44.entities.Conversation.filter({ member_ids: meId, type: 'direct' });
  const found = convos.find((c) => Array.isArray(c.member_ids) && c.member_ids.includes(buddyId));
  if (found) return found;
  return base44.entities.Conversation.create({
    type: 'direct',
    title: buddyName || 'Study chat',
    member_ids: [meId, buddyId],
  });
}

export async function fetchUserMap() {
  const users = await base44.entities.User.filter({});
  return Object.fromEntries(users.map((u) => [u.id, u]));
}

export function otherMemberIds(memberIds = [], meId) {
  return memberIds.filter((id) => id !== meId);
}