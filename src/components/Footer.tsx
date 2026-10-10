export function Footer({ sessionName }: { sessionName?: string }) {
  return (
    <footer className="mt-12 border-t border-line/40 bg-surface-inset py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col justify-between gap-4 px-6 text-xs text-muted sm:flex-row sm:items-center lg:px-12">
        <div>
          <div className="font-headline text-sm font-light tracking-tight text-white">devlog</div>
          <p className="mt-1 max-w-[62ch] leading-relaxed">Hardware build records synthesized from evidence, with every claim linked back to its source.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[10px]">
          {sessionName && <span className="max-w-[240px] truncate text-body">{sessionName}</span>}
          <span className="text-line-strong">·</span>
          <span>Local session store</span>
          <span className="text-line-strong">·</span>
          <span>Devlog</span>
        </div>
      </div>
    </footer>
  );
}
