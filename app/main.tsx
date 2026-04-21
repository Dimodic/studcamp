import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppDataProvider } from "./lib/app-data";
import "../styles/tailwind.css";
import "../styles/theme.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container missing in index.html");
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <AppDataProvider>
      <App />
    </AppDataProvider>
  </React.StrictMode>,
);
