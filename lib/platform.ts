// The ⌘K shortcut hint needs to read "Ctrl K" off Mac — Windows/Linux users
// don't have a ⌘ key. `navigator.platform` is deprecated but still the most
// reliable cross-browser signal; falls back to userAgent, then to "Mac" so
// server-rendered markup (no `navigator`) matches the common case.
export const isMacPlatform = (): boolean => {
  if (typeof navigator === "undefined") return true;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ??
    navigator.platform ??
    navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/i.test(platform);
};
