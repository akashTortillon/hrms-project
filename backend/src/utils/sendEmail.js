import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
  try {
    // Check if email is configured
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_APP_PASSWORD) {
      // console.log("❌ Email configuration missing in environment variables");
      return { success: false, message: "Email not configured" };
    }

    // Check if recipients are provided
    const recipients = options.to || options.email;
    if (!recipients) {
      // console.error("❌ No recipients defined");
      return { success: false, message: "No recipients defined" };
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      connectionTimeout: 5000, // 5 seconds
      greetingTimeout: 5000,
      socketTimeout: 10000, // 10 seconds
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_APP_PASSWORD,
      },
    });

    // Email options
    const mailOptions = {
      from: `"${process.env.COMPANY_NAME || "HRMS Pro"}" <${process.env.SMTP_EMAIL}>`,
      to: recipients,
      cc: options.cc || undefined,
      subject: options.subject,
      html: options.html,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    // console.log("✅ Email sent successfully:", info.messageId);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    // console.error("❌ Email sending failed:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
};