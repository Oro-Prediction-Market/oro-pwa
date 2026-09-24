import ReactDOM from "react-dom/client";
import { StrictMode } from "react";

import "@shared/index.css";
import { PwaApp } from "./PwaApp";
import { UpdatePrompt } from "./components/UpdatePrompt";

const root = ReactDOM.createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    <PwaApp />
    {/* Outside PwaApp on purpose: it registers the service worker, so it has
        to mount whatever PwaApp itself is showing — signed out, bootstrapping
        or an error branch. It renders nothing until an update is waiting. */}
    <UpdatePrompt />
  </StrictMode>,
);
