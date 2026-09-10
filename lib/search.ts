// Tiny bridge so the navbar buttons can open the command palette without a
// context provider. CommandPalette listens for this event; anything can fire it.
export const SEARCH_EVENT = "stevens:open-search";

export const openSearch = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SEARCH_EVENT));
  }
};
