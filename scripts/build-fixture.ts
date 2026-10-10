/**
 * Fixture builder.
 *
 * Writes `fixtures/session-01/` — a complete session on disk, produced by the
 * same store, renderers and Mermaid serializers the real pipeline uses. That is
 * the point: the fixture cannot drift from the shapes the server writes, and
 * mock mode exercises identical code paths.
 *
 * Run with `npm run fixture`.
 */
import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EvidenceListSchema } from '../shared/schema/index';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildRoot = path.join(os.tmpdir(), `devlog-fixture-${process.pid}`);

// Must be set before the server modules read their configuration.
process.env.DATA_DIR = buildRoot;
process.env.MOCK = '1';

const SESSION_ID = 'session-01';
const DAY = '2026-10-08';
const at = (hhmmss: string) => `${DAY}T${hhmmss}Z`;

const { FILES, ensureSessionDirs, loadBundle, writeJson } = await import('../server/store/sessionStore');
const { regenerateArtifacts } = await import('../server/lib/artifacts');
const { emit, finishRun, flushWrites, startRun } = await import('../server/lib/runs');
const { serializeHardwareDiagram, serializeIdeaDiagram, serializeBuildSteps } = await import(
  '../server/lib/mermaid'
);

const PHOTO_1 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB2NTnult9Dz88GYp_cQ9HNWJIsfpcRfzHOfnhgxoJQUkmBGFvdW_OLW4VrNHBqVMuQrMZPUpe9-432S8biG2SwOssNscoRFtp0dfAXB5irYuBBQhnQQPGH8hFJOTozD8nY2h0N0jWo69Xi847G6a5C2KD3R6qzxLo_qJVY5QXOkM_FDAktoPKFDnqeuTCknO3wUps7NcsvmxY1WX82zj_uZNdCaO_v0ZqJ57bd6jqdO04rQlviFqo_uw';
const PHOTO_2 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAE_mZBQF9gy4lEqfYk9ujZDogPUWAtEjl6PT6m9pG7FvaKfVhOP-pCtSYDaT2I7rzsOXKcUInCR9V83ZtfQ4VL4Q5fiTZc74jcLCEkQ494Q25eEXvvsScIxtIgLznziNo4TdcXv4VbbJDQMuOhjIDBQq0--lJot9xRm-iWD1Y4x8NIEoBVuoojLWmEtPVTAmPsKkmPxeImDz8qw1r13k9ZT2cDfRUyA5gpC-QibKvg0zTcz5PYt-dcQw';
const PHOTO_3 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBdLHm1EQItQZ6w8ifxoODg93Dj-cav1si-VKOnfVQnTpwSl672AqKFnG7Sy8tvo91JjL3crjPoBXos5d5rvgq7GhjtFqcqFhN32KfmR7jay4BNRiMsWI5FjL_pYThUcTq2dWnV7FrzXsq8QEawH_3iXNc7R_9qJKERhyKVsNDOiKRrgQZ1E1GWooa6aE_XTyS8AqNo4hdHPDD3WTPRJt_1zIG03deSaWOaUhMJtyTbvzm_Uqi9OTnoMA';

/* -------------------------------------------------------------------------- */
/* Evidence                                                                    */
/* -------------------------------------------------------------------------- */

const QUOTES = {
  q1: 'Pin five on the ESP32 is driving the five volt relay coil. Every time the coil drops out, the whole board resets.',
  q2: 'Probe is on the three point three volt rail. Minimum two point six five volts at the moment the coil lets go.',
  q3: 'Debounce did not help. It still resets, so this is not a timing problem.',
  q4: 'Brownout is gone after fitting the flyback diode. The rail holds three point two eight volts across fifty actuations.',
};

function words(text: string, startSec: number): { text: string; start: number; end: number }[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const per = 0.28;
  return tokens.map((token, i) => ({
    text: token,
    start: Number((startSec + i * per).toFixed(2)),
    end: Number((startSec + (i + 1) * per).toFixed(2)),
  }));
}

const evidence = [
  {
    id: 'ev-voice-1',
    kind: 'voice',
    sourceTag: 'voice 14:02',
    label: 'Relay actuation resets the controller',
    detail: QUOTES.q1,
    instant: at('14:02:11'),
    instantIsNaive: false,
    order: 1,
    verification: 'Scribe v2 word timing · 0.0s–6.4s into audio-1',
    voice: {
      audioId: 'audio-1',
      span: { startSec: 0, endSec: 6.4 },
      quote: QUOTES.q1,
      words: words(QUOTES.q1, 0),
      transcriptId: 'audio-1-seg-1',
    },
  },
  {
    id: 'ev-photo-1',
    kind: 'photo',
    sourceTag: 'photo 1',
    label: 'Probe on the 3.3 V rail during coil dropout',
    detail: 'Bench capture, channel 1 DC coupled',
    instant: `${DAY}T14:08:19`,
    instantIsNaive: true,
    order: 2,
    verification: 'EXIF 14:08:19 (timezone-naive)',
    photo: {
      mediaId: 'photo-1',
      url: PHOTO_1,
      caption: 'Probing the 3.3 V rail while the relay switches',
      exif: { takenAt: `${DAY}T14:08:19`, device: 'Bench camera', note: 'timezone-naive EXIF' },
    },
  },
  {
    id: 'ev-voice-2',
    kind: 'voice',
    sourceTag: 'voice 14:09',
    label: 'Rail sags to 2.65 V at coil dropout',
    detail: QUOTES.q2,
    instant: at('14:09:03'),
    instantIsNaive: false,
    order: 3,
    verification: 'Scribe v2 word timing · 8.1s–14.6s into audio-1',
    voice: {
      audioId: 'audio-1',
      span: { startSec: 8.1, endSec: 14.6 },
      quote: QUOTES.q2,
      words: words(QUOTES.q2, 8.1),
      transcriptId: 'audio-1-seg-2',
    },
  },
  {
    id: 'ev-commit-c4e12a',
    kind: 'commit',
    sourceTag: 'commit c4e12a',
    label: 'fix(firmware): add 15 ms software debounce to GPIO 5 output',
    detail: '2 files changed on main',
    instant: at('14:10:44'),
    instantIsNaive: false,
    order: 4,
    verification: 'git c4e12a · 2026-10-08T14:10:44Z',
    commit: {
      hash: 'c4e12a',
      subject: 'fix(firmware): add 15 ms software debounce to GPIO 5 output',
      branch: 'main',
      authoredAt: at('14:10:44'),
      filesChanged: 2,
      diffFile: 'firmware/relay.c',
      diff: [
        { lineNum: 18, content: 'gpio_set_direction(GPIO_NUM_5, GPIO_MODE_OUTPUT);', kind: 'context' },
        { lineNum: 19, content: 'vTaskDelay(pdMS_TO_TICKS(15)); // debounce coil switch', kind: 'added' },
        { lineNum: 20, content: 'gpio_set_level(GPIO_NUM_5, 1);', kind: 'context' },
      ],
    },
  },
  {
    id: 'ev-voice-3',
    kind: 'voice',
    sourceTag: 'voice 14:11',
    label: 'Debounce did not stop the resets',
    detail: QUOTES.q3,
    instant: at('14:11:26'),
    instantIsNaive: false,
    order: 5,
    verification: 'Scribe v2 word timing · 16.2s–20.8s into audio-1',
    voice: {
      audioId: 'audio-1',
      span: { startSec: 16.2, endSec: 20.8 },
      quote: QUOTES.q3,
      words: words(QUOTES.q3, 16.2),
      transcriptId: 'audio-1-seg-3',
    },
  },
  {
    id: 'ev-photo-2',
    kind: 'photo',
    sourceTag: 'photo 2',
    label: '1N4007 fitted across the coil terminals',
    detail: 'Macro inspection of the soldered diode',
    instant: `${DAY}T14:12:44`,
    instantIsNaive: true,
    order: 6,
    verification: 'EXIF 14:12:44 (timezone-naive)',
    photo: {
      mediaId: 'photo-2',
      url: PHOTO_2,
      caption: 'Flyback diode across the relay coil',
      exif: { takenAt: `${DAY}T14:12:44`, device: 'Bench camera', note: 'timezone-naive EXIF' },
    },
  },
  {
    id: 'ev-voice-4',
    kind: 'voice',
    sourceTag: 'voice 14:14',
    label: 'Rail holds 3.28 V across fifty actuations',
    detail: QUOTES.q4,
    instant: at('14:14:02'),
    instantIsNaive: false,
    order: 7,
    verification: 'Scribe v2 word timing · 24.5s–30.9s into audio-1',
    voice: {
      audioId: 'audio-1',
      span: { startSec: 24.5, endSec: 30.9 },
      quote: QUOTES.q4,
      words: words(QUOTES.q4, 24.5),
      transcriptId: 'audio-1-seg-4',
    },
  },
  {
    id: 'ev-photo-3',
    kind: 'photo',
    sourceTag: 'photo 3',
    label: 'Rail trace after the fix',
    detail: 'Second capture, same probe position',
    instant: `${DAY}T14:15:31`,
    instantIsNaive: true,
    order: 8,
    verification: 'EXIF 14:15:31 (timezone-naive)',
    photo: {
      mediaId: 'photo-3',
      url: PHOTO_3,
      caption: '3.3 V rail after the diode was fitted',
      exif: { takenAt: `${DAY}T14:15:31`, device: 'Bench camera', note: 'timezone-naive EXIF' },
    },
  },
  {
    id: 'ev-commit-8f9b02',
    kind: 'commit',
    sourceTag: 'commit 8f9b02',
    label: 'chore(docs): record 1N4007 in BOM and schematics',
    detail: '1 file changed on main',
    instant: at('14:19:08'),
    instantIsNaive: false,
    order: 9,
    verification: 'git 8f9b02 · 2026-10-08T14:19:08Z',
    commit: {
      hash: '8f9b02',
      subject: 'chore(docs): record 1N4007 in BOM and schematics',
      branch: 'main',
      authoredAt: at('14:19:08'),
      filesChanged: 1,
      diffFile: 'docs/BOM.md',
      diff: [
        { lineNum: 14, content: '| D1 | 1N4007 | DO-41 | Flyback diode for 5 V relay coil |', kind: 'added' },
      ],
    },
  },
  {
    id: 'ev-note-1',
    kind: 'note',
    sourceTag: 'note 1',
    label: 'Relay module part number not read off the silk',
    detail:
      'Generic 5 V SPDT relay board. The silk was covered by the terminal block, so the part number and coil resistance were never read during the session.',
    instant: at('14:20:00'),
    instantIsNaive: false,
    order: 10,
    verification: 'Typed note from capture/notes.txt',
    note: {
      text: 'Generic 5 V SPDT relay board. The silk was covered by the terminal block, so the part number and coil resistance were never read during the session.',
      origin: 'capture',
    },
  },
];

const transcript = {
  provider: 'fixture',
  model: 'scribe_v2 (fixture)',
  language: 'en',
  wordTimingAvailable: true,
  segments: evidence.flatMap((e) => {
    if (e.kind !== 'voice' || !e.voice) return [];
    const voice = e.voice;
    return [
      {
        id: voice.transcriptId,
        audioId: voice.audioId,
        text: voice.quote,
        start: voice.span.startSec,
        end: voice.span.endSec,
        words: voice.words,
        evidenceId: e.id,
      },
    ];
  }),
};

/* -------------------------------------------------------------------------- */
/* Hardware fact sheet                                                         */
/* -------------------------------------------------------------------------- */

const hardware = {
  nodes: [
    {
      id: 'vcc-5',
      name: '5 V supply rail',
      kind: 'supply',
      value: '5 V DC',
      sources: ['ev-voice-1'],
      hazard: false,
    },
    {
      id: 'rail-3v3',
      name: '3.3 V logic rail',
      kind: 'bus',
      value: '3.28 V steady after the fix',
      sources: ['ev-voice-4', 'ev-photo-1'],
      hazard: false,
    },
    {
      id: 'mcu',
      designator: 'U1',
      name: 'ESP32-WROOM-32',
      kind: 'mcu',
      value: '3.3 V logic',
      sources: ['ev-photo-1', 'ev-voice-1'],
      hazard: false,
    },
    {
      id: 'relay-coil',
      designator: 'K1',
      name: '5 V SPDT relay module',
      kind: 'actuator',
      value: '5 V DC coil',
      sources: ['ev-voice-1', 'ev-photo-1', 'ev-note-1'],
      hazard: false,
    },
    {
      id: 'd1',
      designator: 'D1',
      name: '1N4007 flyback diode',
      kind: 'protection',
      value: 'antiparallel across the coil',
      sources: ['ev-photo-2', 'ev-commit-8f9b02', 'ev-voice-4'],
      hazard: false,
    },
  ],
  edges: [
    {
      id: 'hw-edge-1',
      from: 'vcc-5',
      to: 'relay-coil',
      net: '5V',
      label: 'coil supply',
      style: 'solid',
      sources: ['ev-voice-1'],
      inferred: false,
    },
    {
      id: 'hw-edge-2',
      from: 'mcu',
      to: 'relay-coil',
      signal: 'GPIO 5',
      label: 'drive',
      style: 'solid',
      sources: ['ev-voice-1'],
      inferred: false,
    },
    {
      id: 'hw-edge-3',
      from: 'rail-3v3',
      to: 'mcu',
      net: '3V3',
      label: 'logic supply',
      style: 'solid',
      sources: ['ev-photo-1'],
      inferred: false,
    },
    {
      id: 'hw-edge-4',
      from: 'd1',
      to: 'relay-coil',
      label: 'clamps back-EMF',
      style: 'dashed',
      sources: ['ev-photo-2', 'ev-commit-8f9b02'],
      inferred: false,
    },
    {
      id: 'hw-edge-5',
      from: 'relay-coil',
      to: 'rail-3v3',
      label: 'transient coupling path',
      style: 'dashed',
      sources: ['ev-voice-2'],
      inferred: true,
    },
  ],
  diagrams: [],
};

/* -------------------------------------------------------------------------- */
/* Idea graph                                                                  */
/* -------------------------------------------------------------------------- */

const ideaClusters = [
    { id: 'power', title: 'Power and switching', subtitle: 'Rail behaviour under an inductive load' },
  { id: 'firmware', title: 'Firmware mitigation', subtitle: 'What a timing change can and cannot fix' },
];

const ideaNodes = [
    {
      id: 'reset-on-switch',
      clusterId: 'power',
      kind: 'observation',
      label: 'Board resets when the relay switches',
      detail: 'Every coil dropout restarted the controller.',
      instant: at('14:02:11'),
      sources: ['ev-voice-1'],
      hazard: true,
    },
    {
      id: 'rail-sag',
      clusterId: 'power',
      kind: 'observation',
      label: '3.3 V rail sags to 2.65 V',
      detail: 'Measured at the moment the coil lets go.',
      instant: at('14:09:03'),
      sources: ['ev-voice-2', 'ev-photo-1'],
      hazard: true,
    },
    {
      id: 'kickback-hypothesis',
      clusterId: 'power',
      kind: 'hypothesis',
      label: 'Coil back-EMF couples into the logic rail',
      detail: 'An unsuppressed inductive transient reaching the shared 3.3 V rail.',
      instant: at('14:09:03'),
      sources: ['ev-voice-2'],
      hazard: false,
    },
    {
      id: 'debounce-attempt',
      clusterId: 'firmware',
      kind: 'action',
      label: '15 ms software debounce on GPIO 5',
      detail: 'Committed as a first attempt at stopping the reset.',
      instant: at('14:10:44'),
      sources: ['ev-commit-c4e12a'],
      hazard: false,
    },
    {
      id: 'debounce-failed',
      clusterId: 'firmware',
      kind: 'observation',
      label: 'Resets persisted after the debounce',
      detail: 'The timing change made no difference to the fault.',
      instant: at('14:11:26'),
      sources: ['ev-voice-3'],
      hazard: true,
    },
    {
      id: 'timing-cannot-clamp',
      clusterId: 'firmware',
      kind: 'conclusion',
      label: 'Timing cannot suppress an inductive transient',
      detail: 'The fault is electrical, so the fix has to be electrical.',
      instant: at('14:11:26'),
      sources: ['ev-voice-3', 'ev-commit-c4e12a'],
      hazard: false,
    },
    {
      id: 'fit-diode',
      clusterId: 'power',
      kind: 'action',
      label: '1N4007 fitted antiparallel across the coil',
      detail: 'Soldered directly at the coil terminals.',
      instant: `${DAY}T14:12:44`,
      sources: ['ev-photo-2'],
      hazard: false,
    },
    {
      id: 'rail-stable',
      clusterId: 'power',
      kind: 'conclusion',
      label: 'Rail holds 3.28 V across fifty actuations',
      detail: 'Brownout no longer occurs after the diode was fitted.',
      instant: at('14:14:02'),
  sources: ['ev-voice-4', 'ev-photo-3'],
  hazard: false,
},
];

const ideaEdges = [
    { id: 'idea-edge-1', from: 'reset-on-switch', to: 'rail-sag', relation: 'leadsTo', label: 'probed the rail', sources: ['ev-voice-2'], inferred: false },
    { id: 'idea-edge-2', from: 'rail-sag', to: 'kickback-hypothesis', relation: 'leadsTo', label: 'suspected back-EMF', sources: ['ev-voice-2'], inferred: false },
    { id: 'idea-edge-3', from: 'kickback-hypothesis', to: 'debounce-attempt', relation: 'branches', label: 'tried software first', sources: ['ev-commit-c4e12a'], inferred: true },
    { id: 'idea-edge-4', from: 'debounce-attempt', to: 'debounce-failed', relation: 'leadsTo', sources: ['ev-voice-3'], inferred: false },
    { id: 'idea-edge-5', from: 'debounce-failed', to: 'timing-cannot-clamp', relation: 'refines', sources: ['ev-voice-3'], inferred: false },
    { id: 'idea-edge-6', from: 'debounce-failed', to: 'fit-diode', relation: 'leadsTo', label: 'moved to hardware', sources: ['ev-photo-2'], inferred: false },
    { id: 'idea-edge-7', from: 'fit-diode', to: 'rail-stable', relation: 'confirms', sources: ['ev-voice-4'], inferred: false },
  { id: 'idea-edge-8', from: 'kickback-hypothesis', to: 'rail-stable', relation: 'confirms', label: 'hypothesis held', sources: ['ev-voice-4'], inferred: false },
];

const ideaAffinities = [
  {
    id: 'affinity-1',
    nodeA: 'timing-cannot-clamp',
    nodeB: 'kickback-hypothesis',
    distance: null,
    threshold: null,
    statement:
      'The failed debounce and the rail sag are the same fault seen from two sides: a timing change cannot clamp an inductive transient, so the firmware cluster and the power cluster converge on one electrical fix.',
    sources: ['ev-voice-3', 'ev-voice-2'],
    status: 'confirmed',
    confirmedAt: at('14:14:02'),
  },
];

const ideas = {
  clusters: ideaClusters.map((cluster) => ({
    ...cluster,
    nodeIds: ideaNodes.filter((n) => n.clusterId === cluster.id).map((n) => n.id),
  })),
  nodes: ideaNodes,
  edges: ideaEdges,
  affinities: ideaAffinities,
};

/* -------------------------------------------------------------------------- */
/* Chronology                                                                  */
/* -------------------------------------------------------------------------- */

const chronology = {
  phases: [
    { id: 'bringup', title: 'Bring-up and first actuation', summary: 'Wiring the coil drive and the first switching test.', startInstant: at('14:02:11'), endInstant: at('14:08:19'), entryIds: ['chron-1', 'chron-2'] },
    { id: 'isolation', title: 'Fault isolation', summary: 'Probing the rail and testing a software mitigation.', startInstant: at('14:09:03'), endInstant: at('14:11:26'), entryIds: ['chron-3', 'chron-4', 'chron-5'] },
    { id: 'fix', title: 'Fix and verification', summary: 'Fitting the flyback diode and confirming the rail holds.', startInstant: `${DAY}T14:12:44`, endInstant: at('14:19:08'), entryIds: ['chron-6', 'chron-7', 'chron-8', 'chron-9'] },
  ],
  entries: [
    { id: 'chron-1', phaseId: 'bringup', lane: 'wiring', instant: at('14:02:11'), kind: 'evidence', title: 'Relay coil driven from GPIO 5', body: 'The five volt coil was switched directly from the logic pin.', sources: ['ev-voice-1'], evidenceId: 'ev-voice-1' },
    { id: 'chron-2', phaseId: 'bringup', lane: 'measurement', instant: `${DAY}T14:08:19`, kind: 'evidence', title: 'Probe placed on the 3.3 V rail', body: 'Channel 1 DC coupled for the switching test.', sources: ['ev-photo-1'], evidenceId: 'ev-photo-1', mediaUrl: PHOTO_1, mediaCaption: 'Probing the 3.3 V rail while the relay switches' },
    { id: 'chron-3', phaseId: 'isolation', lane: 'measurement', instant: at('14:09:03'), kind: 'milestone', title: 'Rail sag reproduced at 2.65 V', body: 'The minimum appeared at coil dropout, not at turn-on.', sources: ['ev-voice-2', 'ev-photo-1'], evidenceId: 'ev-voice-2' },
    { id: 'chron-4', phaseId: 'isolation', lane: 'firmware', instant: at('14:10:44'), kind: 'evidence', title: 'Software debounce committed', body: 'A 15 ms delay was added to the GPIO 5 output path.', sources: ['ev-commit-c4e12a'], evidenceId: 'ev-commit-c4e12a' },
    { id: 'chron-5', phaseId: 'isolation', lane: 'firmware', instant: at('14:11:26'), kind: 'milestone', title: 'Debounce ruled out', body: 'Resets continued, so the fault was not a timing artefact.', sources: ['ev-voice-3'], evidenceId: 'ev-voice-3' },
    { id: 'chron-6', phaseId: 'fix', lane: 'assembly', instant: `${DAY}T14:12:44`, kind: 'evidence', title: '1N4007 fitted across the coil', body: 'Soldered antiparallel at the coil terminals.', sources: ['ev-photo-2'], evidenceId: 'ev-photo-2', mediaUrl: PHOTO_2, mediaCaption: 'Flyback diode across the relay coil' },
    { id: 'chron-7', phaseId: 'fix', lane: 'measurement', instant: at('14:14:02'), kind: 'milestone', title: 'Rail verified stable at 3.28 V', body: 'Fifty actuations with no brownout reset.', sources: ['ev-voice-4'], evidenceId: 'ev-voice-4' },
    { id: 'chron-8', phaseId: 'fix', lane: 'measurement', instant: `${DAY}T14:15:31`, kind: 'evidence', title: 'Confirmation capture taken', body: 'Same probe position as the failing capture.', sources: ['ev-photo-3'], evidenceId: 'ev-photo-3', mediaUrl: PHOTO_3, mediaCaption: '3.3 V rail after the diode was fitted' },
    { id: 'chron-9', phaseId: 'fix', lane: 'documentation', instant: at('14:19:08'), kind: 'artifact', title: 'Diode recorded in BOM and schematics', body: 'Documentation committed alongside the hardware change.', sources: ['ev-commit-8f9b02'], evidenceId: 'ev-commit-8f9b02' },
  ],
};

/* -------------------------------------------------------------------------- */
/* BOM, incidents, observations, gaps                                          */
/* -------------------------------------------------------------------------- */

const bom = {
  revision: 'Rev 0.4',
  items: [
    { id: 'bom-1', designator: 'U1', name: 'ESP32-WROOM-32 development board', spec: '3.3 V logic, dual core, GPIO 5 used as the coil drive', qty: 1, sources: ['ev-photo-1', 'ev-voice-1'], status: 'verified' },
    { id: 'bom-2', designator: 'K1', name: '5 V SPDT relay module', spec: '5 V DC coil, logic-level drive; part number and coil resistance not read', qty: 1, sources: ['ev-voice-1', 'ev-photo-1', 'ev-note-1'], status: 'needs-pn', gapId: 'gap-01' },
    { id: 'bom-3', designator: 'D1', name: '1N4007 rectifier diode', spec: '1000 V 1 A DO-41, antiparallel across the coil', qty: 1, sources: ['ev-photo-2', 'ev-commit-8f9b02', 'ev-voice-4'], status: 'installed' },
  ],
  tools: [
    { id: 'tool-1', code: 'OSC-01', name: 'Bench oscilloscope', description: 'Captured the 3.3 V rail during coil dropout and again after the fix.', specs: 'CH1, DC coupled', icon: 'show_chart', sources: ['ev-photo-1', 'ev-voice-2'] },
    { id: 'tool-2', code: 'SLD-01', name: 'Soldering iron', description: 'Fitted the flyback diode across the relay coil terminals.', icon: 'mode_heat', sources: ['ev-photo-2'] },
  ],
  stats: { items: 3, verified: 2, needsPn: 1, percentVerified: 66.7 },
};

const incidents = [
  {
    id: 'incident-1',
    number: '001',
    title: 'Intermittent brownout reset on relay actuation',
    level: 'hardware',
    status: 'resolved',
    phase: 'Actuation testing',
    detectedAt: at('14:02:11'),
    resolvedAt: at('14:14:02'),
    telemetryTarget: '3.3 V logic rail',
    symptom:
      'The controller restarted every time the relay coil was de-energized. A 15 ms software debounce on the drive pin did not change the behaviour.',
    measurements: [
      { label: '3.3 V rail minimum at coil dropout', value: '2.65 V', sources: ['ev-voice-2'] },
      { label: '3.3 V rail steady state after the fix', value: '3.28 V', sources: ['ev-voice-4'] },
    ],
    rootCause:
      'The coil was switched without suppression, so its inductive kickback reached the shared 3.3 V rail and pulled it below the controller’s brownout threshold.',
    fix: 'A 1N4007 diode was fitted antiparallel across the coil terminals.',
    verification:
      'The rail held 3.28 V across fifty consecutive actuations with no reset, and a second capture at the same probe position showed no sag.',
    rulesLearned: [
      {
        title: 'Clamp an inductive load before the first actuation test',
        body: 'A coil switched from a logic rail needs its flyback diode fitted before power is applied, not after a reset is observed.',
        sources: ['ev-voice-3', 'ev-photo-2'],
      },
      {
        title: 'A timing change cannot fix an electrical transient',
        body: 'Debounce addresses contact bounce on the input side; it does nothing about back-EMF on the output side.',
        sources: ['ev-voice-3', 'ev-commit-c4e12a'],
      },
    ],
    relatedCommits: ['ev-commit-c4e12a'],
    sources: ['ev-voice-1', 'ev-voice-2', 'ev-photo-2', 'ev-voice-4'],
    mediaUrl: PHOTO_2,
    mediaCaption: 'Flyback diode across the relay coil',
  },
];

const observations = [
  { id: 'obs-1', instant: at('14:02:11'), timeLabel: '14:02', kind: 'speech', title: 'The builder reported that the controller restarted each time the relay coil was de-energized from GPIO 5.', body: 'First actuation test on the bench.', tag: 'Hardware trigger · GPIO 5', sourceLabel: 'voice 14:02', evidenceId: 'ev-voice-1' },
  { id: 'obs-2', instant: `${DAY}T14:08:19`, timeLabel: '14:08', kind: 'photo', title: 'A probe was placed on the 3.3 V rail with channel 1 DC coupled.', body: 'Capture taken during relay switching.', tag: 'Bench capture 01', sourceLabel: 'photo 1', evidenceId: 'ev-photo-1', media: { url: PHOTO_1, caption: 'Probing the 3.3 V rail while the relay switches', meta: 'Bench camera · timezone-naive EXIF' } },
  { id: 'obs-3', instant: at('14:09:03'), timeLabel: '14:09', kind: 'speech', title: 'The rail was observed to sag to a minimum of 2.65 V at the moment the coil let go.', body: 'The minimum coincided with coil dropout rather than turn-on.', tag: 'Rail minimum', sourceLabel: 'voice 14:09', evidenceId: 'ev-voice-2', measurementId: 'ev-measure-1' },
  { id: 'obs-4', instant: at('14:10:44'), timeLabel: '14:10', kind: 'commit', title: 'A 15 ms software debounce was committed to the GPIO 5 output path.', body: 'firmware/relay.c on main.', tag: 'Software mitigation', sourceLabel: 'commit c4e12a', evidenceId: 'ev-commit-c4e12a' },
  { id: 'obs-5', instant: at('14:11:26'), timeLabel: '14:11', kind: 'speech', title: 'The resets were observed to continue after the debounce was applied.', body: 'The timing change did not affect the fault.', tag: 'Mitigation ruled out', sourceLabel: 'voice 14:11', evidenceId: 'ev-voice-3' },
  { id: 'obs-6', instant: `${DAY}T14:12:44`, timeLabel: '14:12', kind: 'photo', title: 'A 1N4007 diode was soldered antiparallel across the relay coil terminals.', body: 'Fitted directly at the coil rather than at the driver.', tag: 'Flyback diode fitted', sourceLabel: 'photo 2', evidenceId: 'ev-photo-2', media: { url: PHOTO_2, caption: 'Flyback diode across the relay coil', meta: 'Macro inspection · timezone-naive EXIF' } },
  { id: 'obs-7', instant: at('14:14:02'), timeLabel: '14:14', kind: 'speech', title: 'The rail was recorded holding 3.28 V across fifty consecutive actuations with no reset.', body: 'Verification run after the diode was fitted.', tag: 'Verified stable', sourceLabel: 'voice 14:14', evidenceId: 'ev-voice-4', measurementId: 'ev-measure-2' },
  { id: 'obs-8', instant: at('14:19:08'), timeLabel: '14:19', kind: 'commit', title: 'The diode was recorded in the bill of materials and the schematic documentation.', body: 'docs/BOM.md on main.', tag: 'Documentation updated', sourceLabel: 'commit 8f9b02', evidenceId: 'ev-commit-8f9b02' },
];

const measurementEvidence = [
  {
    id: 'ev-measure-1',
    kind: 'measurement',
    sourceTag: 'measure 1',
    label: '3.3 V rail minimum at coil dropout: 2.65 V',
    detail: 'Spoken reading from the bench oscilloscope',
    instant: at('14:09:03'),
    instantIsNaive: false,
    order: 11,
    sources: ['ev-voice-2'],
    verification: 'Extracted from [voice 14:09]',
    measurement: { quantity: '3.3 V rail minimum at coil dropout', value: '2.65', unit: 'V', instrument: 'bench oscilloscope', role: 'event' },
  },
  {
    id: 'ev-measure-2',
    kind: 'measurement',
    sourceTag: 'measure 2',
    label: '3.3 V rail steady state after the fix: 3.28 V',
    detail: 'Spoken reading across fifty actuations',
    instant: at('14:14:02'),
    instantIsNaive: false,
    order: 12,
    sources: ['ev-voice-4'],
    verification: 'Extracted from [voice 14:14]',
    measurement: { quantity: '3.3 V rail steady state after the fix', value: '3.28', unit: 'V', instrument: 'bench oscilloscope', role: 'result' },
  },
];

const gaps = [
  {
    id: 'gap-01',
    number: '01',
    question: 'What is the relay module’s part number and coil resistance?',
    description:
      'BOM.md cannot specify K1 without it, and coil current draw stays unknown — which is what determines how much transient the rail has to absorb.',
    targetDoc: 'BOM.md',
    priority: 'high',
    status: 'open',
    appliesTo: [{ kind: 'bom', id: 'bom-2', field: 'coil resistance' }],
    placeholder: 'e.g. SRD-05VDC-SL-C, 70 Ω coil',
  },
  {
    id: 'gap-02',
    number: '02',
    question: 'What brownout threshold is configured in the firmware?',
    description:
      'The rail was measured at 2.65 V during the fault, but nothing in the session states the threshold the controller actually trips at, so the margin cannot be documented.',
    targetDoc: 'SYSTEM_SPECS.md',
    priority: 'medium',
    status: 'open',
    appliesTo: [{ kind: 'hardware', id: 'mcu', field: 'brownout threshold' }],
    placeholder: 'e.g. 2.80 V from sdkconfig',
  },
  {
    id: 'gap-03',
    number: '03',
    question: 'Do the 5 V supply and the 3.3 V rail share a return path, or is the coupling through the regulator?',
    description:
      'SCHEMATICS.md shows the transient reaching the 3.3 V rail, but the session never established the path it took. The diagram currently marks that edge as inferred.',
    targetDoc: 'SCHEMATICS.md',
    priority: 'medium',
    status: 'open',
    appliesTo: [{ kind: 'hardware', id: 'hw-edge-5', field: 'coupling path' }],
  },
];

/* -------------------------------------------------------------------------- */
/* Session and README prose                                                    */
/* -------------------------------------------------------------------------- */

const session = {
  id: SESSION_ID,
  name: 'ESP32 relay controller — brownout fix',
  slug: 'esp32-relay-ctrl',
  mode: 'batch',
  status: 'ready',
  createdAt: at('13:58:00'),
  startedAt: at('14:02:11'),
  endedAt: at('14:20:00'),
  durationSec: 1069,
  repoPath: null,
  repoBranch: 'main',
  headCommit: '8f9b02',
  mock: true,
  counts: { voice: 0, photo: 0, commit: 0, note: 0, measurement: 0, evidence: 0 },
  grounding: { sourced: 0, unsourced: 0, percent: 0 },
  error: null,
};

const readmeProse = {
  title: 'ESP32 Relay Controller with Flyback Protection',
  standfirst:
    'A single-board controller that switches a 5 V relay coil from an ESP32-WROOM-32, with the inductive transient clamped at the coil. [voice 14:02] [photo 1]',
  overview:
    'The board drives a 5 V SPDT relay module directly from GPIO 5 and runs from a 3.3 V logic rail. Bring-up testing showed the controller restarting on every coil de-energization; a probe on the 3.3 V rail recorded a minimum of 2.65 V at the moment the coil let go. [voice 14:02] [voice 14:09]\n\nA 15 ms software debounce was committed first and did not change the behaviour. After a 1N4007 diode was fitted antiparallel across the coil terminals, the rail held 3.28 V across fifty consecutive actuations with no reset. [commit c4e12a] [voice 14:11] [photo 2] [voice 14:14]',
  architecture:
    'The 5 V supply feeds the relay coil, and the ESP32 switches it from GPIO 5. D1, a 1N4007, sits antiparallel across the coil so the inductive kickback is clamped locally. [voice 14:02] [photo 2] [commit 8f9b02]\n\nThe session establishes that the 3.3 V rail sagged during coil dropout, but it does not establish whether the coupling was through a shared return or through the regulator. That edge remains explicitly inferred in `diagrams/system.mmd`. [voice 14:09]',
  troubleshooting:
    'The controller reset on every coil de-energization, with the 3.3 V rail sagging to 2.65 V at dropout. Fitting the 1N4007 antiparallel across the coil terminals fixed it, verified by fifty actuations at a steady 3.28 V. [voice 14:02] [voice 14:09] [photo 2] [voice 14:14]',
};

/* -------------------------------------------------------------------------- */
/* Build                                                                       */
/* -------------------------------------------------------------------------- */

async function main(): Promise<void> {
  const fixtureDir = path.join(repoRoot, 'fixtures', SESSION_ID);
  const paths = await ensureSessionDirs(SESSION_ID);

const allEvidence = EvidenceListSchema.parse([...evidence, ...measurementEvidence].sort((a, b) => a.order - b.order));

  await writeJson(SESSION_ID, FILES.session, session);
  await writeJson(SESSION_ID, FILES.evidence, allEvidence);
  await writeJson(SESSION_ID, FILES.transcript, transcript);
  await writeJson(SESSION_ID, FILES.chronology, chronology);
  await writeJson(SESSION_ID, FILES.ideasGraph, ideas);
  await writeJson(SESSION_ID, FILES.hardwareGraph, hardware);
  await writeJson(SESSION_ID, FILES.bom, bom);
  await writeJson(SESSION_ID, FILES.gaps, gaps);
  await writeJson(SESSION_ID, FILES.incidents, incidents);
  await writeJson(SESSION_ID, FILES.observations, observations);

  // A finished run, so the UI has real progress history to render.
  const run = await startRun(SESSION_ID, 'batch');
  await emit(SESSION_ID, 'log', { message: 'Fixture session generated by scripts/build-fixture.ts.' });
  await emit(SESSION_ID, 'evidence', { message: `${allEvidence.length} evidence items assembled.` });
  await emit(SESSION_ID, 'log', { message: 'Synthesis skipped: fixture data was authored directly.' });
  await finishRun(SESSION_ID, 'completed');
  void run;

  const artifacts = await regenerateArtifacts(SESSION_ID, { prose: readmeProse });

  // Prove the serializers produce parseable Mermaid for the standalone diagram kinds.
  void serializeHardwareDiagram;
  void serializeIdeaDiagram;
  void serializeBuildSteps;

  await flushWrites(SESSION_ID);
  const bundle = await loadBundle(SESSION_ID);

  if (existsSync(fixtureDir)) await rm(fixtureDir, { recursive: true, force: true });
  await mkdir(path.dirname(fixtureDir), { recursive: true });
  await cp(paths.dir, fixtureDir, { recursive: true });
  await rm(buildRoot, { recursive: true, force: true });

  console.log(`fixture written to fixtures/${SESSION_ID}`);
  console.log(
    `  ${bundle.evidence.length} evidence · ${bundle.gaps.length} gaps · ` +
      `${bundle.hardware.nodes.length} hardware nodes · ${bundle.ideas.nodes.length} ideas · ` +
      `${bundle.chronology.entries.length} chronology entries · ${artifacts.length} artifacts`
  );
  console.log(`  grounding: ${bundle.session.grounding.percent}% (${bundle.session.grounding.sourced} sourced)`);
}

main().catch((err) => {
  console.error('fixture build failed:', err);
  process.exit(1);
});
