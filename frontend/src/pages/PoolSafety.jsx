export default function PoolSafety() {
  return (
    <main className="bg-background">

      {/* ================= HERO ================= */}
      <section className="bg-[#660810] text-white">
        <div className="max-w-5xl mx-auto px-6 py-6 sm:py-12">
          <h1 className="font-heading text-3xl sm:text-4xl mb-4">
            Pool Safety Guidelines & Declaration
          </h1>

          <p className="text-white/90 text-sm sm:text-base leading-relaxed">
            Applies to all guests using the swimming pool at Villa Gulposh
          </p>
        </div>
      </section>

      {/* ================= CONTENT ================= */}
      <section className="max-w-5xl mx-auto px-6 py-6 sm:py-12">
        <div className="space-y-10 text-sm sm:text-base leading-relaxed text-foreground">

          {/* PROPERTY INFO */}
          <div className="space-y-2">
            <p><strong>Property:</strong> Villa Gulposh – Vidyasagar Properties Pvt Ltd.</p>
            <p>
              <strong>Address:</strong> House no 32 A, Dnyandeep Society,
              Kirawali, Karjat – 410201
            </p>
            <p>
              <strong>Contact:</strong> +91 98200 74617 | stay@villagulposh.com
            </p>
          </div>

          <Divider />

          {/* A) POOL SAFETY GUIDELINES */}
          <PolicyBlock
            title="A) Pool Safety Guidelines (Mandatory)"
            points={[
              "All children under 14 years must be accompanied by an adult at all times",
              "Running, pushing, and horseplay are strictly prohibited in and around the pool area",
              "Appropriate swimwear is required",
              "Diving is strictly prohibited",
              "Glassware is not permitted within the pool area",
              "Only flexible swim-aids are permitted (hard or rigid items are not allowed)",
              "Pool depth is 05 feet",
              "Users assume all risk of injury while using the pool facilities",
              "Always practice water safety and courtesy to other guests",
              "Shower before entering the pool"
            ]}
          />

          {/* B) DECLARATION */}
          <PolicyBlock
            title="B) Declaration / Consent (By Using the Pool)"
            points={[
              "Swimming involves inherent risk and may lead to injury or accident",
              "Villa Gulposh, its owners, management, and staff shall not be held responsible for any injury, accident, illness, loss, or damage arising from unsafe behavior, negligence, or violation of pool rules",
              "Guests agree to follow all safety guidelines and ensure minors under their supervision comply at all times",
              "Management reserves the right to restrict or stop pool access for safety, maintenance, weather conditions, or rule violations"
            ]}
          />

          {/* EMERGENCY NOTE */}
          <div className="rounded-xl border border-border p-4 bg-muted/30">
            <p className="font-semibold mb-1">Emergency Note</p>
            <p>
              Please inform management immediately in case of any incident
              or medical emergency.
            </p>
          </div>

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
