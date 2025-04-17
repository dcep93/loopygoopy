import { Field, updateInput } from "./Brain";

export default function Tap() {
  return (
    <div>
      <div>determine BPM:</div>
      <button
        onClick={() =>
          Promise.resolve(tapAndGetBpm().toFixed(2)).then((bpm) =>
            Promise.resolve()
              .then(() => updateInput(Field.original_BPM, bpm, true))
              .then(() => updateInput(Field.original_BPM, bpm, false))
          )
        }
      >
        tap
      </button>
    </div>
  );
}

const max_taps = 32;
const taps: number[] = [];

function tapAndGetBpm(): number {
  taps.unshift(Date.now());
  if (taps.length > max_taps) taps.pop();
  const distances = taps.slice(1).map((t, i) => taps[i] - t);
  const avg_distance = distances.reduce((a, b) => a + b, 0) / distances.length;
  const stddev = Math.pow(
    distances
      .map((d) => Math.pow(d - avg_distance, 2))
      .reduce((a, b) => a + b, 0) / distances.length,
    0.5
  );
  if (Math.abs((distances[0] - avg_distance) / stddev) > 4) {
    taps.splice(1);
    return Number.POSITIVE_INFINITY;
  }
  return (60 * 1000) / avg_distance;
}
