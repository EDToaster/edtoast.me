/** Only hide the OS pointer while a visible lens owns its exact hotspot. */
export function initGlassCursor() {
  const lens = document.querySelector<HTMLElement>("#glass-cursor")!;
  const toggle = document.querySelector<HTMLButtonElement>("[data-glass-toggle]")!;
  const eligible = matchMedia("(any-hover: hover) and (any-pointer: fine)");
  const nativeOnly = matchMedia("(forced-colors: active), (prefers-contrast: more), (prefers-reduced-transparency: reduce)");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const nativeSurface = "input, textarea, select, [contenteditable]:not([contenteditable=false]), iframe, [data-native-cursor]";
  const key = "edtoast:glass-cursor";
  let enabled = false;
  function restore() {
    try { enabled = localStorage.getItem(key) === "on"; } catch { /* keep in-memory choice */ }
    sync();
  }
  function setEnabled(value: boolean) {
    enabled = value;
    try { localStorage.setItem(key, enabled ? "on" : "off"); } catch { /* keep in-memory choice */ }
    sync();
  }

  let active: AbortController | undefined;
  let frame = 0;
  let x = 0, y = 0, light = -44;
  let lastX = 0, lastY = 0;

  function hide() {
    cancelAnimationFrame(frame);
    frame = 0;
    lens.hidden = true;
    lens.removeAttribute("data-pressed");
    document.documentElement.removeAttribute("data-glass-visible");
  }

  function paint() {
    frame = 0;
    // Keep position independent of press scale. The hotspot never eases behind the mouse.
    lens.style.translate = `${x}px ${y}px`;
    const dx = x - lastX, dy = y - lastY;
    if (lens.hidden || still.matches) light = -44;
    else if (dx || dy) {
      // A fixed upper-left light shifts slightly as the lens moves beneath it.
      light = -44 + Math.max(-26, Math.min(26, (dx - dy) * 1.4));
    }
    lens.style.setProperty("--light", `${light}deg`);
    lastX = x;
    lastY = y;
    if (lens.hidden) {
      lens.hidden = false;
      document.documentElement.setAttribute("data-glass-visible", "");
    }
  }

  function point(event: PointerEvent) {
    if (event.pointerType !== "mouse" || !(event.target instanceof Element) || event.target.closest(nativeSurface)) {
      hide();
      return;
    }
    x = event.clientX;
    y = event.clientY;
    lens.toggleAttribute("data-pressed", (event.buttons & 1) !== 0);
    lens.toggleAttribute("data-action", !!event.target.closest("a[href], button, summary, [role=button]"));
    if (!frame) frame = requestAnimationFrame(paint);
  }

  function sync() {
    toggle.hidden = !eligible.matches || nativeOnly.matches;
    toggle.setAttribute("aria-pressed", String(enabled));
    active?.abort();
    active = undefined;
    hide();
    if (!enabled || toggle.hidden) return;
    active = new AbortController();
    const options = { signal: active.signal, passive: true, capture: true };
    for (const type of ["pointermove", "pointerover", "pointerdown", "pointerup"] as const) {
      document.addEventListener(type, point, options);
    }
    document.addEventListener("pointerout", (event) => {
      if (!event.relatedTarget) hide();
    }, options);
    for (const type of ["pointercancel", "dragstart", "visibilitychange"] as const) {
      document.addEventListener(type, hide, options);
    }
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setEnabled(false);
      else hide();
    }, options);
    window.addEventListener("blur", hide, options);
    window.addEventListener("pagehide", hide, options);
    // Scrolling can move a map or form control underneath a stationary mouse.
    document.addEventListener("scroll", () => {
      if (!lens.hidden && document.elementFromPoint(x, y)?.closest(nativeSurface)) hide();
    }, options);
  }

  toggle.addEventListener("click", (event) => {
    setEnabled(!enabled);
    if (active && event.detail > 0 && event instanceof PointerEvent) point(event);
  });
  eligible.addEventListener("change", sync);
  nativeOnly.addEventListener("change", sync);
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) restore();
  });
  window.addEventListener("pageshow", (event) => { if (event.persisted) restore(); });
  restore();
}
