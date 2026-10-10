export type ActiveView =
  | 'overview'
  | 'timeline'
  | 'living-map'
  | 'live-flowchart'
  | 'observations'
  | 'system-diagrams'
  | 'bom-and-parts'
  | 'troubleshooting'
  | 'finished-docs';

export interface TimelineItem {
  id: string;
  type: 'voice' | 'photos' | 'code';
  time: string;
  title: string;
  categoryTag?: string;
  tags?: string[];
  duration?: string;
  audioQuote?: string;
  imageSrc?: string;
  imageAlt?: string;
  exif?: string;
  commitHash?: string;
  codeSnippet?: {
    lineStart: number;
    lines: Array<{ lineNum: number; content: string; isAdded?: boolean; isRemoved?: boolean }>;
  };
  notes: string;
  verifiedLabel: string;
}

export interface ThoughtNode {
  id: string;
  time: string;
  title: string;
  text: string;
  targetId: string;
  extractedNote: string;
  icon: string;
}

export interface GapItem {
  id: string;
  number: string;
  question: string;
  description: string;
  targetDoc: string;
  status: 'open' | 'resolved';
  resolvedAnswer?: string;
  priority?: 'High' | 'Medium' | 'Low';
}

export interface BomItem {
  id: string;
  name: string;
  designator: string;
  spec: string;
  qty: number;
  sources: string[];
  status: 'Verified' | 'Needs P/N' | 'Verified & Installed';
  unitCost: number;
}

export interface BenchTool {
  id: string;
  code: string;
  name: string;
  description: string;
  specs: string;
  icon: string;
}

export interface ObserverLogEntry {
  id: string;
  time: string;
  type: 'speech' | 'photo' | 'commit';
  title: string;
  body: string;
  tag: string;
  sourceLabel: string;
  imageSrc?: string;
  imageCaption?: string;
  imageMeta?: string;
  sparkline?: boolean;
}
