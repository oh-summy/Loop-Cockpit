/* apps/web/src/components/XtermViewer.tsx */
import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface Props {
  wsUrl: string;
  onConnectionChange?: (state: 'connecting' | 'open' | 'closed' | 'error') => void;
}

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;

export default function XtermViewer({ wsUrl, onConnectionChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    cancelledRef.current = false;

    const term = new Terminal({
      convertEol: true,
      fontSize: 13,
      fontFamily: 'Menlo, "DejaVu Sans Mono", monospace',
      theme: { background: '#0b0f14', foreground: '#d1d5db' },
      scrollback: 5000,
      cursorBlink: false,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;

    const onResize = () => fit.fit();
    window.addEventListener('resize', onResize);

    function connect() {
      if (cancelledRef.current) return;

      onConnectionChange?.('connecting');
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        onConnectionChange?.('open');
        term.writeln('\x1b[2m[connected to ' + wsUrl + ']\x1b[0m');
      };
      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          term.write(ev.data);
        } else if (ev.data instanceof ArrayBuffer) {
          term.write(new Uint8Array(ev.data));
        }
      };
      ws.onerror = () => {
        onConnectionChange?.('error');
      };
      ws.onclose = () => {
        if (cancelledRef.current) return;
        onConnectionChange?.('closed');
        term.writeln('\r\n\x1b[2m[ws closed]\x1b[0m');

        // Exponential backoff reconnection
        const attempt = reconnectAttemptsRef.current++;
        const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
        setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      cancelledRef.current = true;
      window.removeEventListener('resize', onResize);
      try { wsRef.current?.close(); } catch { /* ignore */ }
      term.dispose();
      termRef.current = null;
      wsRef.current = null;
    };
  }, [wsUrl, onConnectionChange]);

  return <div ref={containerRef} className="w-full h-full" />;
}
