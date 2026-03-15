import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  workspaceId: string;
}

export const Terminal: React.FC<TerminalProps> = ({ workspaceId }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const xterm = new XTerm({
      theme: {
        background: '#0A0A0A',
        foreground: '#D4D4D4',
        cursor: '#00FF00',
        selectionBackground: '#333333'
      },
      fontSize: 12,
      fontFamily: 'JetBrains Mono, monospace',
      cursorBlink: true,
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(terminalRef.current);
    
    // Initial fit
    setTimeout(() => fitAddon.fit(), 100);
    
    xtermRef.current = xterm;

    const socket = io({
      query: { workspaceId }
    });

    xterm.onData(data => {
      socket.emit('terminal_input', data);
    });

    socket.on('terminal_output', data => {
      xterm.write(data);
    });

    // Resize handling
    const handleResize = () => {
      fitAddon.fit();
      socket.emit('terminal_resize', {
        cols: xterm.cols,
        rows: xterm.rows
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Send initial size
    socket.on('connect', () => {
       handleResize();
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      xterm.dispose();
    };
  }, [workspaceId]);

  return <div ref={terminalRef} className="h-full w-full" />;
};
