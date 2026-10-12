// Host dimensions use CSS pixels because YouTube has a 10px root while the
// extension frame has a 16px root. Measured frame heights are CSS pixels too.
// Scoped overrides leave YouTube's player and its media element in place.
export const practicePageCSS = `
html.loopy-practice {
  --loopy-controls-height: 224px;
  --loopy-video-height: max(192px, calc(100dvh - var(--loopy-controls-height) - 34px));
  background: #0c0907 !important;
}
html.loopy-practice body {
  background: radial-gradient(circle at top left, rgba(255,123,195,.12), transparent 24%),
    radial-gradient(circle at top right, rgba(201,156,107,.14), transparent 32%),
    linear-gradient(180deg, #1a1411, #0c0907) !important;
}
html.loopy-practice :is(ytd-masthead, #secondary, #below, #comments, ytd-miniplayer, ytd-guide-renderer) { display: none !important; }
/* YouTube's ambient canvases extend beyond the player and paint over siblings. */
html.loopy-practice #cinematics { display: none !important; }
html.loopy-practice ytd-app { background: transparent !important; }
html.loopy-practice ytd-page-manager { margin: 0 !important; }
html.loopy-practice ytd-watch-flexy { --ytd-watch-flexy-masthead-height: 0px; }
html.loopy-practice #columns { padding: 12px !important; max-width: none !important; margin: 0 !important; display: block !important; }
html.loopy-practice #primary { padding: 0 !important; margin: 0 !important; max-width: none !important; width: 100% !important; }
html.loopy-practice #primary-inner { display: flex !important; flex-direction: column !important; gap: 10px; width: 100% !important; }
html.loopy-practice #loopy-practice-panel { position: relative; z-index: 1; order: -1; display: block; flex: none; width: 100%; max-width: 1248px; height: var(--loopy-controls-height); margin: 0 auto; border: 0; border-radius: 16px; color-scheme: dark; }
html.loopy-practice #player { isolation: isolate; flex: none !important; width: 100% !important; height: var(--loopy-video-height) !important; margin: 0 !important; }
html.loopy-practice :is(#player-container-outer, #player-container-inner, #player-container, ytd-player, #container.ytd-player) {
  width: 100% !important; height: 100% !important; min-height: 0 !important; max-height: none !important;
  max-width: none !important; padding: 0 !important; margin: 0 !important;
}
html.loopy-practice #movie_player { width: 100% !important; height: 100% !important; background: transparent !important; }
html.loopy-practice #movie_player .html5-video-container { width: 100% !important; height: 100% !important; }
html.loopy-practice #movie_player video { object-fit: contain !important; width: 100% !important; height: 100% !important; left: 0 !important; top: 0 !important; }
html.loopy-practice.loopy-practice-lead #movie_player video { opacity: .5 !important; }
`;
