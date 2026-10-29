import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function RoomCall({ room, me, otherMembers }) {
  const [status, setStatus] = useState('idle'); // idle | calling | ringing | connected
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const pcRef = useRef(null);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const localStream = useRef(null);
  const camTrack = useRef(null);
  const pendingOffer = useRef(null);
  const connectedRef = useRef(false);
  const peerId = otherMembers[0] || null;

  const sendSignal = useCallback((kind, payload = {}) =>
    base44.entities.RoomSignal.create({ room_id: room.id, from_id: me.id, to_id: peerId, kind, payload }),
  [room.id, me.id, peerId]);

  const cleanup = useCallback((notifyPeer) => {
    if (notifyPeer) sendSignal('leave').catch(() => {});
    try { pcRef.current?.close(); } catch { /* already closed */ }
    pcRef.current = null;
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    connectedRef.current = false;
    setStatus('idle');
    setSharing(false);
  }, [sendSignal]);

  useEffect(() => () => cleanup(false), [cleanup]);

  const setupPeer = () => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = (e) => { if (e.candidate) sendSignal('ice', { candidate: e.candidate }).catch(() => {}); };
    pc.ontrack = (e) => { if (remoteRef.current) remoteRef.current.srcObject = e.streams[0]; };
    return pc;
  };

  const getMedia = async () => {
    if (localStream.current) return localStream.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStream.current = stream;
    camTrack.current = stream.getVideoTracks()[0] || null;
    if (localRef.current) localRef.current.srcObject = stream;
    return stream;
  };

  const startCall = async () => {
    setError('');
    try {
      const stream = await getMedia();
      const pc = setupPeer();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal('offer', { sdp: pc.localDescription });
      setStatus('calling');
    } catch {
      setError('Could not access your camera or microphone. Check browser permissions.');
    }
  };

  const acceptCall = async () => {
    setError('');
    try {
      const stream = await getMedia();
      const pc = setupPeer();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const desc = pendingOffer.current;
      pendingOffer.current = null;
      if (desc) await pc.setRemoteDescription(new RTCSessionDescription(desc));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal('answer', { sdp: pc.localDescription });
      setStatus('connected');
      connectedRef.current = true;
    } catch {
      setError('Could not access your camera or microphone. Check browser permissions.');
    }
  };

  const declineCall = async () => {
    pendingOffer.current = null;
    setStatus('idle');
  };

  // Incoming signals arrive by realtime; a slow poll only catches missed ones.
  useEffect(() => {
    if (!peerId) return;
    let alive = true;
    const handle = async (sig) => {
      try {
        if (sig.kind === 'offer' && !connectedRef.current) {
          pendingOffer.current = sig.payload?.sdp ? sig.payload.sdp : sig.payload;
          setStatus((s) => (s === 'connected' ? s : 'ringing'));
        } else if (sig.kind === 'answer' && pcRef.current) {
          const sdp = sig.payload?.sdp || sig.payload;
          if (sdp) await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          setStatus('connected');
          connectedRef.current = true;
        } else if (sig.kind === 'ice' && pcRef.current && sig.payload?.candidate) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(sig.payload.candidate)); } catch { /* late candidate */ }
        } else if (sig.kind === 'leave') {
          cleanup(false);
        }
      } catch { /* skip malformed signal */ }
      try { await base44.entities.RoomSignal.delete(sig.id); } catch { /* leave for cleanup */ }
    };
    const drain = async () => {
      if (!alive) return;
      try {
        const page = await base44.entities.RoomSignal.filter({ room_id: room.id, to_id: me.id });
        for (const sig of page.items || page) {
          if (!alive) return;
          await handle(sig);
        }
      } catch { /* transient poll error */ }
    };
    drain();
    let unsub;
    try {
      unsub = base44.entities.RoomSignal.subscribe((event) => {
        const sig = event && event.data;
        if (!alive || !sig || sig.to_id !== me.id || sig.room_id !== room.id) return;
        handle(sig);
      });
    } catch { /* realtime unavailable */ }
    const t = setInterval(drain, 10000);
    return () => { alive = false; unsub?.(); clearInterval(t); };
  }, [room.id, me.id, peerId, cleanup]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStream.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
  };

  const toggleCam = () => {
    const next = !camOff;
    setCamOff(next);
    if (!sharing) localStream.current?.getVideoTracks().forEach((t) => { t.enabled = !next; });
  };

  const shareScreen = async () => {
    const pc = pcRef.current;
    if (!pc) { setError('Join the call first, then share your screen.'); return; }
    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
    try {
      if (sharing) {
        if (sender && camTrack.current) await sender.replaceTrack(camTrack.current);
        setSharing(false);
        return;
      }
      const disp = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = disp.getVideoTracks()[0];
      if (sender) await sender.replaceTrack(track);
      else pc.addTrack(track, disp);
      track.onended = async () => {
        const s2 = pc.getSenders().find((x) => x.track?.kind === 'video');
        if (s2 && camTrack.current) { try { await s2.replaceTrack(camTrack.current); } catch { /* peer gone */ } }
        setSharing(false);
      };
      setSharing(true);
    } catch { /* user cancelled the picker */ }
  };

  if (!peerId) {
    return (
      <p className="rounded-3xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
        Calls connect you with one buddy at a time — invite someone to the room to start a call.
      </p>
    );
  }

  const inCall = status === 'calling' || status === 'connected';

  return (
    <div className="rounded-3xl border border-border bg-card p-3 shadow-sm">
      <div className="relative grid grid-cols-2 gap-2 overflow-hidden rounded-2xl bg-slate-900">
        <div className="relative aspect-video">
          <video ref={remoteRef} autoPlay playsInline className="h-full w-full object-cover" />
          {status !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-xs text-slate-300">
              {status === 'idle' && <span>No active call</span>}
              {status === 'calling' && (<><Loader2 className="h-5 w-5 animate-spin" /><span>Calling…</span></>)}
              {status === 'ringing' && <span>Incoming call…</span>}
            </div>
          )}
        </div>
        <div className="relative aspect-video">
          <video ref={localRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          {(!localStream.current || camOff) && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-xs text-slate-300">You</div>
          )}
        </div>
      </div>

      {error && <p className="mt-2 rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      <div className="mt-3 flex items-center justify-center gap-2">
        {status === 'idle' && (
          <Button className="rounded-full" onClick={startCall}>
            <Phone className="h-4 w-4" /> Start call
          </Button>
        )}
        {status === 'ringing' && (
          <>
            <Button className="rounded-full" onClick={acceptCall}><Phone className="h-4 w-4" /> Accept</Button>
            <Button variant="outline" className="rounded-full" onClick={declineCall}>Decline</Button>
          </>
        )}
        {inCall && (
          <>
            <Button size="icon" variant={muted ? 'destructive' : 'outline'} className="rounded-full" onClick={toggleMute} aria-label="Toggle microphone">
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant={camOff && !sharing ? 'destructive' : 'outline'} className="rounded-full" onClick={toggleCam} aria-label="Toggle camera">
              {camOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant={sharing ? 'default' : 'outline'} className="rounded-full" onClick={shareScreen} aria-label="Share your screen">
              <MonitorUp className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="destructive" className="rounded-full" onClick={() => cleanup(true)} aria-label="Leave the call">
              <PhoneOff className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}