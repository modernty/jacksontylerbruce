import { useEffect, useState } from "react";

export const craftDefaults = {
  stagger: 60,
  rise: 8,
  blur: 2,
  enter: 200,
  move: 360,
  scale: 0.98,
};

export function craftStyle(values) {
  return {
    "--craft-stagger": `${values.stagger}ms`,
    "--craft-rise": `${values.rise}px`,
    "--craft-blur": `${values.blur}px`,
    "--craft-enter": `${values.enter}ms`,
    "--craft-move": `${values.move}ms`,
    "--craft-scale": String(values.scale),
  };
}

export function useCraft() {
  const [values, setValues] = useState(craftDefaults);
  const [Dial, setDial] = useState(null);
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    let cancel = false;
    import("./dial-dev.jsx").then((mod) => {
      if (!cancel) setDial(() => mod.CraftDial);
    });
    return () => {
      cancel = true;
    };
  }, []);
  return { values, setValues, Dial };
}
