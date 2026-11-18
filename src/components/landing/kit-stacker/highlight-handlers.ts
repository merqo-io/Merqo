import type { PointerEvent } from "react";

// A tap on a button also focuses it and blurs the previous control. Only
// keyboard-driven focus changes should move the highlight, so track the last
// input modality instead of relying on :focus-visible, which jsdom lacks.
let keyboardModality = false;
if (typeof document !== "undefined") {
  document.addEventListener(
    "keydown",
    () => {
      keyboardModality = true;
    },
    true,
  );
  document.addEventListener(
    "pointerdown",
    () => {
      keyboardModality = false;
    },
    true,
  );
}

/** Pointer wiring shared by the module list, block tower and graph. Hover
 *  highlights only for a mouse. A touch or pen tap pins the highlight and a
 *  second tap clears it. Using pointer events throughout avoids the
 *  compatibility mouseenter a browser fires after a touch, which would undo
 *  the tap. */
export function highlightHandlers(
  slug: string,
  highlight: string | null,
  onHighlight: (slug: string | null) => void,
) {
  return {
    "data-kit-slug": slug,
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === "mouse") onHighlight(slug);
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === "mouse") onHighlight(null);
    },
    onFocus: () => {
      if (keyboardModality) onHighlight(slug);
    },
    onBlur: () => {
      if (keyboardModality) onHighlight(null);
    },
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType !== "mouse")
        onHighlight(highlight === slug ? null : slug);
    },
  };
}
