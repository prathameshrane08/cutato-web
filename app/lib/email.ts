import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type BookingEmailInput = {
  to: string;
  customerName?: string;

  barberName: string;
  serviceName: string;

  date: string;
  time: string;

  totalEuro: number;
};

export async function sendBookingConfirmationEmail(
  input: BookingEmailInput
) {
  try {
    const {
      to,
      customerName,
      barberName,
      serviceName,
      date,
      time,
      totalEuro,
    } = input;

    const response = await resend.emails.send({
      from: "Cutato <onboarding@resend.dev>",
      to,

      subject: `Booking Confirmed • ${serviceName}`,

      html: `
        <div style="font-family:Inter,Arial;padding:40px;background:#f5f5f5;">
          <div style="max-width:620px;margin:auto;background:white;border-radius:28px;overflow:hidden;border:1px solid #eee;">

            <div style="background:#0a0a0a;padding:48px;text-align:center;">
              <div style="font-size:42px;font-weight:900;color:white;">
                CUTATO
              </div>

              <div style="margin-top:14px;color:#ffffff99;font-size:16px;">
                Your appointment is confirmed
              </div>
            </div>

            <div style="padding:40px;">
              <h1 style="font-size:34px;font-weight:900;margin:0;color:#111;">
                Booking Confirmed
              </h1>

              <p style="margin-top:16px;font-size:16px;line-height:1.7;color:#555;">
                Hi ${customerName || "there"},
                your appointment has been successfully booked.
              </p>

              <div style="margin-top:30px;background:#fafafa;border-radius:24px;padding:24px;border:1px solid #eee;">

                <div style="margin-bottom:14px;">
                  <div style="font-size:12px;font-weight:800;color:#ff355d;letter-spacing:0.15em;text-transform:uppercase;">
                    Barber
                  </div>

                  <div style="margin-top:6px;font-size:20px;font-weight:800;color:#111;">
                    ${barberName}
                  </div>
                </div>

                <div style="margin-bottom:14px;">
                  <div style="font-size:12px;font-weight:800;color:#ff355d;letter-spacing:0.15em;text-transform:uppercase;">
                    Service
                  </div>

                  <div style="margin-top:6px;font-size:20px;font-weight:800;color:#111;">
                    ${serviceName}
                  </div>
                </div>

                <div style="margin-bottom:14px;">
                  <div style="font-size:12px;font-weight:800;color:#ff355d;letter-spacing:0.15em;text-transform:uppercase;">
                    Appointment
                  </div>

                  <div style="margin-top:6px;font-size:20px;font-weight:800;color:#111;">
                    ${date} • ${time}
                  </div>
                </div>

                <div>
                  <div style="font-size:12px;font-weight:800;color:#ff355d;letter-spacing:0.15em;text-transform:uppercase;">
                    Total Paid
                  </div>

                  <div style="margin-top:6px;font-size:24px;font-weight:900;color:#111;">
                    €${Number(totalEuro).toFixed(2)}
                  </div>
                </div>
              </div>

              <div style="margin-top:32px;text-align:center;">
                <a
                  href="http://localhost:3000/bookings"
                  style="
                    display:inline-block;
                    padding:16px 28px;
                    background:#ff355d;
                    color:white;
                    text-decoration:none;
                    border-radius:999px;
                    font-weight:800;
                  "
                >
                  Open My Bookings
                </a>
              </div>
            </div>
          </div>
        </div>
      `,
    });

    console.log("BOOKING EMAIL SENT:", response);

    return response;
  } catch (err) {
    console.error("BOOKING EMAIL ERROR:", err);
  }
}