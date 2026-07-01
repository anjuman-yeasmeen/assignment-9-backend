import { ObjectId } from 'mongodb';

// Convert an id string to an ObjectId, or null if it isn't a valid id.
export function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// Shape returned to the client for a user — never includes the password hash.
export function publicUser(user) {
  if (!user) return null;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    photoURL: user.photoURL || '',
    provider: user.provider || 'credentials',
  };
}

// Strip server-only fields and normalize ObjectId/Date to JSON-friendly values.
export function serializeIdea(idea) {
  if (!idea) return null;
  return {
    ...idea,
    _id: idea._id.toString(),
    createdAt: idea.createdAt ? new Date(idea.createdAt).toISOString() : null,
    updatedAt: idea.updatedAt ? new Date(idea.updatedAt).toISOString() : null,
  };
}

export function serializeComment(comment) {
  if (!comment) return null;
  return {
    ...comment,
    _id: comment._id.toString(),
    ideaId: comment.ideaId?.toString?.() ?? comment.ideaId,
    createdAt: comment.createdAt ? new Date(comment.createdAt).toISOString() : null,
    updatedAt: comment.updatedAt ? new Date(comment.updatedAt).toISOString() : null,
  };
}

// Category list shared by validation across the API (mirrors the frontend).
export const CATEGORIES = [
  'Tech',
  'Health',
  'AI',
  'Education',
  'Finance',
  'Sustainability',
  'E-commerce',
  'Social',
  'Other',
];
