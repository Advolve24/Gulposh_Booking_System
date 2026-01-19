export default function HouseRules() {
  return (
    <main className="bg-background">

      {/* ================= HERO ================= */}
      <section className="bg-[#660810] text-white">
        <div className="max-w-5xl mx-auto px-6 py-6 sm:py-14">
          <h1 className="font-heading text-3xl sm:text-4xl mb-4">
            House Rules & Property Guidelines
          </h1>

          <p className="text-white/90 text-sm sm:text-base leading-relaxed">
            Applies to all bookings and stays at Villa Gulposh
          </p>
        </div>
      </section>

      {/* ================= CONTENT ================= */}
      <section className="max-w-5xl mx-auto px-6 py-6 sm:py-12">
        <div className="space-y-10 text-sm sm:text-base leading-relaxed text-foreground">

          {/* PROPERTY INFO */}
          <div className="space-y-2">
            <p>
              <strong>Booking Portal:</strong> booking.villagulposh.com |{" "}
              <strong>Main Website:</strong> villagulposh.com
            </p>
            <p>
              <strong>Contact:</strong> +91 98200 74617 | stay@villagulposh.com
            </p>
          </div>

          <Divider />

          <PolicyBlock
            title="1) Registered Guests Only"
            points={[
              "Only registered or declared guests are permitted on the property",
              "Unregistered visitors may be denied entry and/or treated as a rule violation",
              "Management may request valid government ID proof at check-in"
            ]}
          />

          <PolicyBlock
            title="2) Cleanliness & Care of Property"
            points={[
              "Please treat the property as your own and keep it clean",
              "Do not damage furniture, fixtures, linens, electronics, or amenities",
              "Excessive mess or misuse may result in additional cleaning charges"
            ]}
          />

          <PolicyBlock
            title="3) Smoking & Alcohol Policy"
            points={[
              "Smoking and alcohol consumption are strictly prohibited inside rooms and the pool area",
              "Any violation may result in immediate action by management, including eviction without refund"
            ]}
          />

          <PolicyBlock
            title="4) Noise & Respect"
            points={[
              "Maintain a respectful environment for other guests and neighbors",
              "Loud music, nuisance, or disruptive behavior is not permitted",
              "Management may intervene if noise levels are deemed inappropriate"
            ]}
          />

          <PolicyBlock
            title="5) Safety & Facility Use"
            points={[
              "Use all facilities responsibly and follow safety instructions",
              "Pool usage is governed by the Pool Safety Guidelines & Declaration",
              "Children must be supervised by adults at all times across the property"
            ]}
          />

          <PolicyBlock
            title="6) Check-in / Check-out Compliance"
            points={[
              "Check-in time: 12:00 PM",
              "Check-out time: 10:00 AM",
              "Late checkout or early check-in is subject to availability and may be chargeable"
            ]}
          />

          <PolicyBlock
            title="7) Right to Refuse Service"
            points={[
              "Villa Gulposh reserves the right to refuse service or terminate a stay (without refund where applicable) in cases of rule violations",
              "Unsafe or illegal activities",
              "Property damage or guest misconduct"
            ]}
          />

        </div>
      </section>
    </main>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function PolicyBlock({ title, points }) {
  return (
    <div className="space-y-3">
      <h2 className="font-heading text-lg sm:text-xl">
        {title}
      </h2>

      <ul className="list-disc pl-5 space-y-2">
        {points.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ul>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border" />;
}
