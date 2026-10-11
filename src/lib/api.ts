import type {
  ActiveView,
  CreateSessionRequest,
  GapItem,
  HealthResponse,
  LiveTokenResponse,
  SearchResponse,
  Session,
  SessionBundle,
} from '../../shared/schema';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),
  sessions: () => request<Session[]>('/api/sessions'),
  createSession: (input: CreateSessionRequest) =>
    request<Session>('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  deleteSession: (id: string) =>
    request<void>(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  patchSession: (id: string, patch: { name?: string; repoPath?: string | null }) =>
    request<Session>(`/api/sessions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  bundle: (id: string) => request<SessionBundle>(`/api/sessions/${encodeURIComponent(id)}`),
  resolveGap: (sessionId: string, gapId: string, input: { answer?: string; action?: 'resolve' | 'defer' }) =>
    request<SessionBundle>(`/api/sessions/${encodeURIComponent(sessionId)}/gaps/${encodeURIComponent(gapId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  resolveGapVoice: async (sessionId: string, gapId: string, audio: File) => {
    const form = new FormData();
    form.append('audio', audio);
    return request<SessionBundle>(`/api/sessions/${encodeURIComponent(sessionId)}/gaps/${encodeURIComponent(gapId)}/voice`, {
      method: 'POST',
      body: form,
    });
  },
  process: (sessionId: string, synthesizeOnly = false) =>
    request<{ runId: string; sessionId: string; mock: boolean }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/process`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ synthesizeOnly }),
      }
    ),
  liveToken: (sessionId: string) =>
    request<LiveTokenResponse>(`/api/sessions/${encodeURIComponent(sessionId)}/live/token`, { method: 'POST' }),
  liveEvents: (sessionId: string, event: unknown, receivedAt = new Date().toISOString()) =>
    request<{ accepted: number; committed: number }>(`/api/sessions/${encodeURIComponent(sessionId)}/live/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [{ receivedAt, event }] }),
    }),
  endLive: (sessionId: string) =>
    request<{ runId: string; sessionId: string; message: string }>(`/api/sessions/${encodeURIComponent(sessionId)}/live/end`, { method: 'POST' }),
  cancelLive: (sessionId: string) =>
    request<{ sessionId: string; status: string }>(`/api/sessions/${encodeURIComponent(sessionId)}/live/cancel`, { method: 'POST' }),
  upload: async (sessionId: string, files: { audio: File[]; photos: File[]; videos: File[]; notes?: string; keyterms?: string }) => {
    const form = new FormData();
    files.audio.forEach((file) => form.append('audio', file));
    files.photos.forEach((file) => form.append('photos', file));
    files.videos.forEach((file) => form.append('videos', file));
    if (files.notes) form.append('notes', files.notes);
    if (files.keyterms) form.append('keyterms', files.keyterms);
    return request<{ stored: { audio: unknown[]; photos: unknown[]; videos: unknown[] }; nextStep: string }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/capture`,
      { method: 'POST', body: form }
    );
  },
  search: (query: string, sessionId?: string, signal?: AbortSignal) => {
    const params = new URLSearchParams({ q: query });
    if (sessionId) params.set('sessionId', sessionId);
    return request<SearchResponse>(`/api/search?${params}`, { signal });
  },
  artifact: (sessionId: string, path: string) =>
    fetch(`/api/sessions/${encodeURIComponent(sessionId)}/artifact?path=${encodeURIComponent(path)}`).then(
      async (response) => {
        if (!response.ok) throw new Error('Artifact is not available yet.');
        return response.text();
      }
    ),
  bundleUrl: (sessionId: string) => `/api/sessions/${encodeURIComponent(sessionId)}/bundle`,
};

export function viewForSearchTarget(view: ActiveView): ActiveView {
  return view;
}

export function openGapCount(gaps: readonly GapItem[]): number {
  return gaps.filter((gap) => gap.status === 'open').length;
}
