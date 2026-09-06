export const STORE_FORMATS = [
  'Worksheet', 'Workbook', 'Packet', 'Activity', 'Recovery Tool', 'Planner',
  'Psychoeducation Handout', 'Group Resource', 'Facilitator Guide',
];

// This is the one Recovery Topic taxonomy used by the Store and Resource
// Manager. `category` remains available for legacy Store organization; the
// topic filters use explicit canonical values stored in topic_tags instead.
const MASTER_TOPICS = [
  { name: 'Identity & Self-Discovery', aliases: ['identity', 'self discovery', 'self-discovery', 'who am i', 'who am i without addiction', 'identity beyond addiction', 'true self'], keywords: ['roles', 'strengths', 'becoming'], type: 'Workbook', price: '4.99' },
  { name: 'Relationships & Boundaries', aliases: ['relationships', 'relationship', 'boundaries', 'healthy boundaries', 'communication'], keywords: ['limits', 'connection', 'i statements'], type: 'Worksheet', price: '4.99' },
  { name: 'Grief, Loss & Letting Go', aliases: ['grief', 'loss', 'letting go', 'bereavement', 'mourning'], keywords: ['goodbye', 'sadness', 'losses'], type: 'Worksheet', price: '4.99' },
  { name: 'Treatment & Recovery Planning', aliases: ['treatment planning', 'recovery planning', 'recovery plan', 'recovery planner', 'continuing care plan'], keywords: ['action plan', 'support map', 'next seven days'], type: 'Planner', price: '4.99' },
  { name: 'Coping & Emotional Regulation', aliases: ['coping skills', 'coping strategies', 'coping strategy', 'coping toolbox', 'healthy coping', 'coping tools', 'emotional wellness', 'emotional regulation', 'emotion regulation'], keywords: ['grounding', 'self soothing', 'distress tolerance'], type: 'Worksheet', price: '4.99' },
  { name: 'Triggers, Cravings & Relapse', aliases: ['triggers', 'trigger', 'cravings', 'craving', 'urges', 'urge surfing', 'relapse prevention', 'relapse plan', 'warning signs', 'return to use'], keywords: ['high risk situations', 'cue', 'craving cycle', 'lapse'], type: 'Packet', price: '6.99' },
  { name: 'Trauma & Healing', aliases: ['trauma', 'traumatic', 'trauma healing', 'healing from trauma'], keywords: ['survivor', 'safety', 'nervous system'], type: 'Worksheet', price: '4.99' },
  { name: 'Responsibility & Personal Growth', aliases: ['responsibility', 'personal growth', 'accountability', 'owning my choices'], keywords: ['growth', 'self leadership', 'ownership'], type: 'Workbook', price: '4.99' },
  { name: 'Meaning, Purpose & Spirituality', aliases: ['meaning', 'purpose', 'finding purpose', 'life worth living', 'meaning after addiction', 'spirituality', 'spiritual', 'existential'], keywords: ['contribution', 'faith', 'belief'], type: 'Worksheet', price: '4.99' },
  { name: 'Life Skills & Independent Living', aliases: ['life skills', 'independent living', 'life in recovery', 'recovery lifestyle'], keywords: ['daily living', 'adulting', 'independence'], type: 'Recovery Tool', price: '4.99' },
  { name: 'Addiction Education', aliases: ['understanding addiction', 'addiction education', 'addiction and the brain', 'brain and addiction', 'addiction neuroscience'], keywords: ['dopamine', 'reward cycle', 'neuroplasticity'], type: 'Psychoeducation Handout', price: '5.99' },
  { name: 'Reasons for Using', aliases: ['function of addiction', 'what was my addiction doing for me', 'why addiction', 'addiction function', 'reasons for using'], keywords: ['survival', 'reinforcement', 'protective function'], type: 'Worksheet', price: '4.99' },
  { name: 'Shame, Guilt & Forgiveness', aliases: ['shame', 'guilt', 'forgiveness', 'self forgiveness'], keywords: ['self compassion', 'amends'], type: 'Worksheet', price: '4.99' },
  { name: 'Anger & Conflict', aliases: ['anger', 'anger management', 'conflict', 'fighting'], keywords: ['irritability', 'repair conversation'], type: 'Worksheet', price: '4.99' },
  { name: 'Anxiety, Fear & Worry', aliases: ['anxiety', 'fear', 'worry', 'panic'], keywords: ['anxious', 'uncertainty'], type: 'Worksheet', price: '4.99' },
  { name: 'Depression & Motivation', aliases: ['depression', 'depressed', 'low mood', 'motivation'], keywords: ['energy', 'hope', 'activation'], type: 'Worksheet', price: '4.99' },
  { name: 'Thoughts & Cognitive Patterns', aliases: ['thoughts', 'cognitive patterns', 'thinking patterns', 'beliefs', 'distortions'], keywords: ['automatic thoughts', 'reframing'], type: 'Worksheet', price: '4.99' },
  { name: 'Mindfulness & Self-Awareness', aliases: ['mindfulness', 'self awareness', 'self-awareness', 'present moment'], keywords: ['observe', 'notice', 'body awareness'], type: 'Worksheet', price: '4.99' },
  { name: 'Values & Decision-Making', aliases: ['values', 'values clarification', 'decision making', 'decision-making', 'choices'], keywords: ['priorities', 'decisional balance'], type: 'Worksheet', price: '4.99' },
  { name: 'Habits, Routine & Structure', aliases: ['habits', 'routine', 'structure', 'daily routine'], keywords: ['schedule', 'consistency', 'daily plan'], type: 'Planner', price: '4.99' },
  { name: 'Motivation & Readiness for Change', aliases: ['readiness for change', 'change talk', 'ambivalence', 'stages of change'], keywords: ['commitment', 'confidence', 'change plan'], type: 'Worksheet', price: '4.99' },
  { name: 'Recovery Capital & Support Systems', aliases: ['recovery capital', 'support systems', 'support system', 'support network'], keywords: ['resources', 'community', 'peer support'], type: 'Recovery Tool', price: '4.99' },
  { name: 'Family & Addiction', aliases: ['family recovery', 'family addiction', 'family support', 'family healing', 'enabling'], keywords: ['loved one', 'parenting', 'family system'], type: 'Packet', price: '6.99' },
  { name: 'Boredom, Fun & Recreation', aliases: ['boredom', 'fun', 'recreation', 'leisure'], keywords: ['enjoyment', 'play', 'activities'], type: 'Activity', price: '4.99' },
  { name: 'Work, Education & Career', aliases: ['work', 'education', 'career', 'employment', 'school'], keywords: ['job', 'workplace', 'learning'], type: 'Worksheet', price: '4.99' },
  { name: 'Money & Financial Recovery', aliases: ['money', 'financial recovery', 'finances', 'budget', 'debt'], keywords: ['spending', 'financial'], type: 'Planner', price: '4.99' },
  { name: 'Resilience & Setbacks', aliases: ['resilience', 'setbacks', 'setback', 'recovery from setbacks'], keywords: ['bounce back', 'perseverance'], type: 'Worksheet', price: '4.99' },
  { name: 'Trust & Repair', aliases: ['trust', 'rebuilding trust', 'trust repair', 'repair'], keywords: ['reliability', 'integrity'], type: 'Worksheet', price: '4.99' },
  { name: 'Loneliness, Isolation & Connection', aliases: ['loneliness', 'isolation', 'connection', 'alone'], keywords: ['belonging', 'relationships'], type: 'Worksheet', price: '4.99' },
  { name: 'Goals & Future Planning', aliases: ['goals', 'future planning', 'future goals', 'goal planning'], keywords: ['vision', 'next steps'], type: 'Planner', price: '4.99' },
  { name: 'Recovery Maintenance', aliases: ['long term recovery', 'long-term recovery', 'sustained recovery', 'recovery maintenance', 'maintenance'], keywords: ['milestone', 'anniversary', 'continuing care'], type: 'Planner', price: '4.99' },
];

const STOP_WORDS = new Set(['a', 'an', 'and', 'for', 'from', 'in', 'of', 'on', 'the', 'to', 'with', 'your', 'my', 'pdf', 'worksheet', 'packet', 'workbook', 'guide', 'resource']);
const normalized = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const exactPhrase = (text, phrase) => { const target = normalized(phrase); return target && ` ${text} `.includes(` ${target} `); };
const LEGACY_EXPLICIT_TOPICS = Object.freeze({
  'Coping Skills': 'Coping & Emotional Regulation',
  'Triggers, Cravings & Urges': 'Triggers, Cravings & Relapse',
  'Relapse Prevention': 'Triggers, Cravings & Relapse',
  'Recovery Planning': 'Treatment & Recovery Planning',
  'Understanding Addiction': 'Addiction Education',
  'Emotional Wellness': 'Coping & Emotional Regulation',
  'Meaning, Values & Purpose': 'Meaning, Purpose & Spirituality',
  'Family & Recovery': 'Family & Addiction',
  'Trauma, Grief & Healing': 'Trauma & Healing',
  'Motivation & Change': 'Motivation & Readiness for Change',
  'Life in Recovery': 'Life Skills & Independent Living',
  'Spirituality & Existential Recovery': 'Meaning, Purpose & Spirituality',
  'Long-Term Recovery': 'Recovery Maintenance',
});

export const storeTopics = () => MASTER_TOPICS.map(topic => topic.name);
// Kept for existing Resource Manager callers; the former collection is now an
// owner-approved Recovery Topic.
export const collectionNames = storeTopics;
export const normalizeCollectionName = value => String(value ?? '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, character => character.toUpperCase());
export const resolveExplicitStoreTopic = value => {
  const source = normalized(value);
  if (!source) return '';
  const canonical = MASTER_TOPICS.find(topic => normalized(topic.name) === source)?.name;
  if (canonical) return canonical;
  return Object.entries(LEGACY_EXPLICIT_TOPICS).find(([legacy]) => normalized(legacy) === source)?.[1] || '';
};
export const resolveStoreTopic = value => {
  const source = normalized(value);
  if (!source) return '';
  const explicit = resolveExplicitStoreTopic(value);
  if (explicit) return explicit;
  const match = MASTER_TOPICS.find(topic => topic.aliases.some(alias => normalized(alias) === source));
  return match?.name || '';
};

const sourceText = ({ fileName = '', title = '', description = '', tags = '', extractedText = '' } = {}) => normalized([fileName, title, description, Array.isArray(tags) ? tags.join(' ') : tags, extractedText].filter(Boolean).join(' '));
const sourceTokens = text => [...new Set(normalized(text).split(' ').filter(token => token.length > 2 && !STOP_WORDS.has(token)))];
const bestNewCollectionName = input => {
  const words = sourceTokens(`${input.title || ''} ${input.fileName || ''} ${input.description || ''}`);
  const subject = words.slice(0, 5).map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
  return subject ? `${subject} Resources` : 'New Recovery Resource Topic';
};
const descriptionFor = ({ title, collection, type }) => `${String(title || 'This resource').trim()} is a practical ${String(type || 'resource').toLowerCase()} that explores ${String(collection || 'recovery').toLowerCase()} through focused education, guided reflection, and purposeful exercises. Readers can use it to recognize relevant patterns, strengthen self-awareness, and identify realistic next steps that support recovery and personal growth.`;
const typeFromSource = input => {
  const text = sourceText(input);
  if (/\b(workbook|journal)\b/.test(text)) return 'Workbook';
  if (/\b(planner|planning)\b/.test(text)) return 'Planner';
  if (/\b(facilitator|facilitation)\b/.test(text)) return 'Facilitator Guide';
  if (/\b(group|group session|group therapy)\b/.test(text)) return 'Group Resource';
  if (/\b(packet|toolkit|bundle)\b/.test(text)) return 'Packet';
  if (/\b(activity|exercise|game|card sort)\b/.test(text)) return 'Activity';
  if (/\b(tool|tracker|check in)\b/.test(text)) return 'Recovery Tool';
  if (/\b(guide|education|psychoeducation|neuroscience)\b/.test(text)) return 'Psychoeducation Handout';
  return 'Worksheet';
};
const tagsFor = (input, winner) => {
  const text = sourceText(input);
  const existing = Array.isArray(input.tags) ? input.tags : String(input.tags || '').split(',');
  const matched = winner ? [...winner.aliases, ...winner.keywords].filter(term => exactPhrase(text, term)) : [];
  return [...new Set([...existing, ...(winner ? [winner.name] : []), ...matched].map(normalizeCollectionName).filter(Boolean))].slice(0, 12);
};

export function recommendCollection(input = {}, options = {}) {
  const text = sourceText(input);
  const available = [...new Set([...(options.existingCollections || []), ...collectionNames()])];
  const profiles = MASTER_TOPICS.filter(profile => available.includes(profile.name));
  const scored = profiles.map(profile => {
    const hits = [...profile.aliases, ...profile.keywords].filter(term => exactPhrase(text, term));
    const score = hits.reduce((total, term) => total + Math.min(5, normalized(term).split(' ').length) * (profile.aliases.includes(term) ? 3 : 1), 0);
    return { name: profile.name, score, hits };
  }).filter(candidate => candidate.score > 0).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const top = scored[0];
  if (!top) return { state: 'no-match', confidence: 0, suggestedCollection: bestNewCollectionName(input), candidates: [], matchedTerms: [] };
  const runnerUp = scored[1]?.score || 0;
  const confidence = Math.min(99, Math.max(18, Math.round(35 + top.score * 8 + Math.min(20, (top.score - runnerUp) * 3))));
  const state = confidence >= 88 ? 'high' : confidence >= 55 ? 'medium' : 'low';
  return { state, confidence, suggestedCollection: top.name, candidates: scored.slice(0, 3).map(candidate => ({ ...candidate, confidence: Math.max(18, Math.min(99, Math.round(48 + candidate.score * 6))) })), matchedTerms: top.hits };
}

export function suggestResourceMetadata(input = {}, options = {}) {
  const recommendation = recommendCollection(input, options);
  const profile = MASTER_TOPICS.find(item => item.name === recommendation.suggestedCollection);
  const title = normalizeCollectionName(input.title || String(input.fileName || '').replace(/\.(pdf|docx|pptx)$/i, ''));
  const type = typeFromSource({ ...input, title });
  const collection = recommendation.suggestedCollection;
  return { title, collection, description: String(input.description || '').trim() || descriptionFor({ title, collection, type }), type: profile?.type && type === 'Worksheet' ? profile.type : type, tags: tagsFor(input, profile), suggestedPrice: profile?.price || '4.99', recommendation };
}

export async function extractPdfInsights(file) {
  if (!file || !/\.pdf$/i.test(file.name || '')) return { extractedText: '', pageCount: null };
  const buffer = await file.arrayBuffer();
  const raw = new TextDecoder('latin1').decode(buffer);
  const text = [...raw.matchAll(/\(([^()]{3,240})\)/g)].map(match => match[1].replace(/\\([nrtbf()\\])/g, (_, character) => ({ n: ' ', r: ' ', t: ' ', b: ' ', f: ' ', '(': '(', ')': ')', '\\': '\\' }[character] || ' '))).filter(value => /[a-z]{2}/i.test(value)).join(' ').replace(/\s+/g, ' ').slice(0, 12_000);
  const pageMarkers = raw.match(/\/Type\s*\/Page\b/g)?.length || 0;
  return { extractedText: text, pageCount: pageMarkers || null };
}

export async function analyzeResourceFile(file, input = {}, options = {}) {
  const insights = await extractPdfInsights(file);
  const suggestion = suggestResourceMetadata({ ...input, fileName: file?.name || '', extractedText: insights.extractedText }, options);
  return { ...suggestion, extractedText: insights.extractedText, pageCount: insights.pageCount };
}
