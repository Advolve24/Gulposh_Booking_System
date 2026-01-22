import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

import { api } from "@/api/http";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/* ================= HELPERS ================= */

const fmt = (d) => format(new Date(d), "dd MMM yyyy");

/* ================= CONFETTI ================= */

const fireConfetti = () => {
  const colors = ["#ff3b3b", "#ffb703", "#3a86ff", "#8338ec", "#06d6a0"];

  // Strong initial blast
  confetti({
    particleCount: 180,
    spread: 90,
    startVelocity: 70,
    gravity: 0.9,
    ticks: 220,
    colors,
    origin: { x: 0.5, y: -0.15 },
  });

  // Soft continuous fall
  const duration = 1200;
  const end = Date.now() + duration;

  const frame = () => {
    if (Date.now() > end) return;

    confetti({
      particleCount: 12,
      startVelocity: 35,
      spread: 90,
      gravity: 1,
      ticks: 240,
      colors,
      origin: {
        x: Math.random(),
        y: -0.15,
      },
    });

    requestAnimationFrame(frame);
  };

  frame();
};

/* ================= COMPONENT ================= */

export default function EnquirySuccess() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const confettiRan = useRef(false);

  /* 🎉 CONFETTI – RUN ONCE */
  useLayoutEffect(() => {
    if (confettiRan.current) return;
    confettiRan.current = true;
    fireConfetti();
  }, []);

  /* 🔒 HARD GUARD – DO NOT CALL API UNTIL ID EXISTS */
  useEffect(() => {
    if (!id) return;

    let active = true;

    (async () => {
      try {
        const { data } = await api.get(`/enquiries/${id}`);
        if (!active) return;
        setEnquiry(data);
      } catch {
        navigate("/", { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  if (!id || loading || !enquiry) return null;

  /* ================= UI ================= */

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

          <span className="inline-block mt-3 px-4 py-1 rounded-full bg-white/20 text-xs">
            Enquiry ID: #{enquiry._id.slice(-8).toUpperCase()}
          </span>
        </div>
      </section>

      {/* ================= CONTENT ================= */}
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">

        {/* SUMMARY CARD */}
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <h2 className="text-xl font-serif font-semibold">
            Enquiry Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {fmt(enquiry.startDate)} → {fmt(enquiry.endDate)}
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              {enquiry.guests} Guests
            </div>

            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              {enquiry.email}
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              {enquiry.phone}
            </div>

            <div className="flex items-start gap-2 md:col-span-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <span>
                {enquiry.addressInfo?.address},{" "}
                {enquiry.addressInfo?.city},{" "}
                {enquiry.addressInfo?.state},{" "}
                {enquiry.addressInfo?.country} –{" "}
                {enquiry.addressInfo?.pincode}
              </span>
            </div>

          </div>

          <Separator />

          <p className="text-xs text-muted-foreground">
            This is an enquiry request. Availability and pricing will be confirmed
            by our team.
          </p>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* NOTE */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-center">
          A confirmation has been sent to <b>{enquiry.email}</b>.
          <br />
          Our team will contact you shortly.
        </div>
      </div>
    </div>
  );
}
