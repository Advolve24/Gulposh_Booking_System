import { NavLink } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-[#660810] text-white">
            {/* ================= MAIN FOOTER ================= */}
            <div className="max-w-7xl mx-auto  px-4 py-6 sm:px-6 sm:py-12 grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-12">

                {/* ================= BRAND ================= */}
                <div>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="bg-white rounded-2xl flex items-center justify-center shadow-sm">
                            <img
                                src="/Gulposh Logo.png"
                                alt="Villa Gulposh"
                                className=" h-11 sm:h-14 object-contain"
                            />
                        </div>
                    </div>

                    <p className="text-[13px] sm:text-[15px] leading-normal text-white/90 font-sans max-w-xs">
                        A premium private villa stay experience in Karjat, designed for
                        comfort, privacy, and unforgettable memories.
                    </p>

                    <div className="mt-3 sm:mt-6 w-14 h-[2px] bg-white/80 rounded-2xl" />
                </div>

                {/* ================= QUICK LINKS + POLICIES (MOBILE 2 COL) ================= */}
                <div className="grid grid-cols-2 gap-10 md:contents">

                    {/* QUICK LINKS */}
                    <div>
                        <h3 className="font-heading text-lg text-white mb-2 sm:mb-5">
                            Quick Links
                        </h3>
                        <ul className="space-y-2 text-[13px] sm:text-[14px]">
                            <FooterLink to="/about">About Villa</FooterLink>
                            <FooterLink to="/amenities">Amenities</FooterLink>
                            <FooterLink to="/gallery">Gallery</FooterLink>
                            <FooterLink to="/book">Book Now</FooterLink>
                            <FooterLink to="/faqs">FAQs</FooterLink>
                        </ul>
                    </div>

                    {/* POLICIES */}
                    <div>
                        <h3 className="font-heading text-lg text-white mb-2 sm:mb-5">
                            Policies
                        </h3>
                        <ul className="space-y-2 text-[13px] sm:text-[14px]">
                            <FooterLink to="/terms">Terms & Conditions</FooterLink>
                            <FooterLink to="/privacy">Privacy Policy</FooterLink>
                            <FooterLink to="/refund">Refund & Cancellation</FooterLink>
                            <FooterLink to="/pool-safety">Pool Safety Guidelines</FooterLink>
                            <FooterLink to="/house-rules">House Rules</FooterLink>
                        </ul>
                    </div>

                </div>

                {/* ================= CONTACT ================= */}
                <div>
                    <h3 className="font-heading text-lg text-white mb-2 sm:mb-5">
                        Contact Us
                    </h3>

                    <ul className="space-y-4 text-[13px] sm:text-[14px] text-white/90">

                        {/* PHONE */}
                        <li>
                            <a
                                href="tel:+919820074617"
                                className="group flex items-center gap-3 relative w-fit"
                            >
                                <Phone size={16} />
                                <span className="relative">
                                    +91 98200 74617
                                    <span
                                        className="
              absolute left-0 -bottom-1 h-[1.5px] bg-white
              w-0 group-hover:w-full
              transition-all duration-300 ease-out
            "
                                    />
                                </span>
                            </a>
                        </li>

                        {/* EMAIL */}
                        <li>
                            <a
                                href="mailto:stay@villagulposh.com"
                                className="group flex items-center gap-3 relative w-fit"
                            >
                                <Mail size={16} />
                                <span className="relative">
                                    stay@villagulposh.com
                                    <span
                                        className="
              absolute left-0 -bottom-1 h-[1.5px] bg-white
              w-0 group-hover:w-full
              transition-all duration-300 ease-out
            "
                                    />
                                </span>
                            </a>
                        </li>

                        {/* ADDRESS */}
                        <li>
                            <a
                                href="https://maps.google.com/?q=Villa+Gulposh+Karjat+Maharashtra"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-start gap-3 relative w-fit"
                            >
                                <MapPin size={16} className="mt-1" />
                                <span className="relative leading-snug">
                                    Villa Gulposh,<br />
                                    Karjat, Maharashtra – 410201
                                    <span
                                        className="
              absolute left-0 -bottom-1 h-[1.5px] bg-white
              w-0 group-hover:w-full
              transition-all duration-300 ease-out
            "
                                    />
                                </span>
                            </a>
                        </li>

                    </ul>
                </div>

            </div>

            {/* ================= BOTTOM BAR ================= */}
            <div className="border-t border-white/20 py-3 px-4 text-[13px] sm:text-[14px]">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-white/80">
                    <span>© 2026 Villa Gulposh. All rights reserved.</span>

                    <span className="flex items-center gap-1">
                        Designed & Powered by{" "}
                        <a
                            href="https://advolve.in"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative inline-block font-semibold text-white group"
                        >
                            ADVOLVE
                            <span
                                className="
                  absolute left-0 -bottom-1 h-[1.5px] bg-white
                  w-0 group-hover:w-full
                  transition-all duration-300 ease-out
                "
                            />
                        </a>
                    </span>
                </div>
            </div>
        </footer>
    );
}

/* ================= FOOTER LINK (FIXED) ================= */
function FooterLink({ to, children }) {
    return (
        <li>
            <NavLink
                to={to}
                className={({ isActive }) =>
                    `
          group relative inline-block
          transition-colors duration-300
          ${isActive ? "text-white" : "text-white/80 hover:text-white"}
        `
                }
            >
                {children}

                {/* underline */}
                <span
                    className={`
            absolute left-0 -bottom-1 h-[1px] bg-white
            transition-all duration-300 ease-out
            ${"w-0 group-hover:w-full"}
          `}
                />
            </NavLink>
        </li>
    );
}
