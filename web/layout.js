export const getBreakpoint = (width = 0) => {
  if (width < 600) return "mobile";
  if (width < 900) return "tablet";
  return "desktop";
};

export const applyBreakpointClasses = (doc = document, width = typeof window !== "undefined" ? window.innerWidth : 0) => {
  const breakpoint = getBreakpoint(width);
  const root = doc.documentElement;
  const classNames = ["viewport-mobile", "viewport-tablet", "viewport-desktop"];
  root.classList.remove(...classNames);
  root.classList.add(`viewport-${breakpoint}`);
  root.dataset.breakpoint = breakpoint;
  return breakpoint;
};
