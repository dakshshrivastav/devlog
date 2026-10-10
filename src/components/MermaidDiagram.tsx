import { useEffect, useId, useRef, useState } from 'react';

let configured = false;

function configureMermaid(mermaid: typeof import('mermaid').default) {
  if (configured) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: 'Space Grotesk, sans-serif',
    themeVariables: {
      background: '#1c1b1c',
      primaryColor: '#201f20',
      primaryTextColor: '#e5e2e3',
      primaryBorderColor: '#353436',
      lineColor: '#8f9194',
      secondaryColor: '#161618',
      tertiaryColor: '#131314',
      clusterBkg: '#1c1b1c',
      clusterBorder: '#353436',
      edgeLabelBackground: '#1c1b1c',
      fontSize: '14px',
    },
    flowchart: { curve: 'basis', htmlLabels: true, padding: 18, nodeSpacing: 42, rankSpacing: 58 },
  });
  configured = true;
}

export function MermaidDiagram({
  source,
  className = '',
  onParse,
}: {
  source: string;
  className?: string;
  onParse?: (valid: boolean, error?: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const id = `devlog-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    async function draw() {
      if (!source.trim()) {
        setError(null);
        if (root.current) root.current.innerHTML = '';
        onParse?.(false, 'No diagram source is available yet.');
        return;
      }
      try {
        const { default: mermaid } = await import('mermaid');
        if (disposed) return;
        configureMermaid(mermaid);
        await mermaid.parse(source);
        const result = await mermaid.render(id, source);
        if (disposed || !root.current) return;
        root.current.innerHTML = result.svg;
        result.bindFunctions?.(root.current);
        setError(null);
        onParse?.(true);
      } catch (cause) {
        if (disposed) return;
        const message = cause instanceof Error ? cause.message : 'Mermaid could not parse this diagram.';
        setError(message);
        onParse?.(false, message);
        if (root.current) root.current.innerHTML = '';
      }
    }

    void draw();
    return () => {
      disposed = true;
    };
  }, [source, id, onParse]);

  return (
    <div className={`devlog-mermaid min-h-32 overflow-auto ${className}`}>
      {error ? (
        <div className="m-4 rounded-lg border border-alert/30 bg-alert-deep/20 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-alert">
            <span className="material-symbols-outlined text-base">warning</span>
            Diagram could not be rendered
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-body">{source}</pre>
          <p className="mt-2 break-words font-mono text-[10px] text-muted">{error}</p>
        </div>
      ) : (
        <div ref={root} className="min-h-32 w-full p-3" />
      )}
    </div>
  );
}

export function downloadText(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
