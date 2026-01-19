import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/http";
import { toast } from "sonner";

import { useAuth } from "../store/authStore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import {
  MapPin,
  Users,
  User,
  ConciergeBell,
  ArrowLeft,
} from "lucide-react";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import CalendarRange from "../components/CalendarRange";

import {
  getAllCountries,
  getStatesByCountry,
  getCitiesByState,
} from "../lib/location";

import {
  toDateOnlyFromAPI,
  toDateOnlyFromAPIUTC,
} from "../lib/date";

import { format } from "date-fns";

/* =====================================================
   COMPONENT
===================================================== */

export default function EntireVilla() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, init, openAuth } = useAuth();

  /* ================= PERSONAL INFO ================= */
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: null,
  });

  /* ================= ADDRESS ================= */
  const [address, setAddress] = useState({
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
  });

  /* ================= BOOKING ================= */
  const [range, setRange] = useState({ from: null, to: null });
  const [guests, setGuests] = useState("1");

  /* ================= BLOCKED DATES ================= */
  const [bookedAll, setBookedAll] = useState([]);
  const [blackoutRanges, setBlackoutRanges] = useState([]);

  const disabledAll = useMemo(
    () => [...bookedAll, ...blackoutRanges],
    [bookedAll, blackoutRanges]
  );

  /* ================= LOCATION DATA ================= */
  const countries = getAllCountries();
  const states =
    address.country ? getStatesByCountry(address.country) : [];
  const cities =
    address.country && address.state
      ? getCitiesByState(address.country, address.state)
      : [];

  /* ================= INIT AUTH SESSION ================= */
  useEffect(() => {
    init();
  }, [init]);

  /* ================= AUTH GUARD ================= */
  useEffect(() => {
    if (!user) {
      // open login modal
      openAuth();

      // remember return path
      sessionStorage.setItem(
        "postAuthRedirect",
        JSON.stringify({
          redirectTo: location.pathname,
        })
      );
      return;
    }

    if (!user.profileComplete) {
      navigate("/complete-profile", {
        replace: true,
        state: { redirectTo: location.pathname },
      });
    }
  }, [user, navigate, openAuth, location.pathname]);

  /* ================= AUTOFILL FROM PROFILE ================= */
  useEffect(() => {
    if (!user || !user.profileComplete) return;

    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      dob: user.dob ? new Date(user.dob) : null,
    });

    setAddress({
      address: user.address || "",
      country: user.country || "",
      state: user.state || "",
      city: user.city || "",
      pincode: user.pincode || "",
    });
  }, [user]);

  /* ================= LOAD BLOCKED DATES ================= */
  useEffect(() => {
    api.get("/rooms/disabled/all").then(({ data }) =>
      setBookedAll(
        (data || []).map((b) => ({
          from: toDateOnlyFromAPIUTC(b.from || b.startDate),
          to: toDateOnlyFromAPIUTC(b.to || b.endDate),
        }))
      )
    );

    api.get("/blackouts").then(({ data }) =>
      setBlackoutRanges(
        (data || []).map((b) => ({
          from: toDateOnlyFromAPI(b.from),
          to: toDateOnlyFromAPI(b.to),
        }))
      )
    );
  }, []);

  /* ================= SUBMIT ENQUIRY ================= */
  const submitEnquiry = async () => {
    if (!form.name || !form.email || !form.phone) {
      toast.error("Please complete personal details");
      return;
    }

    if (!range.from || !range.to) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    if (
      !address.address ||
      !address.country ||
      !address.state ||
      !address.city ||
      !address.pincode
    ) {
      toast.error("Please complete your address details");
      return;
    }

    try {
      await api.post("/mail/send-entire-villa", {
        ...form,
        ...address,
        guests,
        startDate: range.from,
        endDate: range.to,
      });

      toast.success("Enquiry sent successfully ✨");
      navigate("/thank-you", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Failed to send enquiry. Please try again.");
    }
  };

  /* ================= UI ================= */
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* BACK */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-muted-foreground hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* ================= LEFT SUMMARY ================= */}
        <aside className="hidden lg:block lg:col-span-4 px-4">
          <div className="sticky top-[120px]">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

              <img
                src="/EntireVilla.webp"
                alt="Entire Villa"
                className="h-56 w-full object-cover"
              />

              <div className="p-5 space-y-4 text-sm">

                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Karjat, Maharashtra</span>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{guests} Guests</span>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#faf7f4] rounded-xl p-3">
                    <div className="text-xs text-muted-foreground">
                      CHECK-IN
                    </div>
                    <div className="font-medium">
                      {range.from && format(range.from, "dd MMM yyyy")}
                    </div>
                  </div>

                  <div className="bg-[#faf7f4] rounded-xl p-3">
                    <div className="text-xs text-muted-foreground">
                      CHECK-OUT
                    </div>
                    <div className="font-medium">
                      {range.to && format(range.to, "dd MMM yyyy")}
                    </div>
                  </div>
                </div>

                <Separator />

                <p className="text-xs text-muted-foreground">
                  This is an enquiry request. Our team will contact you
                  to confirm availability and pricing.
                </p>

              </div>
            </div>
          </div>
        </aside>

        {/* ================= RIGHT FORM ================= */}
        <section className="lg:col-span-6 space-y-6">

          {/* PERSONAL INFO */}
          <div className="rounded-2xl border bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <User className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <h3 className="font-semibold text-base">
                  Personal Information
                </h3>
                <p className="text-xs text-muted-foreground">
                  As per your profile
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input value={form.name} disabled />
              </div>

              <div>
                <Label>Email</Label>
                <Input value={form.email} disabled />
              </div>

              <div>
                <Label>Phone</Label>
                <Input value={form.phone} disabled />
              </div>
            </div>
          </div>

          {/* ADDRESS */}
          <div className="rounded-2xl border bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <h3 className="font-semibold text-base">
                  Address Details
                </h3>
                <p className="text-xs text-muted-foreground">
                  From your profile
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <Label>Street Address</Label>
                <Input value={address.address} disabled />
              </div>

              <div>
                <Label>Country</Label>
                <Input
                  value={
                    countries.find((c) => c.isoCode === address.country)
                      ?.name || ""
                  }
                  disabled
                />
              </div>

              <div>
                <Label>State</Label>
                <Input
                  value={
                    states.find((s) => s.isoCode === address.state)?.name ||
                    ""
                  }
                  disabled
                />
              </div>

              <div>
                <Label>City</Label>
                <Input value={address.city} disabled />
              </div>

              <div>
                <Label>Pincode</Label>
                <Input value={address.pincode} disabled />
              </div>
            </div>
          </div>

          {/* BOOKING PREF */}
          <div className="rounded-2xl border bg-white p-5 sm:p-6 space-y-6">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <ConciergeBell className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <h3 className="font-semibold text-base">
                  Booking Preferences
                </h3>
                <p className="text-xs text-muted-foreground">
                  Select stay details
                </p>
              </div>
            </div>

            <div>
              <Label>Check-in / Check-out</Label>
              <CalendarRange
                value={range}
                onChange={setRange}
                disabledRanges={disabledAll}
              />
            </div>

            <div>
              <Label>Total Guests</Label>
              <Select value={guests} onValueChange={setGuests}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CTA */}
          <Button
            className="w-full h-12 text-base bg-red-700 hover:bg-red-800"
            onClick={submitEnquiry}
          >
            Submit Enquiry
          </Button>

          {/* MOBILE CTA */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t px-4 py-3">
            <Button
              className="w-full h-12 text-base bg-red-700 hover:bg-red-800"
              onClick={submitEnquiry}
            >
              Submit Enquiry
            </Button>
          </div>

        </section>
      </div>
    </div>
  );
}
