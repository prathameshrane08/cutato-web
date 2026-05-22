import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://cutato-web.vercel.app";

type BookingEmailInput = {
  to: string;
  customerName?: string;
  barberName: string;
  serviceName: string;
  date: string;
  time: string;
  totalEuro: number;
};

type BarberBookingEmailInput = {
  to: string;
  barberName: string;
  customerEmail: string;
  serviceName: string;
  date: string;
  time: string;
  totalEuro: number;
  paymentMethod?: string;
  aiStyle?: string | null;
  haircutBrief?: string | null;
};

function money(v: number) {
  return `€${Number(v || 0).toFixed(2)}`;
}

function row(label: string, value: string, big = false) {
  return `
    <div style="margin-bottom:16px;">
      <div style="font-size:12px;font-weight:800;color:#ff355d;letter-spacing:0.15em;text-transform:uppercase;">
        ${label}
      </div>
      <div style="margin-top:6px;font-size:${big ? "24px" : "20px"};font-weight:900;color:#111;">
        ${value}
      </div>
    </div>
  `;
}

export async function sendBookingConfirmationEmail(input: BookingEmailInput) {
  try {
    const { to, customerName, barberName, serviceName, date, time, totalEuro } =
      input;

    return await resend.emails.send({
      from: "Cutato <onboarding@resend.dev>",
      to,
      subject: `Booking Confirmed • ${serviceName}`,
      html: `
        <div style="font-family:Inter,Arial;padding:40px;background:#f5f5f5;">
          <div style="max-width:620px;margin:auto;background:white;border-radius:28px;overflow:hidden;border:1px solid #eee;">
            <div style="background:#0a0a0a;padding:48px;text-align:center;">
              <div style="font-size:42px;font-weight:900;color:white;">CUTATO</div>
              <div style="margin-top:14px;color:#ffffff99;font-size:16px;">Your appointment is confirmed</div>
            </div>

            <div style="padding:40px;">
              <h1 style="font-size:34px;font-weight:900;margin:0;color:#111;">Booking Confirmed</h1>

              <p style="margin-top:16px;font-size:16px;line-height:1.7;color:#555;">
                Hi ${customerName || "there"}, your appointment has been successfully booked.
              </p>

              <div style="margin-top:30px;background:#fafafa;border-radius:24px;padding:24px;border:1px solid #eee;">
                ${row("Barber", barberName)}
                ${row("Service", serviceName)}
                ${row("Appointment", `${date} • ${time}`)}
                ${row("Total Paid", money(totalEuro), true)}
              </div>

              <div style="margin-top:32px;text-align:center;">
                <a href="${APP_URL}/bookings"
                  style="display:inline-block;padding:16px 28px;background:#ff355d;color:white;text-decoration:none;border-radius:999px;font-weight:800;">
                  Open My Bookings
                </a>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("BOOKING EMAIL ERROR:", err);
  }
}

export async function sendBarberNewBookingEmail(input: BarberBookingEmailInput) {
  try {
    const {
      to,
      barberName,
      customerEmail,
      serviceName,
      date,
      time,
      totalEuro,
      paymentMethod,
      aiStyle,
      haircutBrief,
    } = input;

    return await resend.emails.send({
      from: "Cutato <onboarding@resend.dev>",
      to,
      subject: `New Booking • ${serviceName}`,
      html: `
        <div style="font-family:Inter,Arial;padding:40px;background:#f5f5f5;">
          <div style="max-width:680px;margin:auto;background:white;border-radius:28px;overflow:hidden;border:1px solid #eee;">
            <div style="background:#0a0a0a;padding:44px;text-align:center;">
              <div style="font-size:40px;font-weight:900;color:white;">CUTATO</div>
              <div style="margin-top:14px;color:#ffffff99;font-size:16px;">New appointment assigned to you</div>
            </div>

            <div style="padding:40px;">
              <h1 style="font-size:32px;font-weight:900;margin:0;color:#111;">New Booking</h1>

              <p style="margin-top:16px;font-size:16px;line-height:1.7;color:#555;">
                Hi ${barberName}, a customer has booked an appointment with you.
              </p>

              <div style="margin-top:28px;background:#fafafa;border-radius:24px;padding:24px;border:1px solid #eee;">
                ${row("Customer", customerEmail)}
                ${row("Service", serviceName)}
                ${row("Appointment", `${date} • ${time}`)}
                ${row("Payment", paymentMethod === "online" ? "Paid online" : "Pay at salon")}
                ${row("Total", money(totalEuro), true)}
              </div>

              ${
                aiStyle || haircutBrief
                  ? `
                  <div style="margin-top:28px;background:#fff0f3;border-radius:24px;padding:24px;border:1px solid rgba(255,53,93,0.20);">
                    <div style="font-size:12px;font-weight:900;color:#ff355d;letter-spacing:0.15em;text-transform:uppercase;">
                      AI Haircut Brief
                    </div>
                    ${
                      aiStyle
                        ? `<div style="margin-top:10px;font-size:22px;font-weight:900;color:#111;">${aiStyle}</div>`
                        : ""
                    }
                    ${
                      haircutBrief
                        ? `<p style="margin-top:12px;font-size:15px;line-height:1.7;color:#555;">${haircutBrief}</p>`
                        : ""
                    }
                  </div>`
                  : ""
              }

              <div style="margin-top:32px;text-align:center;">
                <a href="${APP_URL}/portal/barber/bookings"
                  style="display:inline-block;padding:16px 28px;background:#ff355d;color:white;text-decoration:none;border-radius:999px;font-weight:800;">
                  Open Barber Bookings
                </a>
              </div>
            </div>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("BARBER EMAIL ERROR:", err);
  }
}

type BarberApplicationInput = {
  name: string;
  email: string;
  phone?: string;
  city?: string;
  experience?: string;
  instagram?: string;
};

export async function sendBarberApplicationEmail(
  input: BarberApplicationInput
) {
  try {
    return await resend.emails.send({
      from: "Cutato <onboarding@resend.dev>",
      to: process.env.CUTATO_ADMIN_EMAIL || "your@email.com",

      subject: `New Barber Application • ${input.name}`,

      html: `
        <div style="font-family:Inter,Arial;padding:40px;background:#f5f5f5;">
          <div style="max-width:650px;margin:auto;background:white;border-radius:28px;border:1px solid #eee;overflow:hidden;">

            <div style="background:#0a0a0a;padding:42px;text-align:center;">
              <div style="font-size:38px;font-weight:900;color:white;">
                CUTATO
              </div>

              <div style="margin-top:10px;color:#ffffff99;">
                New barber application
              </div>
            </div>

            <div style="padding:40px;">
              <h1 style="font-size:32px;font-weight:900;color:#111;margin:0;">
                Barber Application
              </h1>

              <div style="margin-top:28px;background:#fafafa;padding:24px;border-radius:24px;border:1px solid #eee;">

                ${row("Name", input.name)}
                ${row("Email", input.email)}
                ${row("Phone", input.phone || "—")}
                ${row("City", input.city || "—")}
                ${row("Experience", input.experience || "—")}
                ${row("Instagram", input.instagram || "—")}

              </div>
            </div>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("BARBER APPLICATION EMAIL ERROR:", err);
  }
}

type SalonApplicationInput = {
  salonName: string;
  ownerName: string;
  email: string;
  phone?: string;
  city?: string;
  address?: string;
};

export async function sendSalonApplicationEmail(
  input: SalonApplicationInput
) {
  try {
    return await resend.emails.send({
      from: "Cutato <onboarding@resend.dev>",
      to: process.env.CUTATO_ADMIN_EMAIL || "your@email.com",

      subject: `New Salon Application • ${input.salonName}`,

      html: `
        <div style="font-family:Inter,Arial;padding:40px;background:#f5f5f5;">
          <div style="max-width:650px;margin:auto;background:white;border-radius:28px;border:1px solid #eee;overflow:hidden;">

            <div style="background:#0a0a0a;padding:42px;text-align:center;">
              <div style="font-size:38px;font-weight:900;color:white;">
                CUTATO
              </div>

              <div style="margin-top:10px;color:#ffffff99;">
                New salon application
              </div>
            </div>

            <div style="padding:40px;">
              <h1 style="font-size:32px;font-weight:900;color:#111;margin:0;">
                Salon Application
              </h1>

              <div style="margin-top:28px;background:#fafafa;padding:24px;border-radius:24px;border:1px solid #eee;">

                ${row("Salon", input.salonName)}
                ${row("Owner", input.ownerName)}
                ${row("Email", input.email)}
                ${row("Phone", input.phone || "—")}
                ${row("City", input.city || "—")}
                ${row("Address", input.address || "—")}

              </div>
            </div>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("SALON APPLICATION EMAIL ERROR:", err);
  }
}