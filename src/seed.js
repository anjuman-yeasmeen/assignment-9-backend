// Seed the database with a demo user and 120+ sample ideas.
// Run: npm run seed   (uses node --env-file=.env)
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'ideavault';
if (!uri) {
  console.error('Missing MONGO_URI. Create .env first (copy from .env.example).');
  process.exit(1);
}

// A pool of arbitrary https images (idea covers). Cycled across generated ideas.
const IMAGES = [
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200',
];

// Six hand-written, richly detailed ideas kept at the top of the list.
const curated = [
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

// ---- Generator for the remaining ideas ----------------------------------
const MODIFIERS = [
  'AI-Powered', 'On-Demand', 'Peer-to-Peer', 'No-Code', 'Subscription-Based',
  'Voice-First', 'AR-Enabled', 'Automated', 'Community-Driven', 'Hyperlocal',
  'Real-Time', 'Data-Driven',
];
const SECTORS = [
  { word: 'Healthcare', cat: 'Health' },
  { word: 'Fitness', cat: 'Health' },
  { word: 'Mental Wellness', cat: 'Health' },
  { word: 'Personal Finance', cat: 'Finance' },
  { word: 'Investing', cat: 'Finance' },
  { word: 'Small-Business Accounting', cat: 'Finance' },
  { word: 'Online Education', cat: 'Education' },
  { word: 'Language Learning', cat: 'Education' },
  { word: 'Career Coaching', cat: 'Education' },
  { word: 'Developer Tooling', cat: 'Tech' },
  { word: 'Cybersecurity', cat: 'Tech' },
  { word: 'Logistics', cat: 'Tech' },
  { word: 'Online Retail', cat: 'E-commerce' },
  { word: 'Grocery Delivery', cat: 'E-commerce' },
  { word: 'Handmade Goods', cat: 'E-commerce' },
  { word: 'Clean Energy', cat: 'Sustainability' },
  { word: 'Recycling', cat: 'Sustainability' },
  { word: 'Carbon Tracking', cat: 'Sustainability' },
  { word: 'Neighborhood Community', cat: 'Social' },
  { word: 'Local Events', cat: 'Social' },
  { word: 'Creator Collaboration', cat: 'Social' },
  { word: 'Smart Agriculture', cat: 'Other' },
  { word: 'Budget Travel', cat: 'Other' },
  { word: 'Real Estate', cat: 'Other' },
];
const PRODUCTS = [
  'Platform', 'Marketplace', 'Assistant', 'Copilot', 'Dashboard', 'Network',
  'App', 'Toolkit', 'Advisor', 'Concierge', 'Tracker', 'Hub',
];
const BUDGETS = ['$25,000', '$40,000', '$50,000', '$75,000', '$90,000', '$120,000', '$180,000', '$250,000'];

const PROBLEMS = [
  (s) => `Existing ${s} tools are clunky, expensive, and painful to adopt.`,
  (s) => `${s} teams lose hours every week to manual, repetitive tasks.`,
  (s) => `Small players in ${s} can't afford heavy enterprise software.`,
  (s) => `People in ${s} struggle to find trustworthy, affordable options.`,
  (s) => `Data in ${s} is scattered across too many disconnected apps.`,
];
const SOLUTIONS = [
  (m) => `We use ${m.toLowerCase()} workflows to automate the busywork and surface clear next steps.`,
  (m) => `A ${m.toLowerCase()} experience that replaces spreadsheets with one simple, guided flow.`,
  (m) => `${m} matching connects the right people and resources in seconds, not weeks.`,
  (m) => `An affordable, ${m.toLowerCase()} alternative that works out of the box for small teams.`,
  (m) => `${m} insights turn raw activity into recommendations anyone can act on.`,
];
const AUDIENCES = [
  (s) => `${s} startups, small businesses, and independent professionals.`,
  (s) => `Everyday ${s} users who want a simpler, more affordable option.`,
  (s) => `Growing ${s} teams that have outgrown spreadsheets but not their budget.`,
  (s) => `Freelancers and side-project builders working in ${s}.`,
];

function generate(count) {
  const out = [];
  let i = 0;
  // Iterate products in the outer loop so early ideas span many categories.
  outer: for (let p = 0; p < PRODUCTS.length; p++) {
    for (let s = 0; s < SECTORS.length; s++) {
      const sector = SECTORS[s];
      const product = PRODUCTS[p];
      const modifier = MODIFIERS[(p * SECTORS.length + s) % MODIFIERS.length];
      const title = `${modifier} ${sector.word} ${product}`;
      const sLow = sector.word.toLowerCase();
      out.push({
        title,
        category: sector.cat,
        shortDescription: `A ${modifier.toLowerCase()} ${product.toLowerCase()} that makes ${sLow} faster, cheaper, and easier to manage.`,
        detailedDescription: `${title} brings ${sLow} into one place. ${SOLUTIONS[i % SOLUTIONS.length](modifier)} It is built to be genuinely useful from day one, with a clean onboarding flow and pricing that works for small teams and solo users alike.`,
        targetAudience: AUDIENCES[i % AUDIENCES.length](sector.word),
        problemStatement: PROBLEMS[i % PROBLEMS.length](sector.word),
        proposedSolution: SOLUTIONS[(i + 2) % SOLUTIONS.length](modifier),
        estimatedBudget: BUDGETS[i % BUDGETS.length],
        tags: [
          modifier.toLowerCase().replace(/[^a-z]+/g, '-'),
          sector.cat.toLowerCase(),
          product.toLowerCase(),
        ],
        imageURL: IMAGES[i % IMAGES.length],
      });
      i += 1;
      if (out.length >= count) break outer;
    }
  }
  return out;
}

const ideas = [...curated, ...generate(114)]; // 6 + 114 = 120

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
    // Spread likes and dates so "trending" and "newest" are both meaningful.
    likes: Math.floor(Math.random() * 240),
    commentCount: 0,
    // Each idea a few hours older than the previous → stable newest ordering.
    createdAt: new Date(now.getTime() - i * 6 * 3600 * 1000),
    updatedAt: new Date(now.getTime() - i * 6 * 3600 * 1000),
  }));

  await db.collection('ideas').deleteMany({ authorId: user._id.toString() });
  await db.collection('ideas').insertMany(docs);

  // Create indexes once here (rather than on every serverless cold start).
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('ideas').createIndex({ createdAt: -1 });
  await db.collection('ideas').createIndex({ authorId: 1 });
  await db.collection('comments').createIndex({ ideaId: 1 });
  await db.collection('comments').createIndex({ userId: 1 });

  console.log(`Seeded ${docs.length} ideas.`);
  console.log('Demo login → email: demo@ideavault.app  password: Demo123');
} finally {
  await client.close();
}
