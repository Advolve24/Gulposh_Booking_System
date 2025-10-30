import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../api/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
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
import { toDateOnlyFromAPI, toDateOnlyFromAPIUTC } from "../lib/date";

export default function EntireVilla() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: null,
    range: { from: null, to: null },
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
  });

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [disabledAll, setDisabledAll] = useState([]);

  // Load countries on mount
  useEffect(() => {
    setCountries(getAllCountries());
  }, []);

  // Update states/cities dynamically
  useEffect(() => {
    if (form.country) setStates(getStatesByCountry(form.country));
    else setStates([]);
    setCities([]);
  }, [form.country]);

  useEffect(() => {
    if (form.country && form.state)
      setCities(getCitiesByState(form.country, form.state));
    else setCities([]);
  }, [form.state, form.country]);

  // Fetch blocked dates (same logic as checkout)
  useEffect(() => {
    (async () => {
      try {
        const [bookingsRes, blackoutsRes] = await Promise.all([
          api.get("/rooms/disabled/all"),
          api.get("/blackouts"),
        ]);

        const bookings = (bookingsRes.data || []).map((b) => ({
          from: toDateOnlyFromAPIUTC(b.from || b.startDate),
          to: toDateOnlyFromAPIUTC(b.to || b.endDate),
        }));

        const blackouts = (blackoutsRes.data || []).map((b) => ({
          from: toDateOnlyFromAPI(b.from),
          to: toDateOnlyFromAPI(b.to),
        }));

        setDisabledAll([...bookings, ...blackouts]);
      } catch (err) {
        console.error("Failed to load disabled ranges:", err);
        setDisabledAll([]);
      }
    })();
  }, []);

  // Handle submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!form.range.from || !form.range.to) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    try {
      await api.post("/mail/send-entire-villa", form);
      toast.success("Form submitted successfully!");
      navigate("/thank-you");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send enquiry. Try again.");
    }
  };

  // Handle phone number input (digits only)
  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((f) => ({ ...f, phone: digits }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Book the Entire Villa</h1>

      <form
        onSubmit={handleSubmit}
        className="border rounded-xl p-6 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Basic Info */}
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your full name"
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Label>Phone</Label>
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={handlePhoneChange}
              placeholder="10-digit mobile number"
            />
          </div>

          <div>
            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={form.dob ? format(form.dob, "yyyy-MM-dd") : ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, dob: new Date(e.target.value) }))
              }
            />
          </div>

          {/* Check-in/Check-out as Range */}
          <div className="sm:col-span-2">
            <Label>Check-in / Check-out</Label>
            <CalendarRange
              value={form.range}
              onChange={(range) => setForm((f) => ({ ...f, range }))}
              numberOfMonths={1}
              disabledRanges={disabledAll}
            />
          </div>

          {/* Address Section */}
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              placeholder="Street, Apartment, Landmark"
            />
          </div>

          {/* Country */}
          <div>
            <Label>Country</Label>
            <Select
              value={form.country}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  country: v,
                  state: "",
                  city: "",
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {countries.map((c) => (
                  <SelectItem key={c.isoCode} value={c.isoCode}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* State */}
          <div>
            <Label>State</Label>
            <Select
              value={form.state}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, state: v, city: "" }))
              }
              disabled={!form.country}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {states.map((s) => (
                  <SelectItem key={s.isoCode} value={s.isoCode}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div>
            <Label>City</Label>
            <Select
              value={form.city}
              onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}
              disabled={!form.state}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {cities.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pincode */}
          <div>
            <Label>Pincode</Label>
            <Input
              value={form.pincode}
              onChange={(e) =>
                setForm((f) => ({ ...f, pincode: e.target.value }))
              }
              placeholder="Postal code"
            />
          </div>
        </div>

        <Button type="submit" className="w-full">
          Submit
        </Button>
      </form>
    </div>
  );
}
