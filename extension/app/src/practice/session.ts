import { PracticeEngine } from './engine';
import { Definition, Playback, Preferences, defaults, paused, validDefinition, validPreferences } from './model';
import { requestDefinition } from './tabCatalog';

export type PracticeSnapshot = { definition?: Definition; prefs?: Preferences; playback?: Playback; loading?: boolean; notice?: string; error?: string; saveError?: string };

// One instance per watch-page lifetime. Neither playback nor UI uses runtime ports.
export class PracticeSession {
  snapshot: PracticeSnapshot = { loading: true };
  private listeners = new Set<() => void>();
  private engine?: PracticeEngine;
  private media?: HTMLVideoElement;
  private disposed = false;
  private generation = 0;
  private saveGeneration = 0;
  private writes: Promise<void> = Promise.resolve();
  constructor(readonly mediaId: string) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  readBeat = () => this.engine?.readBeat() ?? this.snapshot.prefs?.first ?? 1;
  private publish(patch: Partial<PracticeSnapshot>) {
    if (this.disposed) return;
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }
  async load(refresh = false) {
    if (this.disposed || this.snapshot.playback?.running) return;
    const generation = ++this.generation;
    this.publish({ loading: true, error: undefined });
    let saveError: string | undefined;
    const [catalog, saved] = await Promise.all([
      requestDefinition(this.mediaId, refresh),
      Promise.resolve().then(() => window.chrome.storage.local.get(`practice-prefs:${this.mediaId}`)).catch(() => {
        saveError = 'Saved preferences are unavailable. You can still practice.'; return {};
      }),
    ]);
    if (this.disposed || generation !== this.generation) return;
    const value = saved[`practice-prefs:${this.mediaId}`];
    // A catalog retry must not discard unsaved choices in this session.
    const prefs = this.snapshot.prefs || (validPreferences(value) ? value : { ...defaults, leadIn: { ...defaults.leadIn }, leadOut: { ...defaults.leadOut } });
    this.releaseMedia(false);
    this.publish({ ...catalog, prefs, playback: { ...paused, beat: prefs.first }, loading: false, saveError });
  }
  attachMedia(media: HTMLVideoElement) {
    if (this.disposed || this.media === media || !validDefinition(this.snapshot.definition, this.mediaId) || !this.snapshot.prefs) return;
    this.releaseMedia(false);
    this.media = media;
    const engine = new PracticeEngine(media, this.snapshot.definition, this.snapshot.prefs, playback => {
      if (this.engine !== engine) return;
      const previous = this.snapshot.playback;
      // The engine ticks frequently; React only needs actual visible state changes.
      if (previous && (['phase', 'running', 'beat', 'remaining', 'cycle', 'error'] as const).every(key => previous[key] === playback[key])) return;
      this.publish({ playback });
    });
    this.engine = engine;
    this.publish({ playback: { ...paused, beat: this.snapshot.prefs.first } });
  }
  releaseMedia(notify = true) {
    const engine = this.engine;
    this.engine = undefined; this.media = undefined;
    engine?.dispose();
    if (engine && notify) this.publish({ playback: { ...paused, beat: this.snapshot.prefs?.first || 1 } });
  }
  play = () => { if (!this.disposed) void this.engine?.play(); };
  pause = () => { if (!this.disposed && this.engine?.state.running) this.engine.pause(); };
  reportError(error: string) { this.publish({ playback: { ...paused, beat: this.snapshot.prefs?.first || 1, phase: 'error', error } }); }
  change = (prefs: Preferences) => {
    if (this.disposed || !validPreferences(prefs) || !this.snapshot.definition) return;
    const save = ++this.saveGeneration;
    this.publish({ prefs });
    void this.engine?.update(prefs);
    this.writes = this.writes.catch(() => {}).then(() => window.chrome.storage.local.set({ [`practice-prefs:${this.mediaId}`]: prefs }));
    void this.writes.then(() => {
      if (save === this.saveGeneration) this.publish({ saveError: undefined });
    }, () => {
      if (save === this.saveGeneration) this.publish({ saveError: 'Settings could not be saved. Your current session is still running.' });
    });
  };
  dispose() {
    this.disposed = true; this.generation++;
    this.releaseMedia(); this.listeners.clear();
  }
}
