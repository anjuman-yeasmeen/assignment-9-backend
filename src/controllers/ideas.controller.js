import { ideasCollection, commentsCollection } from '../config/db.js';
import { serializeIdea, toObjectId, CATEGORIES } from '../lib/serialize.js';
import { ApiError } from '../lib/http.js';

// GET /api/ideas — public listing with search, category filter, sort and limit.
//   ?search=   case-insensitive match on title ($regex)
//   ?category= exact category filter
//   ?sort=trending|newest
//   ?limit=    cap the number of results (home "Trending" section)
//   ?from= &to=  optional createdAt date range ($gte / $lte)
export async function listIdeas(req, res) {
  const search = (req.query.search || '').toString().trim();
  const category = (req.query.category || '').toString().trim();
  const sort = (req.query.sort || 'newest').toString();
  const limit = Math.min(parseInt(req.query.limit || '0', 10) || 0, 100);
  const from = req.query.from;
  const to = req.query.to;

  const query = {};
  if (search) {
    // Escape regex metacharacters so user input is matched literally (no ReDoS).
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.title = { $regex: safe, $options: 'i' };
  }
  if (category && CATEGORIES.includes(category)) {
    query.category = category;
  }
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const sortSpec =
    sort === 'trending'
      ? { likes: -1, commentCount: -1, createdAt: -1 }
      : { createdAt: -1 };

  let cursor = ideasCollection().find(query).sort(sortSpec);
  if (limit) cursor = cursor.limit(limit);
  const docs = await cursor.toArray();

  res.json({ ideas: docs.map(serializeIdea) });
}

// POST /api/ideas — create an idea (authenticated).
export async function createIdea(req, res) {
  const user = req.user;
  const body = req.body || {};

  const required = {
    title: body.title,
    shortDescription: body.shortDescription,
    detailedDescription: body.detailedDescription,
    category: body.category,
    targetAudience: body.targetAudience,
    problemStatement: body.problemStatement,
    proposedSolution: body.proposedSolution,
  };
  for (const [key, value] of Object.entries(required)) {
    if (!value || !String(value).trim()) throw new ApiError(400, `${key} is required`);
  }
  if (!CATEGORIES.includes(body.category)) throw new ApiError(400, 'Invalid category');

  const now = new Date();
  const doc = {
    title: body.title.trim(),
    shortDescription: body.shortDescription.trim(),
    detailedDescription: body.detailedDescription.trim(),
    category: body.category,
    tags: normalizeTags(body.tags),
    imageURL: (body.imageURL || '').trim(),
    estimatedBudget: (body.estimatedBudget || '').toString().trim(),
    targetAudience: body.targetAudience.trim(),
    problemStatement: body.problemStatement.trim(),
    proposedSolution: body.proposedSolution.trim(),
    authorId: user.id,
    authorName: user.name,
    authorPhoto: user.photoURL,
    likes: 0,
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const result = await ideasCollection().insertOne(doc);
  res.status(201).json({ idea: serializeIdea({ ...doc, _id: result.insertedId }) });
}

// GET /api/ideas/:id — full idea details (authenticated).
export async function getIdea(req, res) {
  const _id = toObjectId(req.params.id);
  if (!_id) throw new ApiError(404, 'Idea not found');

  const idea = await ideasCollection().findOne({ _id });
  if (!idea) throw new ApiError(404, 'Idea not found');

  res.json({ idea: serializeIdea(idea), isOwner: idea.authorId === req.user.id });
}

// PATCH /api/ideas/:id — update an idea (owner only).
export async function updateIdea(req, res) {
  const _id = toObjectId(req.params.id);
  if (!_id) throw new ApiError(404, 'Idea not found');

  const ideas = ideasCollection();
  const idea = await ideas.findOne({ _id });
  if (!idea) throw new ApiError(404, 'Idea not found');
  if (idea.authorId !== req.user.id) throw new ApiError(403, 'You can only edit your own ideas');

  const body = req.body || {};
  const allowed = [
    'title',
    'shortDescription',
    'detailedDescription',
    'category',
    'imageURL',
    'estimatedBudget',
    'targetAudience',
    'problemStatement',
    'proposedSolution',
  ];
  const update = {};
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = String(body[key]).trim();
  }
  if (update.category && !CATEGORIES.includes(update.category)) {
    throw new ApiError(400, 'Invalid category');
  }
  if (body.tags !== undefined) update.tags = normalizeTags(body.tags);
  update.updatedAt = new Date();

  await ideas.updateOne({ _id }, { $set: update });
  const updated = await ideas.findOne({ _id });
  res.json({ idea: serializeIdea(updated) });
}

// DELETE /api/ideas/:id — delete an idea and its comments (owner only).
export async function deleteIdea(req, res) {
  const _id = toObjectId(req.params.id);
  if (!_id) throw new ApiError(404, 'Idea not found');

  const ideas = ideasCollection();
  const idea = await ideas.findOne({ _id });
  if (!idea) throw new ApiError(404, 'Idea not found');
  if (idea.authorId !== req.user.id) throw new ApiError(403, 'You can only delete your own ideas');

  await ideas.deleteOne({ _id });
  await commentsCollection().deleteMany({ ideaId: _id });
  res.json({ success: true });
}

// GET /api/my-ideas — ideas created by the logged-in user.
export async function listMyIdeas(req, res) {
  const docs = await ideasCollection()
    .find({ authorId: req.user.id })
    .sort({ createdAt: -1 })
    .toArray();
  res.json({ ideas: docs.map(serializeIdea) });
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  return String(tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}
