import { describe, expect, it } from 'vitest';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const categorizer = await import(pathToFileURL(resolve(import.meta.dirname, '../public/resource-categorizer.js')).href);

describe('universal Store resource categorization', () => {
  it('normalizes coping aliases into the approved Coping & Emotional Regulation Recovery Topic', () => {
    const result = categorizer.recommendCollection({ fileName: '100 Coping Strategies.pdf', title: 'Healthy Coping Toolbox' });
    expect(result.suggestedCollection).toBe('Coping & Emotional Regulation');
    expect(result.state).toBe('high');
    expect(result.confidence).toBeGreaterThanOrEqual(88);
  });

  it('recognizes the user-defined craving and identity aliases without creating duplicates', () => {
    expect(categorizer.recommendCollection({ fileName: 'My Craving Survival Plan.pdf' }).suggestedCollection).toBe('Triggers, Cravings & Relapse');
    expect(categorizer.recommendCollection({ title: 'Who Am I Without Drugs?' }).suggestedCollection).toBe('Identity & Self-Discovery');
  });

  it('offers editable metadata suggestions while preserving provided description text', () => {
    const suggestion = categorizer.suggestResourceMetadata({
      fileName: 'Finding Meaning After Addiction.pdf',
      description: 'Owner-approved description.',
      tags: 'values, recovery',
    });
    expect(suggestion.collection).toBe('Meaning, Purpose & Spirituality');
    expect(suggestion.description).toBe('Owner-approved description.');
    expect(suggestion.title).toBe('Finding Meaning After Addiction');
    expect(suggestion.tags).toContain('Meaning, Purpose & Spirituality');
    expect(suggestion.suggestedPrice).toMatch(/^\d+\.\d{2}$/);
  });

  it('does not guess when no established collection matches and proposes an editable clean name', () => {
    const result = categorizer.recommendCollection({ fileName: 'Creative Recovery Collage.pdf', title: 'Creative Recovery Collage' });
    expect(result.state).toBe('no-match');
    expect(result.confidence).toBe(0);
    expect(result.suggestedCollection).toBe('Creative Recovery Collage Resources');
  });

  it('requires review and offers the closest candidates for a weak but relevant signal', () => {
    const result = categorizer.recommendCollection({ title: 'Values Reflection' });
    expect(result.state).toBe('medium');
    expect(result.confidence).toBeGreaterThanOrEqual(55);
    expect(result.confidence).toBeLessThan(88);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates.map(candidate => candidate.name)).toEqual(['Values & Decision-Making']);
  });

  it('uses the supplied single Recovery Topic taxonomy and formats for editable recommendations', () => {
    expect(categorizer.storeTopics()).toEqual([
      'Identity & Self-Discovery', 'Relationships & Boundaries', 'Grief, Loss & Letting Go', 'Treatment & Recovery Planning', 'Coping & Emotional Regulation', 'Triggers, Cravings & Relapse', 'Trauma & Healing', 'Responsibility & Personal Growth', 'Meaning, Purpose & Spirituality', 'Life Skills & Independent Living', 'Addiction Education', 'Reasons for Using', 'Shame, Guilt & Forgiveness', 'Anger & Conflict', 'Anxiety, Fear & Worry', 'Depression & Motivation', 'Thoughts & Cognitive Patterns', 'Mindfulness & Self-Awareness', 'Values & Decision-Making', 'Habits, Routine & Structure', 'Motivation & Readiness for Change', 'Recovery Capital & Support Systems', 'Family & Addiction', 'Boredom, Fun & Recreation', 'Work, Education & Career', 'Money & Financial Recovery', 'Resilience & Setbacks', 'Trust & Repair', 'Loneliness, Isolation & Connection', 'Goals & Future Planning', 'Recovery Maintenance',
    ]);
    expect(categorizer.STORE_FORMATS).toEqual(expect.arrayContaining(['Planner', 'Psychoeducation Handout', 'Group Resource', 'Facilitator Guide']));
    expect(categorizer.suggestResourceMetadata({ fileName: 'My Recovery Planner.pdf' }).type).toBe('Planner');
    const fallbackDescription = categorizer.suggestResourceMetadata({ fileName: 'My Recovery Planner.pdf' }).description;
    expect(fallbackDescription).toContain('focused education, guided reflection, and purposeful exercises');
    expect(fallbackDescription.split('.').filter(Boolean).length).toBeGreaterThanOrEqual(2);
  });

  it('maps only clear legacy topic labels to explicit Recovery Topics without treating ordinary tags as assignments', () => {
    expect(categorizer.resolveExplicitStoreTopic('Coping Skills')).toBe('Coping & Emotional Regulation');
    expect(categorizer.resolveExplicitStoreTopic('Recovery Planning')).toBe('Treatment & Recovery Planning');
    expect(categorizer.resolveExplicitStoreTopic('trust')).toBe('');
    expect(categorizer.resolveStoreTopic('trust')).toBe('Trust & Repair');
  });
});
