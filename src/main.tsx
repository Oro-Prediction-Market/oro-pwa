import ReactDOM from "react-dom/client";
import { StrictMode } from "react";

import "@shared/index.css";
import { PwaApp } from "./PwaApp";
import { registerServiceWorker } from "./registerServiceWorker";

registerServiceWorker();

const root = ReactDOM.createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <PwaApp />
  </StrictMode>,
);
