import {
  type Fingering,
  type HoleTarget,
} from "@/features/music/types/fingering";

export interface FingeringEvaluation {
  correct: boolean;
  mismatchedHoles: HoleTarget[];
}

export function evaluateFingering(
  candidate: Fingering,
  expected: Fingering,
): FingeringEvaluation {
  const mismatchedHoles: HoleTarget[] = [];

  if (candidate.thumb !== expected.thumb) mismatchedHoles.push("thumb");
  candidate.front.forEach((state, index) => {
    if (state !== expected.front[index]) mismatchedHoles.push(index as HoleTarget);
  });

  return { correct: mismatchedHoles.length === 0, mismatchedHoles };
}
