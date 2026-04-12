import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import BookingSearchWidget from "./widgets/BookingSearchWidget";
import styles from "./index.css?inline";

const host = document.getElementById("gulposh-booking-widget");

if (host) {
  const shadowRoot = host.attachShadow({ mode: "open" });

  const styleTag = document.createElement("style");
  styleTag.textContent = styles;
  shadowRoot.appendChild(styleTag);

  const mountPoint = document.createElement("div");
  shadowRoot.appendChild(mountPoint);

  ReactDOM.createRoot(mountPoint).render(
    <React.StrictMode>
      <BookingSearchWidget />
    </React.StrictMode>
  );

  const toasterDiv = document.createElement("div");
  document.body.appendChild(toasterDiv);

  ReactDOM.createRoot(toasterDiv).render(
    <Toaster richColors closeButton position="top-center" />
  );
}