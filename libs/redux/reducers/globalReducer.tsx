import { createSlice } from "@reduxjs/toolkit";

import { Alert } from "@/types/Alert";

const initialState = {
  language: "tr",
  theme: "dark",
  alerts: [] as Alert[],
};

const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    addAlert: (state, action) => {
      // Generate a random id
      const id = Math.random().toString(36).substr(2, 9);
      state.alerts.push({ id, ...action.payload });
    },
    removeAlert: (state, action) => {
      state.alerts = state.alerts.filter((alert) => alert.id !== action.payload);
    },
  },
});

export const { setLanguage, setTheme, addAlert, removeAlert } = globalSlice.actions;
export default globalSlice.reducer;
