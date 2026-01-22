import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { format } from "date-fns";

import {
  Check,
  MapPin,
  Users,
  Home,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/* ================= HELPERS ================= */

const fmt = (d) => format(new Date(d), "dd MMM yyyy");

/* ================= CONFETTI ================= */

const fireConfetti = () => {
  const colors = ["#ff3b3b", "#ffb703", "#3a86ff", "#8338ec", "#06d6a0"];

  confetti({
    particleCount: 180,
    spread: 90,
    startVelocity: 70,
    gravity: 0.9,
    ticks: 220,
    colors,
    origin: { x: 0.5, y: -0.15 },
  });

  const end = Date.now() + 1200;

  const frame = () => {
    if (Date.now() > end) return;

    confetti({
      particleCount: 12,
      startVelocity: 35,
      spread: 90,
      gravity: 1,
      ticks: 240,
      colors,
      origin: { x: Math.random(), y: -0.15 },
    });

    requestAnimationFrame(frame);
  };

  frame();
};

/* ================= COMPONENT ================= */

export default function EnquirySuccess() {
  const navigate = useNavigate();
  const confettiRan = useRef(false);

  const [data, setData] = useState(null);

  /* 🎉 CONFETTI */
  useLayoutEffect(() => {
    if (confettiRan.current) return;
    confettiRan.current = true;
    fireConfetti();
  }, []);

  /* 📦 LOAD FROM SESSION */
  useEffect(() => {
    const raw = sessionStorage.getItem("enquirySuccessData");
    if (!raw) {
      navigate("/", { replace: true });
      return;
    }

    setData(JSON.parse(raw));
    sessionStorage.removeItem("enquirySuccessData");
  }, [navigate]);

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#fff7f7]">

      {/* ================= HERO ================= */}
      <section className="bg-red-700 text-white py-10 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-4">

          <div className="mx-auto h-14 w-14 rounded-full bg-white flex items-center justify-center">
            <Check className="h-7 w-7 text-red-700" />
          </div>

          <p className="text-xs uppercase tracking-widest opacity-80">
            Enquiry Received
          </p>

          <h1 className="text-3xl md:text-4xl font-serif font-semibold">
            Thank You!
          </h1>

          <p className="text-sm opacity-90">
            Your enquiry has been successfully submitted.
            Our team will contact you shortly.
          </p>
        </div>
      </section>

      {/* ================= CONTENT ================= */}
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <h2 className="text-xl font-serif font-semibold">
            Enquiry Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {fmt(data.startDate)} → {fmt(data.endDate)}
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              {data.guests} Guests
            </div>

            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              {data.email}
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              {data.phone}
            </div>

            <div className="flex items-start gap-2 md:col-span-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <span>
                {data.addressInfo.address},{" "}
                {data.addressInfo.city},{" "}
                {data.addressInfo.state},{" "}
                {data.addressInfo.country} –{" "}
                {data.addressInfo.pincode}
              </span>
            </div>
          </div>

          <Separator />

          <p className="text-xs text-muted-foreground">
            This is an enquiry request. Availability and pricing will be
            confirmed by our team.
          </p>
        </div>

        <div className="flex justify-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-center">
          A confirmation has been sent to <b>{data.email}</b>.
          <br />
          Our team will contact you shortly.
        </div>
      </div>
    </div>
  );
}
