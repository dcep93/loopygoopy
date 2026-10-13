// JSDOM has no Web Audio. Record the actual oscillator starts in engine tests.
export function installTestAudio(onClick = () => {}) {
  const tones: any[] = [];
  const context = {
    state: 'running', currentTime: 0, destination: {}, resume: jest.fn(async () => {}), close: jest.fn(async () => {}),
    createOscillator: jest.fn(() => {
      const tone = { frequency: { value: 0 }, connect: jest.fn(), disconnect: jest.fn(), start: jest.fn(onClick), stop: jest.fn(), onended: null };
      tones.push(tone); return tone;
    }),
    createGain: jest.fn(() => ({ gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() }, connect: jest.fn(), disconnect: jest.fn() })),
  };
  (globalThis as any).AudioContext = jest.fn(() => context);
  return { context, tones };
}
