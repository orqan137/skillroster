import { useEffect } from "react";

export function useModalBehavior(onClose: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')].at(-1) ?? null;
    const focusableSelector = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not(.modal-close), a[href], [tabindex]:not([tabindex="-1"])';
    const focusables = () => dialog ? [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => element.offsetParent !== null) : [];
    queueMicrotask(() => (focusables()[0] ?? dialog)?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusables();
      if (!elements.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [active, onClose]);
}
