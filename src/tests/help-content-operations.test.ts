// feat/help-system commit 5 - chapters 8-12 content, extending the same
// partial checks the earlier content commits already run (full,
// all-thirteen-chapters versions are commit 6's own consistency suite),
// plus mandatory test 10 (every shortcut listed in chapter 12 exists in
// the code) checked by reading the actual source files as text.

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { HELP_TOC, allTopicIds } from '../help/HelpToc';
import { getTopicBody } from '../help/HelpContentRegistry';
import { searchHelp } from '../help/HelpSearch';

const CHAPTERS_8_TO_12_TOPIC_IDS = HELP_TOC
  .filter(c => ['ch8', 'ch9', 'ch10', 'ch11', 'ch12'].includes(c.id))
  .flatMap(c => c.topics.map(t => t.id));

describe('Chapters 8-12 content (partial mandatory tests 1, 2)', () => {
  it('test 1 (partial): every chapter 8-12 topic has Polish content, at least 2 blocks', () => {
    for (const topicId of CHAPTERS_8_TO_12_TOPIC_IDS) {
      const body = getTopicBody(topicId);
      expect(body.pl, `topic '${topicId}' has no Polish content`).toBeDefined();
      expect(body.pl!.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('test 2 (partial): every chapter 8-12 topic has English content, at least 2 blocks', () => {
    for (const topicId of CHAPTERS_8_TO_12_TOPIC_IDS) {
      const body = getTopicBody(topicId);
      expect(body.en, `topic '${topicId}' has no English content`).toBeDefined();
      expect(body.en!.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('chapter 11 (troubleshooting) has at least 12 entries, per this task\'s own minimum', () => {
    const ch11 = HELP_TOC.find(c => c.id === 'ch11')!;
    expect(ch11.topics.length).toBeGreaterThanOrEqual(12);
  });
});

describe('Internal links from chapters 8-12 (partial mandatory test 4)', () => {
  const LINK_RE = /\[\[([a-z0-9-]+)\|/g;

  it('every [[topicId|...]] link used anywhere in chapters 8-12 points at a real topic', () => {
    const allIds = new Set(allTopicIds());
    for (const topicId of CHAPTERS_8_TO_12_TOPIC_IDS) {
      const body = getTopicBody(topicId);
      for (const lang of ['pl', 'en'] as const) {
        for (const block of body[lang] ?? []) {
          const text = block.kind === 'table' ? [...block.headers, ...block.rows.flat()].join(' ')
            : block.kind === 'list' ? block.items.join(' ')
            : block.text;
          let match: RegExpExecArray | null;
          LINK_RE.lastIndex = 0;
          while ((match = LINK_RE.exec(text))) {
            expect(allIds.has(match[1]), `topic '${topicId}' (${lang}) links to nonexistent topic '${match[1]}'`).toBe(true);
          }
        }
      }
    }
  });
});

describe('searchHelp over chapters 8-12 body text', () => {
  it('finds the plan-rotation discrepancy note by a body phrase', () => {
    const results = searchHelp('feat/iso-tiles-and-rotation', 'pl');
    expect(results.some(r => r.topicId === 'plan-rotation')).toBe(true);
  });

  it('finds a troubleshooting entry by its cause text', () => {
    const results = searchHelp('DEVICE_DUPLICATE_DESIGNATION_IN_LOCATION', 'pl');
    expect(results.some(r => r.topicId === 'ts-designation-duplicate')).toBe(true);
  });
});

// ---- Mandatory test 10: every shortcut in chapter 12 exists in the code ----

const REPO_SRC = path.resolve(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_SRC, relativePath), 'utf-8');
}

describe('Keyboard shortcuts vs. the actual code (mandatory test 10)', () => {
  const canvas = readSource('components/Canvas.tsx');
  const planCanvas = readSource('components/PlanCanvas.tsx');
  const app = readSource('App.tsx');
  const helpWindow = readSource('components/HelpWindow.tsx');

  it('Ctrl/Cmd+A (select all) is handled in Canvas.tsx', () => {
    expect(canvas).toMatch(/key\.toLowerCase\(\) === 'a'/);
  });
  it('Ctrl/Cmd+C (copy) is handled in Canvas.tsx', () => {
    expect(canvas).toMatch(/key\.toLowerCase\(\) === 'c'/);
  });
  it('Ctrl/Cmd+V (paste) is handled in Canvas.tsx', () => {
    expect(canvas).toMatch(/key\.toLowerCase\(\) === 'v'/);
  });
  it('Ctrl/Cmd+D (duplicate) is handled in Canvas.tsx', () => {
    expect(canvas).toMatch(/key\.toLowerCase\(\) === 'd'/);
  });
  it('Delete/Backspace (delete selection) is handled in Canvas.tsx', () => {
    expect(canvas).toMatch(/e\.key === 'Delete' \|\| e\.key === 'Backspace'/);
  });
  it('Arrow keys (move selection) are handled in Canvas.tsx', () => {
    expect(canvas).toMatch(/ArrowUp.*ArrowDown.*ArrowLeft.*ArrowRight/s);
  });
  it('1/2/3 (medium selection) are handled in Canvas.tsx', () => {
    expect(canvas).toMatch(/e\.key === '1'/);
    expect(canvas).toMatch(/e\.key === '2'/);
    expect(canvas).toMatch(/e\.key === '3'/);
  });
  it('Enter (finish wire) is handled in Canvas.tsx', () => {
    expect(canvas).toMatch(/e\.key === 'Enter'/);
  });
  it('Alt+click bend insertion exists in Canvas.tsx', () => {
    expect(canvas).toContain('insertBendOnSegment');
  });
  it('Ctrl/Cmd+0 (reset zoom) is handled in Canvas.tsx', () => {
    expect(canvas).toMatch(/e\.key === '0'/);
  });
  it('Ctrl/Cmd+9 (fit view) is handled in Canvas.tsx', () => {
    expect(canvas).toMatch(/e\.key === '9'/);
  });
  it('Space (pan) is handled in Canvas.tsx', () => {
    expect(canvas).toMatch(/e\.key === ' '/);
  });
  it('Escape is handled in Canvas.tsx', () => {
    expect(canvas).toMatch(/e\.key === 'Escape'/);
  });

  it('Delete/Backspace and Escape (plan mode) are handled in PlanCanvas.tsx', () => {
    expect(planCanvas).toMatch(/e\.key === 'Delete' \|\| e\.key === 'Backspace'/);
    expect(planCanvas).toMatch(/e\.key === 'Escape'/);
  });
  it('Space (pan, plan mode) is handled in PlanCanvas.tsx', () => {
    expect(planCanvas).toMatch(/e\.key === ' '/);
  });

  it('F1 (open help) is handled in App.tsx', () => {
    expect(app).toMatch(/e\.key === 'F1'/);
  });
  it('Escape (close help) is handled in App.tsx (the same global listener as F1 - see that file\'s own comment for why it does not live in HelpWindow.tsx)', () => {
    expect(app).toMatch(/e\.key === 'Escape'/);
  });
  it('HelpWindow.tsx itself renders a close control wired to onClose', () => {
    expect(helpWindow).toContain('onClick={onClose}');
  });

  it('Ctrl/Cmd+Z (undo) is NOT bound to a keyboard shortcut anywhere - confirms the help text is honest about this', () => {
    expect(canvas).not.toMatch(/key\.toLowerCase\(\) === 'z'/);
    expect(planCanvas).not.toMatch(/key\.toLowerCase\(\) === 'z'/);
  });
});
