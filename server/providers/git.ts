/**
 * Git history for a session's target repository.
 *
 * Uses `git` directly with argument arrays (never a shell string) so a repo
 * path with spaces or metacharacters cannot inject anything.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { DiffLine } from '../../shared/schema/index';

const run = promisify(execFile);

export interface GitCommit {
  hash: string;
  subject: string;
  authoredAt: string;
  filesChanged: number;
  diffFile?: string;
  diff?: DiffLine[];
}

export interface GitRepoInfo {
  path: string;
  branch: string | null;
  head: string | null;
  commits: GitCommit[];
}

async function git(repoPath: string, args: string[]): Promise<string> {
  const { stdout } = await run('git', ['-C', repoPath, ...args], {
    maxBuffer: 32 * 1024 * 1024,
    timeout: 30_000,
  });
  return stdout;
}

export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    const out = await git(repoPath, ['rev-parse', '--is-inside-work-tree']);
    return out.trim() === 'true';
  } catch {
    return false;
  }
}

const RECORD_SEPARATOR = '\x1e';
const LOG_FORMAT = ['%h', '%s', '%aI'].join(RECORD_SEPARATOR);

/**
 * Commits within a window. When `since`/`until` are absent the most recent
 * `limit` commits are returned, which is what a bench session usually wants.
 */
export async function readCommits(
  repoPath: string,
  options: { since?: string | null; until?: string | null; limit?: number } = {}
): Promise<GitRepoInfo> {
  const limit = options.limit ?? 50;
  const args = ['log', `--max-count=${limit}`, `--pretty=format:${LOG_FORMAT}`, '--numstat'];
  if (options.since) args.push(`--since=${options.since}`);
  if (options.until) args.push(`--until=${options.until}`);

  const [logOut, branch, head] = await Promise.all([
    git(repoPath, args),
    git(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']).catch(() => ''),
    git(repoPath, ['rev-parse', '--short', 'HEAD']).catch(() => ''),
  ]);

  const commits: GitCommit[] = [];
  let current: GitCommit | null = null;
  let filesChanged = 0;

  for (const line of logOut.split('\n')) {
    if (line.includes(RECORD_SEPARATOR)) {
      if (current) {
        current.filesChanged = filesChanged;
        commits.push(current);
      }
      const [hash, subject, authoredAt] = line.split(RECORD_SEPARATOR);
      current = { hash: hash.trim(), subject: subject.trim(), authoredAt: authoredAt.trim(), filesChanged: 0 };
      filesChanged = 0;
      continue;
    }
    if (!current) continue;
    if (!line.trim()) continue;
    // numstat lines: "added<TAB>removed<TAB>path"
    const parts = line.split('\t');
    if (parts.length >= 3) filesChanged += 1;
  }
  if (current) {
    current.filesChanged = filesChanged;
    commits.push(current);
  }

  return {
    path: repoPath,
    branch: branch.trim() || null,
    head: head.trim() || null,
    commits,
  };
}

const DIFF_LINE_LIMIT = 14;

/** A small unified diff for one commit, trimmed to the first changed file. */
export async function readCommitDiff(
  repoPath: string,
  hash: string
): Promise<{ file: string; lines: DiffLine[] } | null> {
  try {
    const out = await git(repoPath, ['show', '--unified=1', '--format=', '--no-color', hash]);
    let file = '';
    const lines: DiffLine[] = [];
    let lineNum = 0;

    for (const raw of out.split('\n')) {
      if (raw.startsWith('+++ b/')) {
        if (file) break; // keep only the first file
        file = raw.slice(6);
        continue;
      }
      if (!file) continue;
      if (raw.startsWith('@@')) {
        const match = raw.match(/\+(\d+)/);
        lineNum = match ? Number.parseInt(match[1], 10) - 1 : lineNum;
        continue;
      }
      if (lines.length >= DIFF_LINE_LIMIT) break;
      if (raw.startsWith('+')) {
        lineNum += 1;
        lines.push({ lineNum, content: raw.slice(1), kind: 'added' });
      } else if (raw.startsWith('-')) {
        lines.push({ lineNum, content: raw.slice(1), kind: 'removed' });
      } else if (raw.startsWith(' ')) {
        lineNum += 1;
        lines.push({ lineNum, content: raw.slice(1), kind: 'context' });
      }
    }

    return file ? { file, lines } : null;
  } catch (err) {
    console.warn(`[git] diff for ${hash} failed:`, (err as Error).message);
    return null;
  }
}
