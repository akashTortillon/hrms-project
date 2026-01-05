import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"HRMS App" <${process.env.SMTP_EMAIL}>`,
    to,
    subject,
    html,
  });
};
