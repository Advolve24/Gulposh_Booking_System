import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

export const verifySMTP = async () => {
  try {
    await transporter.verify();
    console.log("SMTP connection verified");
  } catch (err) {
    console.error("SMTP verification failed:", err.message);
  }
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toDateString();
};

const formatCurrency = (value) =>
  `Rs.${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getBookingMailMeta = ({ booking, room }) => {
  const adults = Number(booking.adults || 0);
  const children = Number(booking.children || 0);
  const vegCount = Number(booking.vegGuests || 0);
  const nonVegCount = Number(booking.nonVegGuests || 0);
  const mealTotal = Number(booking.mealTotal || 0);
  const roomTotal = Number(booking.roomTotal || 0);
  const subtotal = roomTotal + mealTotal;
  const discountAmount = Number(booking.discountMeta?.discountAmount || 0);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const cgstAmount = Number(
    booking.taxBreakup?.cgstAmount ?? (booking.totalTax ? booking.totalTax / 2 : 0)
  );
  const sgstAmount = Number(
    booking.taxBreakup?.sgstAmount ?? (booking.totalTax ? booking.totalTax / 2 : 0)
  );
  const cgstPercent =
    booking.taxBreakup?.cgstPercent ??
    (discountedSubtotal > 0
      ? Math.round((cgstAmount / discountedSubtotal) * 100)
      : 0);
  const sgstPercent =
    booking.taxBreakup?.sgstPercent ??
    (discountedSubtotal > 0
      ? Math.round((sgstAmount / discountedSubtotal) * 100)
      : 0);

  return {
    bookingId: booking._id || booking.paymentId || "-",
    checkIn: formatDate(booking.startDate),
    checkOut: formatDate(booking.endDate),
    adults,
    children,
    nights: Number(booking.nights || 0),
    vegCount,
    nonVegCount,
    mealTotal,
    roomTotal,
    subtotal,
    discountAmount,
    discountedSubtotal,
    cgstAmount,
    sgstAmount,
    cgstPercent,
    sgstPercent,
    grandTotal: Number(booking.amount || 0),
    foodText:
      room?.mealMode === "only"
        ? "Included in room charges"
        : mealTotal > 0
          ? formatCurrency(mealTotal)
          : "Not selected",
    imageUrl:
      room?.coverImage ||
      room?.galleryImages?.[0] ||
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511",
    location:
      room?.location || booking.location || "Karjat, Maharashtra, India",
    roomName: room?.name || "Villa Gulposh",
  };
};

const renderMailShell = ({ preheader, body }) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Villa Gulposh</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  ${body}
</body>
</html>`;

const renderBookingEmailHtml = ({
  recipientName,
  introText,
  heading,
  footerText,
  ctaLabel,
  ctaHref,
  subjectLabel,
  booking,
  room,
}) => {
  const meta = getBookingMailMeta({ booking, room });

  return renderMailShell({
    preheader: subjectLabel,
    body: `
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:30px 10px;">
      <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#1f5f54;padding:28px;">
            <table width="100%">
              <tr>
                <td width="48" valign="top">
                  <div style="width:44px;height:44px;background:#ffffff22;border-radius:50%;text-align:center;line-height:44px;font-size:22px;color:#ffffff;font-weight:bold;">&#10003;</div>
                </td>
                <td style="padding-left:14px;">
                  <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">${heading}</h1>
                  <p style="margin:0;font-size:13px;color:#e5e7eb;">ID: ${meta.bookingId}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 28px 10px;font-size:15px;color:#111827;">
            Hello <b>${recipientName}</b>, ${introText}
          </td>
        </tr>

        <tr>
          <td style="padding:0 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:14px;overflow:hidden;">
                  <img src="${meta.imageUrl}" width="100%" height="200" style="display:block;object-fit:cover;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:14px 28px 0;">
            <h2 style="margin:0;font-size:20px;font-weight:600;color:#111827;">${meta.roomName}</h2>
            <p style="margin:0;font-size:13px;color:#6b7280;">Location: ${meta.location}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:18px 28px 0;">
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111827;">Stay Details</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding-right:6px;">
                  <table width="100%" style="background:#f5f3ef;border:1px solid #f5f3ef;border-radius:12px;">
                    <tr>
                      <td style="padding:14px;text-align:center;">
                        <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">CHECK-IN</div>
                        <div style="font-size:14px;font-weight:600;">${meta.checkIn}</div>
                      </td>
                    </tr>
                  </table>
                </td>
                <td width="50%" style="padding-left:6px;">
                  <table width="100%" style="background:#f5f3ef;border:1px solid #f5f3ef;border-radius:12px;">
                    <tr>
                      <td style="padding:14px;text-align:center;">
                        <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">CHECK-OUT</div>
                        <div style="font-size:14px;font-weight:600;">${meta.checkOut}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 28px 10px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:6px 0;font-size:14px;color:#111827;"><b>${meta.adults}</b> Adults, <b>${meta.children}</b> Children</td>
                <td align="right" style="padding:6px 0;font-size:14px;color:#111827;white-space:nowrap;"><b>${meta.nights}</b> Night</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 28px 14px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:14px 14px;font-size:14px;color:#111827;">Food Preference</td>
                <td align="right" style="padding:14px 14px;font-size:14px;color:#111827;white-space:nowrap;">Non-veg <b>${meta.nonVegCount}</b> | Veg <b>${meta.vegCount}</b></td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-size:14px;color:#111827;">
              <tr>
                <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">Food Charges</td>
                <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#111827;">${meta.foodText}</td>
              </tr>
              <tr>
                <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">Stay Charges</td>
                <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#111827;">${formatCurrency(meta.roomTotal)}</td>
              </tr>
              <tr>
                <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">Subtotal</td>
                <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#111827;">${formatCurrency(meta.subtotal)}</td>
              </tr>
              ${meta.discountAmount > 0 ? `
              <tr>
                <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#16a34a;">Discount</td>
                <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#16a34a;font-weight:700;">-${formatCurrency(meta.discountAmount)}</td>
              </tr>
              <tr>
                <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">After Discount</td>
                <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#111827;">${formatCurrency(meta.discountedSubtotal)}</td>
              </tr>
              ` : ""}
              <tr>
                <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">CGST (${meta.cgstPercent}%)</td>
                <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#111827;">${formatCurrency(meta.cgstAmount)}</td>
              </tr>
              <tr>
                <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">SGST (${meta.sgstPercent}%)</td>
                <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#111827;">${formatCurrency(meta.sgstAmount)}</td>
              </tr>
              <tr>
                <td style="padding:18px 16px;background:#1f5f54;color:#ffffff;font-weight:700;">Grand Total</td>
                <td align="right" style="padding:18px 16px;background:#1f5f54;color:#ffffff;font-weight:800;font-size:16px;">${formatCurrency(meta.grandTotal)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:18px 28px 24px;">
            <a href="${ctaHref}" style="background:#1f5f54;color:#ffffff;padding:16px 26px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">${ctaLabel}</a>
          </td>
        </tr>

        <tr>
          <td style="padding:18px;text-align:center;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">
            ${footerText}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
  });
};

const renderCancellationEmailHtml = ({
  recipientName,
  introText,
  heading,
  footerText,
  subjectLabel,
  booking,
  room,
}) => {
  const meta = getBookingMailMeta({ booking, room });
  const cancellation = booking.cancellation || {};
  const guestName =
    booking.contactName ||
    booking.userSnapshot?.name ||
    booking.user?.name ||
    "Guest";
  const guestPhone =
    booking.contactPhone ||
    booking.userSnapshot?.phone ||
    booking.user?.phone ||
    "-";
  const cancelledByLabel =
    cancellation.cancelledBy === "user"
      ? `${guestName} (${guestPhone})`
      : "Admin";

  return renderMailShell({
    preheader: subjectLabel,
    body: `
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:30px 10px;">
      <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#7f1d1d;padding:28px;">
            <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:600;">${heading}</h1>
            <p style="margin:8px 0 0;font-size:13px;color:#fecaca;">Booking ID: ${meta.bookingId}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 28px 10px;font-size:15px;color:#111827;">
            Hello <b>${recipientName}</b>, ${introText}
          </td>
        </tr>

        <tr>
          <td style="padding:0 28px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-size:14px;color:#111827;">
              <tr>
                <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">Room</td>
                <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#111827;">${meta.roomName}</td>
              </tr>
              <tr>
                <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">Stay</td>
                <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#111827;">${meta.checkIn} to ${meta.checkOut}</td>
              </tr>
              <tr>
                <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">Cancelled By</td>
                <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#111827;">${cancelledByLabel}</td>
              </tr>
              <tr>
                <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">Reason</td>
                <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#111827;">${cancellation.reason || "-"}</td>
              </tr>
              <tr>
                <td style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#374151;">Refund</td>
                <td align="right" style="padding:16px 16px;border-bottom:1px solid #e5e7eb;color:#111827;">${Number(cancellation.refundPercentage || 0)}% (${formatCurrency(cancellation.refundAmount || 0)})</td>
              </tr>
              <tr>
                <td style="padding:18px 16px;background:#7f1d1d;color:#ffffff;font-weight:700;">Booking Amount</td>
                <td align="right" style="padding:18px 16px;background:#7f1d1d;color:#ffffff;font-weight:800;font-size:16px;">${formatCurrency(meta.grandTotal)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:18px;text-align:center;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;">
            ${footerText}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
  });
};

export const sendBookingConfirmationMail = async ({ to, name, booking, room }) =>
  transporter.sendMail({
    from: `"Villa Gulposh" <${process.env.SMTP_USER}>`,
    to,
    subject: `Booking Confirmed - ${room?.name || "Villa Gulposh"}`,
    html: renderBookingEmailHtml({
      recipientName: name || "Guest",
      introText: "thank you for your reservation.",
      heading: "Booking Confirmed!",
      footerText: "We look forward to welcoming you. - Team Gulposh",
      ctaLabel: "View Full Booking Details ->",
      ctaHref: "https://booking.villagulposh.com",
      subjectLabel: "Booking confirmed",
      booking,
      room,
    }),
  });

export const sendAdminBookingNotificationMail = async ({
  to,
  booking,
  room,
  customerName,
}) =>
  transporter.sendMail({
    from: `"Villa Gulposh" <${process.env.SMTP_USER}>`,
    to,
    subject: `New Booking Received - ${room?.name || "Villa Gulposh"}`,
    html: renderBookingEmailHtml({
      recipientName: "Admin",
      introText: `a new booking has been confirmed for ${customerName || "a guest"}.`,
      heading: "New Booking Received",
      footerText: "This is an automated admin notification from Villa Gulposh.",
      ctaLabel: "Open Booking Portal ->",
      ctaHref: "https://admin.villagulposh.com/",
      subjectLabel: "New booking received",
      booking,
      room,
    }),
  });

export const sendBookingCancellationMail = async ({
  to,
  booking,
  room,
  recipientName,
  isAdmin = false,
}) =>
  transporter.sendMail({
    from: `"Villa Gulposh" <${process.env.SMTP_USER}>`,
    to,
    subject: isAdmin
      ? `Booking Cancelled - Admin Alert - ${room?.name || "Villa Gulposh"}`
      : `Booking Cancelled - ${room?.name || "Villa Gulposh"}`,
    html: renderCancellationEmailHtml({
      recipientName: recipientName || (isAdmin ? "Admin" : "Guest"),
      introText: isAdmin
        ? "a booking has been cancelled. Details are below."
        : "your booking has been cancelled. Details are below.",
      heading: isAdmin ? "Booking Cancelled - Admin Alert" : "Booking Cancelled",
      footerText: isAdmin
        ? "This is an automated admin notification from Villa Gulposh."
        : "If you need help, please contact Team Gulposh.",
      subjectLabel: "Booking cancelled",
      booking,
      room,
    }),
  });
