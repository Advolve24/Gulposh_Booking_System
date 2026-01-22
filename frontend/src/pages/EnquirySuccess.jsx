import { useEffect, useLayoutEffect, useState } from "react";
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

/* ---------------- HELPERS ---------------- */

const fmt = (d) => format(new Date(d), "dd MMM yyyy");

/* ---------------- CONFETTI ---------------- */

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

/* ---------------- COMPONENT ---------------- */

export default function EnquirySuccess() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const confettiRan = { current: false };

  /* 🎉 CONFETTI ON LOAD */
  useLayoutEffect(() => {
    if (confettiRan.current) return;
    confettiRan.current = true;
    fireConfetti();
  }, []);

  /* 🔄 LOAD ENQUIRY */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/enquiries/${id}`);
        setEnquiry(data);
      } catch {
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (loading || !enquiry) return null;

  return (
    <div className="min-h-screen bg-[#fff7f7]">

      {/* ================= HERO ================= */}
      <section className="bg-red-700 text-white py-12 px-4 text-center">
        <div className="max-w-xl mx-auto space-y-4">

          <div className="mx-auto h-14 w-14 rounded-full bg-white flex items-center justify-center">
            <Check className="h-7 w-7 text-red-700" />
          </div>

          <p className="text-xs uppercase tracking-widest opacity-80">
            Enquiry Submitted
          </p>

          <h1 className="text-3xl md:text-4xl font-serif font-semibold">
            Thank You!
          </h1>

          <p className="text-sm opacity-90">
            Your enquiry has been successfully submitted.
            Our team will get back to you shortly.
          </p>

          <span className="inline-block mt-3 px-4 py-1 rounded-full bg-white/20 text-xs">
            Enquiry ID: #{enquiry._id.slice(-8).toUpperCase()}
          </span>
        </div>
      </section>

      {/* ================= DETAILS ================= */}
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold">Enquiry Details</h2>

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
        </div>

        {/* ================= ACTIONS ================= */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* ================= NOTE ================= */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-center">
          A confirmation has been sent to <b>{enquiry.email}</b>.
          <br />
          Our team will contact you shortly.
        </div>

      </div>
    </div>
  );
}
