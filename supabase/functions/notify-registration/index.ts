import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    if (record.payment_status !== "paid") {
      return new Response("Not a paid registration, skipping.", { status: 200 });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const emailBody = `
      <h2>New Paid Registration 🎉</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Student Name</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${record.student_name}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Student Age</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${record.student_age}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>School</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${record.current_school}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Parent Name</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${record.parent_name}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Parent Email</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${record.parent_email}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>WhatsApp</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${record.parent_whatsapp}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Contact Method</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${record.preferred_contact_method}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount Paid</strong></td><td style="padding: 8px; border: 1px solid #ddd;">\$${record.total_usd}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Payment Reference</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${record.paystack_reference}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Has Siblings</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${record.has_siblings ? "Yes" : "No"}</td></tr>
        ${record.sibling_details ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Sibling Details</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${record.sibling_details}</td></tr>` : ""}
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Registered At</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${new Date(record.created_at).toLocaleString()}</td></tr>
      </table>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Learning Sprouts Lagos <notifications@learningsprouts.school>",
        to: ["ask@learningsprouts.school"],
        subject: `New Registration: ${record.student_name} — \$${record.total_usd}`,
        html: emailBody,
      }),
    });

    const data = await res.json();
    console.log("Resend response:", JSON.stringify(data));

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
