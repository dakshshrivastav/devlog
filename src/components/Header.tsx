import type { ActiveView, HealthResponse } from '../../shared/schema';

interface HeaderProps {
  activeView: ActiveView;
  sessionName: string;
  sessionTime: string;
  status: string;
  runtime?: HealthResponse;
  onSelectView: (view: ActiveView) => void;
  onOpenSessions: () => void;
  onOpenSearch: () => void;
  onOpenExport: () => void;
  onAddCapture: () => void;
}

const NAV_ITEMS: { id: ActiveView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'living-map', label: 'Living Map' },
  { id: 'live-flowchart', label: 'Live Flowchart' },
  { id: 'observations', label: 'Observations' },
  { id: 'system-diagrams', label: 'System Diagrams' },
  { id: 'bom-and-parts', label: 'BOM & Parts' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'finished-docs', label: 'Finished Docs' },
];

export function Header({
  activeView,
  sessionName,
  sessionTime,
  status,
  runtime,
  onSelectView,
  onOpenSessions,
  onOpenSearch,
  onOpenExport,
  onAddCapture,
}: HeaderProps) {
  const active = status === 'capturing' || status === 'processing';

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line/70 bg-surface-0/95 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          <button
            onClick={onOpenSessions}
            className="font-headline text-xl font-light tracking-tight text-white transition-opacity hover:opacity-80"
            title="Session library"
          >
            devlog
          </button>
          <span className="select-none text-line-dim">/</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-body">
              <span className={`h-1.5 w-1.5 rounded-full ${active ? 'animate-pulse bg-white' : 'bg-muted'}`} />
              <span className="hidden sm:inline">{active ? 'Active session' : status}</span>
              <span className="text-muted">·</span>
              <span className="font-mono text-white">{sessionTime}</span>
            </div>
            <div className="max-w-[180px] truncate text-[11px] text-muted sm:max-w-[240px]">{sessionName}</div>
          </div>
        </div>

        <nav className="hidden h-full items-center gap-4 overflow-x-auto scrollbar-none lg:flex xl:gap-6">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              aria-current={activeView === item.id ? 'page' : undefined}
              className={`whitespace-nowrap border-b-2 py-5 font-headline text-xs tracking-tight transition-colors xl:text-sm ${
                activeView === item.id
                  ? 'border-white font-medium text-white'
                  : 'border-transparent font-light text-muted hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide text-muted xl:inline-flex" title={runtime?.mock ? 'Using fixture-backed mock providers' : 'Provider configuration status'}>
            <span className={`h-1.5 w-1.5 rounded-full ${runtime?.ok ? 'bg-white' : runtime ? 'bg-alert' : 'animate-pulse bg-muted'}`} />
            {runtime?.ok ? runtime.mock ? 'Mock runtime' : 'Server online' : runtime ? 'API offline' : 'Checking API'}
          </span>
          <Action icon="add" label="Add evidence" onClick={onAddCapture} primary />
          <Action icon="search" label="Search" onClick={onOpenSearch} />
          <Action icon="download" label="Export" onClick={onOpenExport} />
          <button
            onClick={onOpenSessions}
            className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-white text-surface-0 transition-opacity hover:opacity-80"
            title="Open session library"
          >
            <span className="material-symbols-outlined text-[17px]">folder_open</span>
          </button>
        </div>
      </div>
      <nav className="flex items-center gap-4 overflow-x-auto border-t border-line/40 bg-surface-1 px-4 py-2 scrollbar-none lg:hidden">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectView(item.id)}
            aria-current={activeView === item.id ? 'page' : undefined}
            className={`whitespace-nowrap font-headline text-xs ${activeView === item.id ? 'font-medium text-white' : 'text-muted'}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function Action({
  icon,
  label,
  onClick,
  primary = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs transition-colors sm:px-3 ${
        primary
          ? 'border-white bg-white text-surface-0 hover:bg-ink-hover'
          : 'border-line-strong/50 bg-surface-3 text-body hover:bg-line hover:text-white'
      }`}
    >
      <span className="material-symbols-outlined text-[15px]">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
