import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/http";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MapPin, Users, User, ConciergeBell, ArrowLeft } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import CalendarRange from "../components/CalendarRange";
import { getAllCountries, getStatesByCountry, getCitiesByState } from "../lib/location";
import { toDateOnlyFromAPI, toDateOnlyFromAPIUTC } from "../lib/date";
import { format } from "date-fns";
import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRecaptchaVerifier } from "@/lib/recaptcha";


export default function EntireVilla() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [address, setAddress] = useState({
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
  });

  const [range, setRange] = useState({ from: null, to: null });
  const [guests, setGuests] = useState("1");

  const [bookedAll, setBookedAll] = useState([]);
  const [blackoutRanges, setBlackoutRanges] = useState([]);

  const [otpStep, setOtpStep] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [checkingUser, setCheckingUser] = useState(false);
  const confirmationRef = useRef(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [firebaseToken, setFirebaseToken] = useState(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [profileLocked, setProfileLocked] = useState(false);

  const disabledAll = useMemo(
    () => [...bookedAll, ...blackoutRanges],
    [bookedAll, blackoutRanges]
  );

  const countries = getAllCountries();
  const states =
    address.country ? getStatesByCountry(address.country) : [];
  const cities =
    address.country && address.state
      ? getCitiesByState(address.country, address.state)
      : [];


  useEffect(() => {
    const raw = sessionStorage.getItem("searchParams");
    if (!raw) return;

    try {
      const { range: r, adults = 0, children = 0 } = JSON.parse(raw);
      if (r?.from && r?.to) {
        setRange({ from: new Date(r.from), to: new Date(r.to) });
      }
      const total = Number(adults) + Number(children);
      if (total > 0) setGuests(String(total));
    } catch { }
  }, []);

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


  const sendOtp = async () => {
    if (form.phone.length !== 10) {
      toast.error("Enter valid mobile number");
      return;
    }
    setCheckingUser(true);
    try {
      const verifier = getRecaptchaVerifier("villa-recaptcha");
      await new Promise((resolve) => setTimeout(resolve, 300));
      confirmationRef.current = await signInWithPhoneNumber(
        auth,
        `+91${form.phone}`,
        verifier
      );
      setOtpStep(true);
      setSecondsLeft(60);
      toast.success("OTP sent successfully");
    } catch (err) {
      console.error("OTP error:", err);
      toast.error("Unable to send OTP. Refresh and try again.");
    } finally {
      setCheckingUser(false);
    }
  };


  const verifyOtp = async () => {
    if (verifyingOtp || otpVerified || otp.length !== 6) return;
    setVerifyingOtp(true);
    try {
      const result = await confirmationRef.current.confirm(otp);
      const idToken = await result.user.getIdToken(true);
      setFirebaseToken(idToken);
      setOtpVerified(true);

      const { data } = await api.post("/auth/check-user", {
        phone: form.phone,
      });
      if (data.exists) {
        setForm((f) => ({
          ...f,
          name: data.user.name || "",
          email: data.user.email || "",
        }));

        setAddress({
          address: data.user.address || "",
          country: data.user.country || "",
          state: data.user.state || "",
          city: data.user.city || "",
          pincode: data.user.pincode || "",
        });

        setProfileLocked(true);
      }
      toast.success("Phone verified ✔");
    } catch (err) {
      console.error(err);
      toast.error("Invalid OTP");
      setOtp("");
    } finally {
      setVerifyingOtp(false);
    }
  };


  useEffect(() => {
    if (otp.length === 6 && !otpVerified && !verifyingOtp && confirmationRef.current) {
      verifyOtp();
    }
  }, [otp, otpVerified, verifyingOtp]);



  const submitEnquiry = async () => {
    if (!otpVerified || !firebaseToken) {
      toast.error("Please verify your mobile number first");
      return;
    }
    if (!form.name || form.name.length < 3) {
      toast.error("Please enter your full name");
      return;
    }

    if (!form.email || !form.email.includes("@")) {
      toast.error("Please enter valid email");
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
      const { data } = await api.post("/enquiries/entire-villa", {
        firebaseToken,

        name: form.name,
        email: form.email,
        phone: form.phone,

        startDate: range.from.toISOString().split("T")[0],
        endDate: range.to.toISOString().split("T")[0],
        guests: Number(guests),

        addressInfo: address,
        source: "frontend",
      });

      toast.success("Enquiry submitted successfully ✨");
      sessionStorage.setItem(
        "enquirySuccessData",
        JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          startDate: range.from,
          endDate: range.to,
          guests,
          addressInfo: address,
        })
      );
      navigate("/enquiry-success", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit enquiry. Please try again.");
    }
  };

  useEffect(() => {
    if (!otpStep || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpStep, secondsLeft]);

  return (
    <>
      <div id="villa-recaptcha"></div>
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
                      <div className="text-xs text-muted-foreground">CHECK-IN</div>
                      <div className="font-medium">
                        {range.from && format(range.from, "dd MMM yyyy")}
                      </div>
                    </div>

                    <div className="bg-[#faf7f4] rounded-xl p-3">
                      <div className="text-xs text-muted-foreground">CHECK-OUT</div>
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

            <div className="rounded-2xl border bg-white p-5 sm:p-6 space-y-4">
              <h3 className="font-semibold text-base">Verify Mobile Number</h3>

              <div className="flex gap-2">
                <Input
                  placeholder="Enter 10 digit mobile number"
                  value={form.phone}
                  disabled={otpVerified}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                    })
                  }
                />

                {!otpStep && (
                  <Button onClick={sendOtp} disabled={checkingUser}>
                    Send OTP
                  </Button>
                )}
              </div>

              {otpStep && !otpVerified && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Enter 6 digit OTP"
                        value={otp}
                        disabled={otpVerified || verifyingOtp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        className="tracking-[0.35em] text-center text-lg"
                      />
                    </div>

                    <Button
                      disabled
                      className={`w-[120px]
      ${otpVerified
                          ? "bg-green-600"
                          : verifyingOtp
                            ? "bg-amber-500"
                            : "bg-gray-300 text-gray-600"}`}
                    >
                      {otpVerified
                        ? "Verified"
                        : verifyingOtp
                          ? "Verifying..."
                          : "Verify"}
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {secondsLeft > 0 ? (
                      <>Resend OTP in {secondsLeft}s</>
                    ) : (
                      <button
                        className="underline text-red-700"
                        onClick={() => {
                          setOtp("");
                          setOtpVerified(false);
                          sendOtp();
                        }}
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              )}

              {otpVerified && (
                <p className="text-green-600 text-sm">
                  Mobile number verified successfully ✔
                </p>
              )}
            </div>

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
                  <Input value={form.name} disabled={!otpVerified || profileLocked} />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input value={form.email} disabled={!otpVerified || profileLocked} />
                </div>

                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} disabled={!otpVerified} />
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
                  <Input value={address.address} disabled={!otpVerified || profileLocked} />
                </div>

                <div>
                  <Label>Country</Label>
                  <Input disabled={!otpVerified || profileLocked} value={address.country} />
                </div>

                <div>
                  <Label>State</Label>
                  <Input disabled={!otpVerified || profileLocked} value={address.state} />
                </div>

                <div>
                  <Label>City</Label>
                  <Input disabled={!otpVerified} value={address.city} />
                </div>

                <div>
                  <Label>Pincode</Label>
                  <Input disabled={!otpVerified || profileLocked} value={address.pincode} />
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
                    {[...Array(22)].map((_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1}
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

          </section>
        </div>
      </div>
    </>
  );
}
