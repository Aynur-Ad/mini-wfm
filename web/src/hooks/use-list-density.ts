import { useState } from "react";
export function useListDensity() {
  const [compact, setCompact] = useState(
    () => localStorage.getItem("mini-wfm-list-density") === "compact",
  );
  function toggle() {
    localStorage.setItem(
      "mini-wfm-list-density",
      compact ? "normal" : "compact",
    );
    setCompact(!compact);
  }
  return { compact, toggle };
}
