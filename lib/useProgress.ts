"use client";

import { useEffect, useState } from "react";
import { emptyProgress, getProgress, subscribeToProgress, type Progress } from "./progress";

export function useProgressSnapshot(): Progress {
  const [progress, setProgress] = useState<Progress>(emptyProgress);

  useEffect(() => {
    const refresh = () => setProgress(getProgress());
    refresh();
    return subscribeToProgress(refresh);
  }, []);

  return progress;
}
