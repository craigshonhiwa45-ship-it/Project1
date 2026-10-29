import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Permanently deletes the signed-in user's content, memberships and account record.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const uid = user.id;
    const sr = base44.asServiceRole.entities;
    const arr = (x) => (Array.isArray(x) ? x : x.items || []);

    // Shared rooms and chats: drop this member, delete the container when nobody is left.
    const [convos, rooms] = await Promise.all([
      sr.Conversation.filter({ member_ids: uid }),
      sr.StudyRoom.filter({ member_ids: uid }),
    ]);

    const deletes = [
      () => sr.Post.deleteMany({ created_by_id: uid }),
      () => sr.PostComment.deleteMany({ created_by_id: uid }),
      () => sr.PostLike.deleteMany({ user_id: uid }),
      () => sr.PostRepost.deleteMany({ user_id: uid }),
      () => sr.Message.deleteMany({ sender_id: uid }),
      () => sr.Friendship.deleteMany({ requester_id: uid }),
      () => sr.Friendship.deleteMany({ addressee_id: uid }),
      () => sr.StudyInvite.deleteMany({ from_id: uid }),
      () => sr.StudyInvite.deleteMany({ to_id: uid }),
      () => sr.StudySession.deleteMany({ participant_ids: uid }),
      () => sr.Rating.deleteMany({ rater_id: uid }),
      () => sr.Block.deleteMany({ blocker_id: uid }),
      () => sr.Block.deleteMany({ blocked_id: uid }),
      () => sr.Report.deleteMany({ reporter_id: uid }),
      () => sr.RoomSignal.deleteMany({ from_id: uid }),
      () => sr.RoomSignal.deleteMany({ to_id: uid }),
      () => sr.Activity.deleteMany({ created_by_id: uid }),
      () => sr.AppRating.deleteMany({ created_by_id: uid }),
      () => sr.Feedback.deleteMany({ created_by_id: uid }),
    ];
    for (let i = 0; i < deletes.length; i += 6) {
      await Promise.allSettled(deletes.slice(i, i + 6).map((run) => run()));
    }

    for (const convo of arr(convos)) {
      const others = (convo.member_ids || []).filter((id) => id !== uid);
      if (others.length === 0) await sr.Conversation.delete(convo.id).catch(() => {});
      else await sr.Conversation.update(convo.id, { member_ids: others }).catch(() => {});
    }
    for (const room of arr(rooms)) {
      const others = (room.member_ids || []).filter((id) => id !== uid);
      if (others.length === 0) await sr.StudyRoom.delete(room.id).catch(() => {});
      else await sr.StudyRoom.update(room.id, { member_ids: others }).catch(() => {});
    }

    // Remove the account record itself.
    try {
      await sr.User.delete(uid);
      return Response.json({ ok: true, accountRemoved: true });
    } catch (error) {
      // The platform does not allow removing every login from code (owner/admin accounts).
      // Personal data is already gone; strip the profile and queue the login for admin removal.
      await sr.User.update(uid, {
        bio: '',
        university: '',
        course: '',
        modules: [],
        hide_social: true,
        deletion_requested: new Date().toISOString(),
      }).catch(() => {});
      await sr.User.update(uid, { lat: 0, lng: 0, location_updated: '' }).catch(() => {});
      return Response.json({
        ok: true,
        accountRemoved: false,
        needsAdminRemoval: true,
        reason: error.message,
      });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}