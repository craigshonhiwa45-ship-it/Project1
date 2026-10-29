import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mic, Video, Send, Paperclip, X, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function fmt(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function ChatComposer({ onSend, disabled, disabledReason, placeholder = 'Message…' }) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState([]);
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState(null); // { kind }
  const [seconds, setSeconds] = useState(0);
  const fileRef = useRef(null);
  const recRef = useRef(null);
  const timerRef = useRef(null);
  const startedRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => () => {
    cancelledRef.current = true;
    try { recRef.current?.stop(); } catch { /* already stopped */ }
  }, []);

  const attachFiles = async (files) => {
    if (!files?.length || disabled) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: f });
        const kind = f.type.startsWith('image/') ? 'image' : 'file';
        setPending((p) => [...p, { kind, name: f.name, file_uri }]);
      }
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const startRec = async (kind) => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === 'voice' ? { audio: true } : { audio: true, video: true }
      );
      const mime = kind === 'voice' ? 'audio/webm' : 'video/webm';
      const opts = MediaRecorder.isTypeSupported(mime) ? { mimeType: mime } : undefined;
      const mr = new MediaRecorder(stream, opts);
      const chunks = [];
      cancelledRef.current = false;
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        setRec(null);
        const duration = Date.now() - startedRef.current;
        if (cancelledRef.current) return;
        setBusy(true);
        try {
          const blob = new Blob(chunks, { type: mr.mimeType || mime });
          const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
          const { file_uri } = await base44.integrations.Core.UploadPrivateFile({
            file: new File([blob], kind === 'voice' ? `voice-${Date.now()}.${ext}` : `video-${Date.now()}.${ext}`, { type: blob.type }),
          });
          await onSend('', [{ kind, name: kind === 'voice' ? 'Voice message' : 'Video message', file_uri, duration_ms: duration }]);
        } finally {
          setBusy(false);
        }
      };
      recRef.current = mr;
      startedRef.current = Date.now();
      mr.start();
      setRec({ kind });
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(Math.round((Date.now() - startedRef.current) / 1000)), 500);
    } catch {
      alert('Could not access your ' + (kind === 'voice' ? 'microphone' : 'camera') + '. Check permissions and try again.');
    }
  };

  const stopRec = (cancel) => {
    cancelledRef.current = !!cancel;
    try { recRef.current?.stop(); } catch { /* not recording */ }
  };

  const sendText = async () => {
    const t = text.trim();
    if (!t || disabled) return;
    setText('');
    await onSend(t, pending);
    setPending([]);
  };

  if (rec) {
    return (
      <div className="flex items-center gap-2 border-t border-border bg-card p-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          {rec.kind === 'voice' ? 'Recording voice' : 'Recording video'} · {fmt(seconds)}
        </span>
        <Button size="sm" variant="ghost" className="ml-auto rounded-full" onClick={() => stopRec(true)} disabled={busy}>
          <X className="h-4 w-4" /> Cancel
        </Button>
        <Button size="sm" className="rounded-full" onClick={() => stopRec(false)} disabled={busy}>
          <Square className="h-3.5 w-3.5" /> {busy ? 'Sending…' : rec.kind === 'voice' ? 'Send voice' : 'Send video'}
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-card p-3">
      {disabled && disabledReason && (
        <p className="mb-2 rounded-2xl bg-muted px-3 py-2 text-center text-xs text-muted-foreground">{disabledReason}</p>
      )}
      {pending.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {pending.map((a, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
              <Paperclip className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{a.name}</span>
              <button onClick={() => setPending((p) => p.filter((_, j) => j !== i))} aria-label="Remove attachment">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => attachFiles(e.target.files)} />
        <Button variant="ghost" size="icon" className="shrink-0 rounded-full" onClick={() => fileRef.current?.click()} disabled={disabled || busy} aria-label="Attach a file">
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
          placeholder={placeholder}
          className="rounded-full"
          disabled={disabled}
        />
        <Button variant="ghost" size="icon" className="shrink-0 rounded-full text-primary" onClick={() => startRec('voice')} disabled={disabled || busy} aria-label="Record a voice message">
          <Mic className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="shrink-0 rounded-full text-primary" onClick={() => startRec('video')} disabled={disabled || busy} aria-label="Record a video message">
          <Video className="h-4 w-4" />
        </Button>
        <Button size="icon" className="shrink-0 rounded-full" onClick={sendText} disabled={disabled || busy || !text.trim()} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}