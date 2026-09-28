import { create } from "zustand";

interface GuideState {
  /** Opened from the ⓘ button (the first-visit opening comes from settings.guideSeen). */
  open: boolean;
  /** Briefly points at the ⓘ button after the guide first closes, so it can be found again. */
  hint: boolean;
  openGuide: () => void;
  closeGuide: (showHint: boolean) => void;
  dismissHint: () => void;
}

export const useGuide = create<GuideState>()((set) => ({
  open: false,
  hint: false,
  openGuide: () => set({ open: true, hint: false }),
  closeGuide: (showHint) => set({ open: false, hint: showHint }),
  dismissHint: () => set({ hint: false }),
}));

/** DOM id of the header button the guide shrinks into. */
export const GUIDE_BUTTON_ID = "guide-button";
