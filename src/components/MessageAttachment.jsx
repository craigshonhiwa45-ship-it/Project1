import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { File, Play, Pause, Loader2 } from 'lucide-react';

function fmt(ms) {
  const s = Math.max(0, Math.round((ms || 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function MessageAttachment({ attachment }) {
  const [url, setUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: attachment.file_uri });
        if (alive) setUrl(signed_url);
      } catch { /* link expired or unavailable */ }
    })();
    return () => { alive = false; };
  }, [attachment.file_uri]);

  if (attachment.kind === 'image') {
    return url ? (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={attachment.name || 'Shared image'} className="max-h-60 rounded-2xl object-cover" />
      </a>
    ) : (
      <div className="flex h-24 w-40 items-center justify-center rounded-2xl bg-muted text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
    );
  }

  if (attachment.kind === 'video') {
    return url ? (
      <video src={url} controls playsInline className="max-h-60 rounded-2xl" />
    ) : (
      <div className="flex h-24 w-40 items-center justify-center rounded-2xl bg-muted text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
    );
  }

  if (attachment.kind === 'voice') {
    return (
      <div className="flex items-center gap-2.5 rounded-full bg-primary/10 px-3 py-2">
        <button
          onClick={() => (playing ? audioRef.current?.pause() : audioRef.current?.play())}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:scale-105"
          aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-primary/20 sm:w-28">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[11px] font-bold text-primary">{fmt(attachment.duration_ms)}</span>
        {url && (
          <audio
            ref={audioRef}
            src={url}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setProgress((e.target.currentTime / (e.target.duration || 1)) * 100)}
            onEnded={() => { setPlaying(false); setProgress(0); }}
            className="hidden"
          />
        )}
      </div>
    );
  }

  return (
    <a
      href={url || '#'}
      download={attachment.name}
      className="inline-flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted/70"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
        <File className="h-4 w-4" />
      </span>
      <span className="max-w-[160px] truncate">{attachment.name || 'Attachment'}</span>
    </a>
  );
}