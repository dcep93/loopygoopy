export enum MessageType {
  start,
  stop,
  init,
}

export enum Field {
  original_BPM,
  beats_per_loop,
  count__in_beats,
  count__in_style,
  tempo_change,
  train_target,
  train_loops,
  start_time,
  end_time,
  notes,
}

export enum CountInStyle {
  silent,
  track,
  metronome,
}

export type NumberConfigType = { [f in Field]?: number };
export type ConfigSansBookmarks = { [f in Field]?: string };
export type Bookmark = {
  bookmark_name: string;
  config: ConfigSansBookmarks;
};
export type Config = ConfigSansBookmarks & {
  bookmarks: Bookmark[];
};
