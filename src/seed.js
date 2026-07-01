// Seed the database with a demo user and sample ideas.
// Run: npm run seed   (uses node --env-file=.env)
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'ideavault';
if (!uri) {
  console.error('Missing MONGO_URI. Create .env first (copy from .env.example).');
  process.exit(1);
}

const ideas = [
  {
    title: 'AI Meal Planner for Busy Parents',
    category: 'AI',
    shortDescription: 'Personalized weekly meal plans generated from your fridge and dietary needs.',
    detailedDescription:
      'An app that scans the groceries you already have, learns your family’s dietary preferences, and generates balanced weekly meal plans with auto-built shopping lists. It reduces food waste and decision fatigue for busy households.',
    targetAudience: 'Working parents and busy households of 2–5 people.',
    problemStatement: 'Parents waste time and food deciding what to cook every night.',
    proposedSolution: 'AI-generated plans from on-hand ingredients with one-tap shopping lists.',
    estimatedBudget: '$60,000',
    tags: ['ai', 'food', 'mobile'],
    imageURL: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200',
  },
  {
    title: 'Carbon-Neutral Last-Mile Delivery',
    category: 'Sustainability',
    shortDescription: 'A network of e-cargo bikes for emission-free urban package delivery.',
    detailedDescription:
      'A logistics platform connecting local couriers on electric cargo bikes with retailers needing same-day delivery, cutting emissions and beating traffic in dense city centers.',
    targetAudience: 'Urban retailers and e-commerce stores in major cities.',
    problemStatement: 'Last-mile delivery is the most polluting and costly leg of shipping.',
    proposedSolution: 'Crowd-sourced e-cargo-bike couriers with route optimization.',
    estimatedBudget: '$120,000',
    tags: ['logistics', 'green', 'b2b'],
    imageURL: 'https://images.unsplash.com/photo-1597007030739-6d2e7172ee5f?w=1200',
  },
  {
    title: 'Micro-Mentorship Marketplace',
    category: 'Education',
    shortDescription: 'Book 15-minute expert calls to unblock a specific problem.',
    detailedDescription:
      'A marketplace where learners book short, focused mentorship sessions with vetted experts — no long-term commitment, just targeted help when you’re stuck.',
    targetAudience: 'Students, career switchers, and early-stage founders.',
    problemStatement: 'Quality mentorship is hard to access for one-off questions.',
    proposedSolution: 'On-demand 15-minute expert calls with transparent pricing.',
    estimatedBudget: '$45,000',
    tags: ['education', 'marketplace'],
    imageURL: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200',
  },
  {
    title: 'Mental Health Check-in for Teams',
    category: 'Health',
    shortDescription: 'Anonymous weekly wellbeing pulse for remote teams.',
    detailedDescription:
      'A Slack-integrated tool that runs anonymous weekly wellbeing check-ins, surfaces burnout trends to managers, and recommends actionable resources — without exposing individuals.',
    targetAudience: 'Remote-first companies and people-ops teams.',
    problemStatement: 'Managers lack early signals of team burnout.',
    proposedSolution: 'Anonymous pulse surveys with aggregated, actionable insights.',
    estimatedBudget: '$80,000',
    tags: ['health', 'saas', 'remote'],
    imageURL: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200',
  },
  {
    title: 'Local Skill-Swap Network',
    category: 'Social',
    shortDescription: 'Trade skills with neighbors — no money involved.',
    detailedDescription:
      'A hyper-local app where people exchange skills (guitar lessons for gardening help) using a time-credit system, strengthening community ties.',
    targetAudience: 'Neighborhood communities and hobbyists.',
    problemStatement: 'People have skills to share but no easy way to barter locally.',
    proposedSolution: 'A time-credit skill-swap marketplace scoped to your neighborhood.',
    estimatedBudget: '$30,000',
    tags: ['community', 'social'],
    imageURL: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
  },
  {
    title: 'No-Code Internal Tools Builder',
    category: 'Tech',
    shortDescription: 'Drag-and-drop dashboards on top of your existing database.',
    detailedDescription:
      'A no-code platform that connects to your SQL/NoSQL database and lets non-engineers build admin panels and dashboards in minutes, freeing dev teams from internal-tool requests.',
    targetAudience: 'Ops teams and small businesses without dedicated engineers.',
    problemStatement: 'Internal tools eat engineering time that should go to the product.',
    proposedSolution: 'Visual builder with secure DB connectors and role-based access.',
    estimatedBudget: '$150,000',
    tags: ['no-code', 'saas', 'tech'],
    imageURL: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200',
  },
];

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(dbName);

  const email = 'demo@ideavault.app';
  const passwordHash = await bcrypt.hash('Demo123', 10);
  const now = new Date();
  await db.collection('users').updateOne(
    { email },
    {
      $set: { name: 'Demo Founder', photoURL: '', provider: 'credentials', passwordHash, updatedAt: now },
      $setOnInsert: { email, bookmarks: [], createdAt: now },
    },
    { upsert: true }
  );
  const user = await db.collection('users').findOne({ email });

  const docs = ideas.map((idea, i) => ({
    ...idea,
    authorId: user._id.toString(),
    authorName: user.name,
    authorPhoto: user.photoURL,
    likes: Math.floor((ideas.length - i) * 3),
    commentCount: 0,
    createdAt: new Date(now.getTime() - i * 86400000),
    updatedAt: new Date(now.getTime() - i * 86400000),
  }));

  await db.collection('ideas').deleteMany({ authorId: user._id.toString() });
  await db.collection('ideas').insertMany(docs);

  console.log(`Seeded ${docs.length} ideas.`);
  console.log('Demo login → email: demo@ideavault.app  password: Demo123');
} finally {
  await client.close();
}
