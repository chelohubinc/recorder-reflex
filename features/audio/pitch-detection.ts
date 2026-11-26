export type PitchEstimate = {
  frequency: number;
  clarity: number;
};

/** YIN difference-function pitch estimate for a monophonic instrument signal. */
export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
  options: { minHz?: number; maxHz?: number; threshold?: number } = {},
): PitchEstimate | null {
  const { minHz = 390, maxHz = 1_250, threshold = 0.16 } = options;
  const minTau = Math.max(2, Math.floor(sampleRate / maxHz));
  const maxTau = Math.min(Math.floor(sampleRate / minHz), Math.floor(samples.length / 2) - 1);
  if (maxTau <= minTau || sampleRate <= 0) return null;

  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  if (Math.sqrt(energy / samples.length) < 0.008) return null;

  const differences = new Float64Array(maxTau + 1);
  const windowSize = samples.length - maxTau;
  for (let tau = 1; tau <= maxTau; tau++) {
    let difference = 0;
    for (let i = 0; i < windowSize; i++) {
      const delta = samples[i] - samples[i + tau];
      difference += delta * delta;
    }
    differences[tau] = difference;
  }

  const normalized = new Float64Array(maxTau + 1);
  normalized[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    runningSum += differences[tau];
    normalized[tau] = runningSum === 0 ? 1 : (differences[tau] * tau) / runningSum;
  }

  let selectedTau = -1;
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (normalized[tau] < threshold) {
      while (tau + 1 <= maxTau && normalized[tau + 1] < normalized[tau]) tau++;
      selectedTau = tau;
      break;
    }
  }

  if (selectedTau < 0) {
    let best = threshold;
    for (let tau = minTau; tau <= maxTau; tau++) {
      if (normalized[tau] < best) {
        best = normalized[tau];
        selectedTau = tau;
      }
    }
  }
  if (selectedTau < 0) return null;

  const left = normalized[Math.max(1, selectedTau - 1)];
  const center = normalized[selectedTau];
  const right = normalized[Math.min(maxTau, selectedTau + 1)];
  const denominator = 2 * (2 * center - right - left);
  const adjustment = denominator === 0 ? 0 : (right - left) / denominator;
  const refinedTau = selectedTau + Math.max(-1, Math.min(1, adjustment));
  const frequency = sampleRate / refinedTau;
  if (frequency < minHz || frequency > maxHz) return null;

  return { frequency, clarity: 1 - center };
}

const NOTE_NAMES = ["Do", "Do♯", "Ré", "Ré♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"] as const;

export function describePitch(frequency: number) {
  const midiFloat = 69 + 12 * Math.log2(frequency / 440);
  const midi = Math.round(midiFloat);
  return {
    midi,
    name: NOTE_NAMES[((midi % 12) + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
    cents: Math.round((midiFloat - midi) * 100),
  };
}
