import React from "react";
import ReactDOM from "react-dom/client";
import BookingSearchWidget from "./widgets/BookingSearchWidget";
import "./index.css";

const el = document.getElementById("gulposh-booking-widget");

if (el) {
  ReactDOM.createRoot(el).render(<BookingSearchWidget />);
}