import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import BookingSearchWidget from "./widgets/BookingSearchWidget";
import "./index.css";

const el = document.getElementById("gulposh-booking-widget");

if (el) {
  ReactDOM.createRoot(el).render(
    <React.StrictMode>
      <BookingSearchWidget />
      <Toaster richColors closeButton position="top-center" />
    </React.StrictMode>
  );
}
