import ReactDOM from "react-dom/client";
import { StrictMode } from "react";

import "@shared/index.css";
import { PwaApp } from "./PwaApp";

const root = ReactDOM.createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <PwaApp />
  </StrictMode>,
);
