import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import CalendarRange from "../components/CalendarRange";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import ImageSlider from "../components/ImageSlider";
import { toDateOnlyFromAPI, toDateOnlyFromAPIUTC } from "../lib/date";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import AmenitiesDropdown from "@/components/AmenitiesDropdown";
import { amenityCategories } from "../data/aminities"; // NEW


function mergeRanges(ranges) {
  if (!ranges || !ranges.length) return [];

  const sorted = ranges
    .map((r) => ({ from: new Date(r.from), to: new Date(r.to) }))
    .sort((a, b) => a.from - b.from);

  if (!sorted.length) return [];

  const out = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    const dayAfterLast = new Date(last.to.getFullYear(), last.to.getMonth(), last.to.getDate() + 1);

    if (cur.from <= dayAfterLast) {
      if (cur.to > last.to) last.to = cur.to;
    } else {
      out.push(cur);
    }
  }
  return out;
}


/* ---------------- MAIN PAGE ---------------- */
export default function RoomPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [room, setRoom] = useState(null);
  const [range, setRange] = useState();
  const [guests, setGuests] = useState("");

  const [bookedAll, setBookedAll] = useState([]);
  const [blackoutRanges, setBlackoutRanges] = useState([]);


  /* ---------------- Fetch Booked Dates ---------------- */
  const fetchAllBookedRanges = async () => {
    try {
      let res = await api.get("/rooms/disabled/all");
      let list = Array.isArray(res.data) ? res.data : [];

      if (!list.length) {
        res = await api.get("/rooms/blocked/all");
        list = Array.isArray(res.data) ? res.data : [];
      }

      if (list.length) {
        return list.map((b) => ({
          from: toDateOnlyFromAPIUTC(b.from || b.startDate),
          to: toDateOnlyFromAPIUTC(b.to || b.endDate),
        }));
      }
    } catch (_) {}

    try {
      const { data: rooms } = await api.get("/rooms");
      const entries = await Promise.all(
        (rooms || []).map((r) =>
          api.get(`/rooms/${r._id}/blocked`).then(({ data }) => data || [])
        )
      );
      const flat = entries.flat();

      return flat.map((b) => ({
        from: toDateOnlyFromAPIUTC(b.startDate),
        to: toDateOnlyFromAPIUTC(b.endDate),
      }));
    } catch {
      return [];
    }
  };



  /* ---------------- Load Room + Booked Ranges ---------------- */
  useEffect(() => {
    api
      .get(`/rooms/${id}`)
      .then(({ data }) => setRoom(data))
      .catch(() => setRoom(null));

    (async () => {
      const all = await fetchAllBookedRanges();
      setBookedAll(all);
    })();

    api.get("/blackouts").then(({ data }) => {
      const ranges = (data || []).map((b) => ({
        from: toDateOnlyFromAPI(b.from),
        to: toDateOnlyFromAPI(b.to),
      }));
      setBlackoutRanges(ranges);
    });
  }, [id]);



  /* ---------------- Load Query Params ---------------- */
  useEffect(() => {
    const stateFrom = location.state?.from;
    const stateTo = location.state?.to;
    const stateGuests = location.state?.guests;

    const qpFrom = searchParams.get("from");
    const qpTo = searchParams.get("to");
    const qpGuests = searchParams.get("guests");

    const fromISO = stateFrom || qpFrom;
    const toISO = stateTo || qpTo;

    if (fromISO && toISO) {
      const from = new Date(fromISO);
      const to = new Date(toISO);
      if (!isNaN(from) && !isNaN(to)) setRange({ from, to });
    }

    const g = stateGuests || qpGuests;
    if (g) setGuests(String(g));
  }, []);



  /* ---------------- Update Query Params ---------------- */
  useEffect(() => {
    const sp = new URLSearchParams(searchParams);
    if (range?.from && range?.to) {
      sp.set("from", range.from.toISOString());
      sp.set("to", range.to.toISOString());
    } else {
      sp.delete("from");
      sp.delete("to");
    }
    setSearchParams(sp, { replace: true });
  }, [range]);



  /* ---------------- Guests ---------------- */
  const onGuestsChange = (v) => {
    setGuests(v);
    const sp = new URLSearchParams(searchParams);
    if (v) sp.set("guests", v);
    else sp.delete("guests");
    setSearchParams(sp, { replace: true });
  };



  /* ---------------- Max Guests Calculation ---------------- */
  const maxGuestsCap = useMemo(() => {
    if (!room) return null;
    if (typeof room.maxGuests === "number" && room.maxGuests > 0) return room.maxGuests;

    const nums = (room.accommodation || [])
      .flatMap((s) => Array.from(String(s).matchAll(/\d+/g)).map((m) => Number(m[0])))
      .filter((n) => Number.isFinite(n) && n > 0);

    const sum = nums.length ? nums.reduce((a, b) => a + b, 0) : 0;
    return Math.max(1, sum || 1);
  }, [room]);



  /* ---------------- Disable Booked Dates ---------------- */
  const disabledAll = useMemo(
    () => mergeRanges([...(blackoutRanges || []), ...(bookedAll || [])]),
    [blackoutRanges, bookedAll]
  );



  /* ---------------- Go to Checkout ---------------- */
  const goToCheckout = () => {
    if (!range?.from || !range?.to) return alert("Please select dates first");
    if (!guests) return alert("Please select number of guests");

    const s = new Date(range.from);
    const e = new Date(range.to);

    const conflict = disabledAll.some((b) => !(e < b.from || s > b.to));
    if (conflict) {
      alert("⚠️ The selected dates include already booked days.");
      return;
    }

    navigate("/checkout", {
      state: {
        roomId: room._id,
        startDate: range.from,
        endDate: range.to,
        guests: Number(guests),
      },
    });
  };



  /* ---------------- All Images ---------------- */
  const allImages = useMemo(
    () => [room?.coverImage, ...(room?.galleryImages || [])].filter(Boolean),
    [room]
  );



  if (!room) return null;



  /* ---------------- RENDER PAGE ---------------- */
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">

      <Link to="/">
        <Button className="bg-transparent text-black hover:text-white">
          Back
        </Button>
      </Link>

      <ImageSlider images={allImages} />

      {/* ROOM TITLE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{room.name}</h1>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg sm:text-xl">
            ₹{Number(room.pricePerNight).toLocaleString("en-IN")}/night
          </span>

          <div className="hidden sm:block h-5 w-px bg-border" />

          <span className="text-lg sm:text-xl">
            ₹{(
              Number(room.pricePerNight) + Number(room.priceWithMeal)
            ).toLocaleString("en-IN")}
            /night with meal
          </span>
        </div>
      </div>

      {/* DESCRIPTION */}
      <div className="text-gray-700 text-sm sm:text-base leading-relaxed">
        {room.description}
      </div>



      {/* MAIN CONTENT */}
      <div className="flex flex-col md:flex-row gap-6 items-start">

        {/* LEFT SIDE */}
        <div className="w-full md:w-[64%] space-y-6 ">

          {/* AMENITIES DROPDOWN UI */}
          {room.amenities?.length > 0 && (
            <AmenitiesDropdown amenities={room.amenities} />
          )}

        </div>



        {/* RIGHT SIDE */}
        <div className="w-full md:w-[34%] shadow-lg border p-4 rounded-xl space-y-4">

          <CalendarRange
            value={range}
            onChange={setRange}
            numberOfMonths={1}
            disabledRanges={disabledAll}
          />

          <div>
            <label className="block text-sm mb-1">
              Guests {maxGuestsCap ? `(max ${maxGuestsCap})` : ""}
            </label>

            <Select value={guests} onValueChange={onGuestsChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select guests" />
              </SelectTrigger>

              <SelectContent>
                {Array.from({ length: Math.max(1, maxGuestsCap || 1) }, (_, i) => i + 1).map(
                  (n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={goToCheckout} className="w-full">
            Book Now
          </Button>
        </div>
      </div>
    </div>
  );
}
