// A page can contain several independent reports (for example the control tab).
export function printSection(button: HTMLElement) {
  const section = button.closest("[data-print-section]");
  if (!section) return;
  section.setAttribute("data-print-target", "");
  const restore = () => section.removeAttribute("data-print-target");
  window.addEventListener("afterprint", restore, { once: true });
  window.print();
}
