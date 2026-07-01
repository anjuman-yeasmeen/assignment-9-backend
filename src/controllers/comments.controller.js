import { ideasCollection, commentsCollection } from '../config/db.js';
import { serializeComment, toObjectId } from '../lib/serialize.js';
import { ApiError } from '../lib/http.js';

// GET /api/ideas/:id/comments — list comments for an idea (authenticated).
export async function listComments(req, res) {
  const ideaId = toObjectId(req.params.id);
  if (!ideaId) throw new ApiError(404, 'Idea not found');

  const docs = await commentsCollection()
    .find({ ideaId })
    .sort({ createdAt: -1 })
    .toArray();
  res.json({ comments: docs.map(serializeComment) });
}

// POST /api/ideas/:id/comments — add a comment (authenticated).
export async function addComment(req, res) {
  const ideaId = toObjectId(req.params.id);
  if (!ideaId) throw new ApiError(404, 'Idea not found');

  const text = (req.body?.text || '').trim();
  if (!text) throw new ApiError(400, 'Comment cannot be empty');

  const ideas = ideasCollection();
  const idea = await ideas.findOne({ _id: ideaId });
  if (!idea) throw new ApiError(404, 'Idea not found');

  const now = new Date();
  const doc = {
    ideaId,
    ideaTitle: idea.title,
    userId: req.user.id,
    userName: req.user.name,
    userPhoto: req.user.photoURL,
    text,
    createdAt: now,
    updatedAt: now,
  };
  const result = await commentsCollection().insertOne(doc);
  await ideas.updateOne({ _id: ideaId }, { $inc: { commentCount: 1 } });

  res.status(201).json({ comment: serializeComment({ ...doc, _id: result.insertedId }) });
}

// PATCH /api/comments/:id — edit own comment.
export async function updateComment(req, res) {
  const _id = toObjectId(req.params.id);
  if (!_id) throw new ApiError(404, 'Comment not found');

  const text = (req.body?.text || '').trim();
  if (!text) throw new ApiError(400, 'Comment cannot be empty');

  const comments = commentsCollection();
  const comment = await comments.findOne({ _id });
  if (!comment) throw new ApiError(404, 'Comment not found');
  if (comment.userId !== req.user.id) {
    throw new ApiError(403, 'You can only edit your own comments');
  }

  await comments.updateOne({ _id }, { $set: { text, updatedAt: new Date() } });
  const updated = await comments.findOne({ _id });
  res.json({ comment: serializeComment(updated) });
}

// DELETE /api/comments/:id — delete own comment (decrements the idea counter).
export async function deleteComment(req, res) {
  const _id = toObjectId(req.params.id);
  if (!_id) throw new ApiError(404, 'Comment not found');

  const comments = commentsCollection();
  const comment = await comments.findOne({ _id });
  if (!comment) throw new ApiError(404, 'Comment not found');
  if (comment.userId !== req.user.id) {
    throw new ApiError(403, 'You can only delete your own comments');
  }

  await comments.deleteOne({ _id });
  await ideasCollection().updateOne({ _id: comment.ideaId }, { $inc: { commentCount: -1 } });
  res.json({ success: true });
}
