import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Country, State, City } from "country-state-city";


export default function UserEditDialog({ open, onOpenChange, user, onSave }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: null,
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
  });

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");

  useEffect(() => {
    setCountries(Country.getAllCountries());
  }, []);

  useEffect(() => {
    if (!user || !countries.length) return;

    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || user.mobile || "",
      dob: user.dob ? new Date(user.dob) : null,

      address: user.address || "",
      country: user.country || "",
      state: user.state || "",
      city: user.city || "",
      pincode: user.pincode || "",
    });

    const countryObj =
      countries.find(c => c.name === user.country) ||
      countries.find(c => c.isoCode === "IN");
    if (!countryObj) return;
    setCountryCode(countryObj.isoCode);
    const stateList = State.getStatesOfCountry(countryObj.isoCode);
    setStates(stateList);
    const stateObj = stateList.find(s => s.name === user.state);
    if (stateObj) {
      setStateCode(stateObj.isoCode);
      setCities(City.getCitiesOfState(countryObj.isoCode, stateObj.isoCode));
    } else {
      setCities([]);
    }
  }, [user, countries]);


  const onCountryChange = (code) => {
    const c = countries.find(c => c.isoCode === code);

    setCountryCode(code);
    setStateCode("");
    setCities([]);
    setStates(State.getStatesOfCountry(code));

    setForm(f => ({
      ...f,
      country: c?.name || "",
      state: "",
      city: "",
    }));
  };

  const onStateChange = (code) => {
    const s = states.find(s => s.isoCode === code);
    setStateCode(code);
    setCities(City.getCitiesOfState(countryCode, code));
    setForm(f => ({
      ...f,
      state: s?.name || "",
      city: "",
    }));
  };
  const onCityChange = (name) => {
    setForm(f => ({ ...f, city: name }));
  };

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-[95vw] md:max-w-xl
          rounded-2xl
          [&>button]:hidden p-0 pr-2
        "
      >
        {/* HEADER */}
        <div className="md:max-h-full max-h-[80vh] px-4 py-4 overflow-y-auto">
          <div className="relative border-b px-5 py-2">
            <DialogTitle className="text-lg font-semibold">
              Edit User
            </DialogTitle>

            {/* CUSTOM CLOSE BUTTON */}
            <button
              onClick={() => onOpenChange(false)}
              className="
              absolute top-0 right-0
              h-8 w-8
              rounded-full
              border
              flex items-center justify-center
              hover:bg-muted
              transition
            "
            >
              <X size={14} />
            </button>
          </div>

          {/* BODY */}
          <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </Field>

            <Field label="Email">
              <Input
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </Field>

            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </Field>

            <Field label="DOB">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {form.dob ? format(form.dob, "PPP") : "Select DOB"}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="p-0">
                  <Calendar
                    mode="single"
                    selected={form.dob}
                    onSelect={(d) => update("dob", d)}
                    captionLayout="dropdown"
                    fromYear={1950}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </Field>

            {/* ADDRESS DETAILS */}
            <div className="sm:col-span-2 border-t mt-2 pt-4 mt-0 space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Address Details
              </h4>

              <Field label="Street Address">
                <Input
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Country">
                  <Select value={countryCode} onValueChange={onCountryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-64">
                      {countries.map(c => (
                        <SelectItem key={c.isoCode} value={c.isoCode}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="State">
                  <Select
                    value={stateCode}
                    onValueChange={onStateChange}
                    disabled={!states.length}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-64">
                      {states.map(s => (
                        <SelectItem key={s.isoCode} value={s.isoCode}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="City">
                  <Select
                    value={form.city}
                    onValueChange={onCityChange}
                    disabled={!cities.length}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-64">
                      {cities.map((c, i) => (
                        <SelectItem key={i} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Pincode">
                  <Input
                    value={form.pincode}
                    maxLength={6}
                    onChange={(e) => update("pincode", e.target.value)}
                  />
                </Field>
              </div>
            </div>

          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-2 px-5 pb-5">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onSave(form)}>
              Save changes
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================= UI HELPER ================= */

function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
