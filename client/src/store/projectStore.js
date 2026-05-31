import { create } from "zustand";
import { persist } from "zustand/middleware";

const useProjectStore = create(
  persist(
    (set) => ({
      selectedProject: null,

      setSelectedProject: (project) => set({ selectedProject: project }),
      clearSelectedProject: () => set({ selectedProject: null }),
    }),
    {
      name: "ttt-project",
      partialize: (state) => ({ selectedProject: state.selectedProject }),
    },
  ),
);

export default useProjectStore;
