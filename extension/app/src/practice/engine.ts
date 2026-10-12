import { Definition, Preferences, Playback, Lead, interval, paused, validPreferences } from './model';

// Media time owns moving phases; a monotonic clock owns frozen phases. Every
// asynchronous operation belongs to a generation so cancellation cannot resume it.
export class PracticeEngine {
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private cancelWait?: () => void;
  private audio?: AudioContext;
  private tones = new Set<OscillatorNode>();
  private originalRate: number;
  private originalLoop: boolean;
  private controlled = false;
  state: Playback = { ...paused };
  constructor(private media: HTMLVideoElement, readonly definition: Definition, public prefs: Preferences,
    private publish: (state: Playback) => void, private now = () => performance.now()) {
    this.originalRate = media.playbackRate;
    this.originalLoop = media.loop;
  }
  // The strip follows the same picture during track leads, frozen leads and seeks.
  readBeat = () => this.controlled && Number.isFinite(this.media.currentTime)
    ? 1 + (this.media.currentTime - this.definition.firstBeat) * this.definition.bpm / 60
    : this.prefs.first;
  private emit(patch: Partial<Playback>) { this.state = { ...this.state, ...patch }; this.publish(this.state); }
  private alive(g: number) { return this.generation === g; }
  private wait(ms: number, g: number): Promise<void> {
    if (!this.alive(g)) return Promise.resolve();
    return new Promise(resolve => {
      this.cancelWait = resolve;
      this.timer = setTimeout(() => { this.cancelWait = undefined; resolve(); }, ms);
    });
  }
  pause() {
    this.generation++;
    clearTimeout(this.timer);
    this.cancelWait?.(); this.cancelWait = undefined;
    this.tones.forEach(t => { try { t.stop(); } catch {} }); this.tones.clear();
    this.media.pause();
    this.emit({ running: false, phase: 'paused', remaining: 0 });
  }
  dispose() { if (this.controlled) { this.pause(); this.media.playbackRate = this.originalRate; this.media.loop = this.originalLoop; } void this.audio?.close(); }
  async update(p: Preferences) {
    if (!validPreferences(p)) throw Error('Invalid practice settings.');
    this.controlled = true;
    const running = this.state.running;
    this.pause(); this.prefs = p;
    if (running) return this.play();
    const g = this.generation;
    try { await this.seek(interval(this.definition, p).start, g); }
    catch (e) { if (this.alive(g)) this.emit({ phase: 'error', error: String(e) }); }
    if (this.alive(g) && !this.state.running) this.emit({ beat: p.first });
  }
  private async seek(time: number, g: number) {
    if (!this.alive(g)) return;
    this.media.pause(); this.media.currentTime = Math.max(0, Math.min(time, this.media.duration));
    const deadline = this.now() + 15000;
    while (this.alive(g) && (this.media.seeking || this.media.readyState < 2)) {
      if (this.now() > deadline) throw Error('The video is taking too long to seek. Try Play again.');
      await this.wait(25, g);
    }
  }
  private click(accent: boolean) {
    const context = this.audio; if (!context || context.state !== 'running') return;
    const oscillator = context.createOscillator(), gain = context.createGain(), at = context.currentTime;
    oscillator.frequency.value = accent ? 1000 : 760;
    gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(.12, at + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, at + .055);
    oscillator.connect(gain); gain.connect(context.destination);
    this.tones.add(oscillator); oscillator.onended = () => { this.tones.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(at); oscillator.stop(at + .06);
  }
  private async frozen(beats: number, phase: 'lead-in' | 'lead-out', sound: boolean, g: number) {
    if (!(beats > 0) || !this.alive(g)) return;
    const ms = 60000 / this.definition.bpm / this.prefs.speed, start = this.now(); let clicked = -1;
    this.media.pause();
    while (this.alive(g)) {
      const elapsed = this.now() - start;
      if (elapsed >= beats * ms) break;
      const index = Math.floor(elapsed / ms);
      this.emit({ phase, remaining: Math.ceil(beats - elapsed / ms) });
      if (sound && index !== clicked) { this.click(index === 0); clicked = index; }
      await this.wait(16, g);
    }
  }
  private async moving(from: number, to: number, phase: 'lead-in' | 'practice' | 'lead-out', g: number) {
    if (!this.alive(g) || to <= from) return;
    this.emit({ phase: 'seeking' });
    await this.seek(from, g); if (!this.alive(g)) return;
    this.media.playbackRate = this.prefs.speed; this.media.loop = false;
    await this.media.play();
    if (!this.alive(g)) return;
    let previous = this.media.currentTime, movedAt = this.now();
    while (this.alive(g)) {
      const time = this.media.currentTime;
      if (time >= to - .012 || this.media.ended) break;
      if (this.media.paused) { this.pause(); return; }
      if (time !== previous) { previous = time; movedAt = this.now(); }
      const buffering = this.media.readyState < 3 || this.media.seeking || this.now() - movedAt > 300;
      // Seek positions are rounded by the media element. Allow 1 ms at beat
      // boundaries and never show more than the configured lead duration.
      const remaining = phase === 'practice' ? 0 : Math.max(1, Math.min(
        phase === 'lead-in' ? this.prefs.leadIn.beats : this.prefs.leadOut.beats,
        Math.ceil((to - time - .001) * this.definition.bpm / 60)));
      this.emit({ phase: buffering ? 'buffering' : phase,
        beat: phase === 'practice' ? Math.max(this.prefs.first, Math.min(this.prefs.last, Math.floor((time - this.definition.firstBeat) * this.definition.bpm / 60) + 1)) : this.state.beat,
        remaining });
      await this.wait(16, g);
    }
    if (this.alive(g)) this.media.pause();
  }
  private async lead(lead: Lead, before: boolean, g: number) {
    if (!lead.beats || !this.alive(g)) return;
    const { start, end, beatSeconds } = interval(this.definition, this.prefs);
    const phase = before ? 'lead-in' : 'lead-out';
    if (lead.style !== 'track') {
      await this.seek(before ? start : Math.max(start, end - .035), g);
      await this.frozen(lead.beats, phase, lead.style === 'metronome', g); return;
    }
    const from = before ? Math.max(0, start - lead.beats * beatSeconds) : end;
    const to = before ? start : Math.min(this.media.duration, end + lead.beats * beatSeconds);
    // Only pad footage actually clipped by a video edge. Subtracting the
    // computed interval length can invent a tiny missing beat through rounding.
    const missing = (before ? Math.max(0, lead.beats * beatSeconds - start) :
      Math.max(0, end + lead.beats * beatSeconds - this.media.duration)) / beatSeconds;
    if (before && missing) { await this.seek(0, g); await this.frozen(missing, phase, false, g); }
    await this.moving(from, to, phase, g);
    if (!before && missing) await this.frozen(missing, phase, false, g);
  }
  async play() {
    this.controlled = true;
    this.pause(); const g = this.generation;
    const { end } = interval(this.definition, this.prefs);
    if (!Number.isFinite(this.media.duration) || end > this.media.duration) {
      this.emit({ phase: 'error', error: 'The prepared section does not fit this video, or the video is still loading.' }); return;
    }
    if ([this.prefs.leadIn.style, this.prefs.leadOut.style].includes('metronome')) {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        this.audio ||= new AudioContext();
        await Promise.race([this.audio.resume(), new Promise((_, reject) => { timeout = setTimeout(() => reject(Error('Audio blocked')), 2000); })]);
      } catch { if (this.alive(g)) this.emit({ phase: 'error', error: 'Click the video once to enable metronome audio, then try Play again.' }); return; }
      finally { clearTimeout(timeout); }
    }
    if (!this.alive(g)) return;
    this.emit({ running: true, phase: 'seeking', error: undefined, cycle: 0 });
    try {
      while (this.alive(g)) {
        this.emit({ cycle: this.state.cycle + 1, beat: this.prefs.first });
        await this.lead(this.prefs.leadIn, true, g);
        const { start, end } = interval(this.definition, this.prefs);
        await this.moving(start, end, 'practice', g);
        await this.lead(this.prefs.leadOut, false, g);
      }
    } catch (e) {
      if (this.alive(g)) { this.pause(); this.emit({ phase: 'error', error: e instanceof Error ? e.message : String(e) }); }
    }
  }
}
