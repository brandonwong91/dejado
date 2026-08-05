import { z } from 'zod';
import { TRAITS } from '../utils/confidence';

/**
 * Structured output contracts for the two LLM calls in the pipeline.
 *
 * Prohibited inference categories are named in the prompts and stripped here as
 * well — the model is asked not to produce them, and parsing does not trust
 * that it complied.
 */

export const PROHIBITED_CATEGORIES = [
  'health',
  'medical',
  'sexual orientation',
  'religion',
  'political affiliation',
  'ethnicity',
  'race',
  'immigration status',
  'precise location'
];

export const topicSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(48)
    .transform((s) =>
      s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    ),
  label: z.string().min(1).max(60),
  category: z
    .enum([
      'work',
      'health',
      'finance',
      'relationships',
      'hobbies',
      'learning',
      'travel',
      'food',
      'technology',
      'media',
      'home',
      'general'
    ])
    .catch('general')
});

export const messageSignalsSchema = z.object({
  messageId: z.string(),
  topics: z.array(topicSchema).max(6).default([]),
  entities: z.array(z.string().max(60)).max(8).default([]),
  intent: z
    .enum([
      'share',
      'ask',
      'plan',
      'vent',
      'decide',
      'reflect',
      'joke',
      'other'
    ])
    .catch('other'),
  sentiment: z.number().min(-1).max(1).catch(0),
  arousal: z.number().min(0).max(1).catch(0.5),
  emotion: z
    .enum([
      'joy',
      'anger',
      'fear',
      'sadness',
      'surprise',
      'anticipation',
      'neutral'
    ])
    .catch('neutral'),
  formality: z.number().min(0).max(1).catch(0.5),
  concreteness: z.number().min(0).max(1).catch(0.5),
  goals: z.array(z.string().max(140)).max(3).default([]),
  preferences: z
    .array(
      z.object({
        subject: z.string().max(60),
        polarity: z.number().min(-1).max(1).catch(0)
      })
    )
    .max(4)
    .default([])
});

export type MessageSignals = z.infer<typeof messageSignalsSchema>;

export const enrichBatchSchema = z.object({
  messages: z.array(messageSignalsSchema)
});

const traitSchema = z.object({
  score: z.number().min(0).max(1).nullable().catch(null),
  confidence: z.number().min(0).max(1).catch(0),
  summary: z.string().max(240).default(''),
  evidence: z.array(z.string().max(200)).max(3).default([])
});

export type TraitReading = z.infer<typeof traitSchema>;

export const traitsSchema = z.object(
  Object.fromEntries(TRAITS.map((t) => [t, traitSchema])) as Record<
    (typeof TRAITS)[number],
    typeof traitSchema
  >
);

export const rollupSchema = z.object({
  traits: traitsSchema,
  archetype: z
    .enum(['analytical', 'driver', 'amiable', 'expressive'])
    .nullable()
    .catch(null),
  values: z.array(z.string().max(40)).max(6).default([])
});

export const starterKindSchema = z.enum([
  'follow_up',
  'deep_dive',
  'revival',
  'adjacency',
  'gap_probe',
  'temporal',
  'cross_feature'
]);

export type StarterKind = z.infer<typeof starterKindSchema>;

export const starterSchema = z.object({
  text: z.string().min(4).max(180),
  kind: starterKindSchema.catch('deep_dive'),
  anchorSlug: z.string().max(48).nullable().default(null),
  rationale: z.string().max(200).default('')
});

export const starterBatchSchema = z.object({
  starters: z.array(starterSchema).max(8)
});

export const personaStyleSchema = z.object({
  identity: z.string().max(600),
  voiceRules: z.array(z.string().max(180)).max(10).default([]),
  interests: z.array(z.string().max(140)).max(12).default([])
});
