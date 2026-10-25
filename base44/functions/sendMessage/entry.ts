import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { containsViolation } from '../../shared/moderation.ts';

const NON_FRIEND_LIMIT = 3;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { conversation_id, text, attachments } = body;
    if (!conversation_id) return Response.json({ error: 'Missing conversation' }, { status: 400 });

    const clean = String(text || '').trim();
    const safeAttachments = Array.isArray(attachments)
      ? attachments
          .filter((a) => a && typeof a.file_uri === 'string' && ['image', 'file', 'voice', 'video'].includes(a.kind))
          .slice(0, 5)
          .map((a) => ({ kind: a.kind, name: String(a.name || 'Attachment').slice(0, 120), file_uri: a.file_uri, duration_ms: Number(a.duration_ms) || undefined }))
      : [];
    if (!clean && safeAttachments.length === 0) {
      return Response.json({ error: 'Message is empty' }, { status: 400 });
    }
    if (clean && containsViolation(clean)) {
      return Response.json({ error: 'Your message contains words that are not allowed on Studybuddy.', code: 'moderation' }, { status: 400 });
    }

    // User-scoped read: RLS only returns the conversation if the sender is a member.
    let convo;
    try {
      convo = await base44.entities.Conversation.get(conversation_id);
    } catch {
      return Response.json({ error: 'Conversation not found' }, { status: 403 });
    }

    const others = (convo.member_ids || []).filter((id) => id !== user.id);

    // Block check in either direction.
    const blocks = await base44.asServiceRole.entities.Block.filter({});
    const blocked = blocks.some((b) =>
      (b.blocker_id === user.id && others.includes(b.blocked_id)) ||
      (others.includes(b.blocker_id) && b.blocked_id === user.id));
    if (blocked) {
      return Response.json({ error: 'You can no longer exchange messages with this person.', code: 'blocked' }, { status: 403 });
    }

    // Inbox quota: in a direct chat with someone who is not a study buddy,
    // the sender may send at most 3 messages until they are added back.
    if (convo.type === 'direct' && others.length === 1) {
      const other = others[0];
      const [sentByMe, sentToMe] = await Promise.all([
        base44.entities.Friendship.filter({ requester_id: user.id, addressee_id: other, status: 'accepted' }),
        base44.entities.Friendship.filter({ requester_id: other, addressee_id: user.id, status: 'accepted' }),
      ]);
      const friends = sentByMe.length > 0 || sentToMe.length > 0;
      if (!friends) {
        const mine = await base44.entities.Message.filter({ conversation_id, sender_id: user.id });
        if (mine.length >= NON_FRIEND_LIMIT) {
          return Response.json({ error: 'Request limit reached — they need to add you as a study buddy before you can send more.', code: 'quota' }, { status: 403 });
        }
      }
    }

    const message = await base44.entities.Message.create({
      conversation_id,
      sender_id: user.id,
      sender_name: user.full_name,
      member_ids: convo.member_ids,
      text: clean,
      attachments: safeAttachments,
    });
    return Response.json({ ok: true, message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}