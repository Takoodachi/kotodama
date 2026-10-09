import { create } from "zustand";

interface KanaChartState {
  /**
   * Whether the sheet with the kana chart is open. Narrower screens only:
   * wide ones show the chart beside the page (settings.kanaChart).
   */
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useKanaChart = create<KanaChartState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
