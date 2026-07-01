import { usersCollection, commentsCollection, ideasCollection } from '../config/db.js';
import { publicUser, serializeIdea, toObjectId } from '../lib/serialize.js';
import { ApiError } from '../lib/http.js';

// PATCH /api/user — update the logged-in user's profile (name, photo URL).
export async function updateProfile(req, res) {
  const body = req.body || {};
  const update = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) throw new ApiError(400, 'Name cannot be empty');
    update.name = name;
  }
  if (body.photoURL !== undefined) {
    update.photoURL = String(body.photoURL).trim();
  }
  if (Object.keys(update).length === 0) throw new ApiError(400, 'Nothing to update');
  update.updatedAt = new Date();

  const users = usersCollection();
  const _id = toObjectId(req.user.id);
  await users.updateOne({ _id }, { $set: update });
  const updated = await users.findOne({ _id });

  res.json({ user: publicUser(updated) });
}

// GET /api/my-interactions — ideas the user has commented on, with how many
// comments they left and when they last commented (most recent first).
export async function myInteractions(req, res) {
  const grouped = await commentsCollection()
    .aggregate([
      { $match: { userId: req.user.id } },
      {
        $group: {
          _id: '$ideaId',
          count: { $sum: 1 },
          lastCommentedAt: { $max: '$createdAt' },
        },
      },
      { $sort: { lastCommentedAt: -1 } },
    ])
    .toArray();

  const ideaIds = grouped.map((g) => g._id).filter(Boolean);
  const docs = await ideasCollection()
    .find({ _id: { $in: ideaIds } })
    .toArray();
  const ideaMap = new Map(docs.map((d) => [d._id.toString(), d]));

  // Preserve the "most recently commented" ordering; skip deleted ideas.
  const interactions = grouped
    .map((g) => {
      const idea = ideaMap.get(g._id?.toString());
      if (!idea) return null;
      return {
        idea: serializeIdea(idea),
        myCommentCount: g.count,
        lastCommentedAt: g.lastCommentedAt ? new Date(g.lastCommentedAt).toISOString() : null,
      };
    })
    .filter(Boolean);

  res.json({ interactions });
}
