import { useEffect } from "react";
import { DialRoot, useDialKit } from "dialkit";
import "dialkit/styles.css";

export function CraftDial({ onChange }) {
  const values = useDialKit("Craft", {
    stagger: [60, 0, 240, 1],
    rise: [8, 0, 32, 1],
    blur: [2, 0, 16, 0.5],
    enter: [200, 150, 250, 1],
    move: [360, 300, 400, 1],
    scale: [0.98, 0.9, 1, 0.01],
  });
  useEffect(() => {
    onChange({
      stagger: values.stagger,
      rise: values.rise,
      blur: values.blur,
      enter: values.enter,
      move: values.move,
      scale: values.scale,
    });
  }, [values.stagger, values.rise, values.blur, values.enter, values.move, values.scale, onChange]);
  return <DialRoot />;
}
