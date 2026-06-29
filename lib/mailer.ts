import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mvira.uz";
const FROM = process.env.SMTP_FROM || `mvira <noreply@mvira.uz>`;

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  locale = "ru"
) {
  const resetUrl = `${SITE_URL}/${locale}/auth/reset-password?token=${token}`;

  const subjects: Record<string, string> = {
    ru: "Сброс пароля — mvira",
    uz: "Parolni tiklash — mvira",
    en: "Password reset — mvira",
  };

  const bodies: Record<string, string> = {
    ru: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#f0ebe3">
        <div style="background:#2d1b4e;padding:32px;border-radius:2px;text-align:center;margin-bottom:32px">
          <span style="font-family:Georgia,serif;font-size:28px;font-weight:300;color:#f0ebe3;letter-spacing:4px">mv<span style="color:#c9847a">ira</span></span>
        </div>
        <h1 style="font-family:Georgia,serif;font-weight:300;font-size:28px;color:#2d1b4e;margin:0 0 16px">Сброс пароля</h1>
        <p style="color:rgba(45,27,78,0.65);font-size:15px;line-height:1.7;margin:0 0 32px">
          Мы получили запрос на сброс пароля для вашего аккаунта. Нажмите кнопку ниже чтобы создать новый пароль.
        </p>
        <a href="${resetUrl}" style="display:block;background:#2d1b4e;color:#f0ebe3;text-decoration:none;text-align:center;padding:14px 32px;border-radius:2px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:24px">
          Сбросить пароль
        </a>
        <p style="color:rgba(45,27,78,0.4);font-size:12px;line-height:1.6;margin:0">
          Ссылка действительна 1 час. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.
        </p>
        <hr style="border:none;border-top:1px solid rgba(45,27,78,0.1);margin:24px 0">
        <p style="color:rgba(45,27,78,0.3);font-size:11px;text-align:center;margin:0">mvira.uz · AI Marketing Platform</p>
      </div>
    `,
    uz: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#f0ebe3">
        <div style="background:#2d1b4e;padding:32px;border-radius:2px;text-align:center;margin-bottom:32px">
          <span style="font-family:Georgia,serif;font-size:28px;font-weight:300;color:#f0ebe3;letter-spacing:4px">mv<span style="color:#c9847a">ira</span></span>
        </div>
        <h1 style="font-family:Georgia,serif;font-weight:300;font-size:28px;color:#2d1b4e;margin:0 0 16px">Parolni tiklash</h1>
        <p style="color:rgba(45,27,78,0.65);font-size:15px;line-height:1.7;margin:0 0 32px">
          Akkauntingiz uchun parolni tiklash so'rovi qabul qilindi. Yangi parol yaratish uchun quyidagi tugmani bosing.
        </p>
        <a href="${resetUrl}" style="display:block;background:#2d1b4e;color:#f0ebe3;text-decoration:none;text-align:center;padding:14px 32px;border-radius:2px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:24px">
          Parolni tiklash
        </a>
        <p style="color:rgba(45,27,78,0.4);font-size:12px;line-height:1.6;margin:0">
          Havola 1 soat davomida amal qiladi. Agar siz parolni tiklashni so'ramagan bo'lsangiz, ushbu xatni e'tiborsiz qoldiring.
        </p>
      </div>
    `,
    en: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#f0ebe3">
        <div style="background:#2d1b4e;padding:32px;border-radius:2px;text-align:center;margin-bottom:32px">
          <span style="font-family:Georgia,serif;font-size:28px;font-weight:300;color:#f0ebe3;letter-spacing:4px">mv<span style="color:#c9847a">ira</span></span>
        </div>
        <h1 style="font-family:Georgia,serif;font-weight:300;font-size:28px;color:#2d1b4e;margin:0 0 16px">Password Reset</h1>
        <p style="color:rgba(45,27,78,0.65);font-size:15px;line-height:1.7;margin:0 0 32px">
          We received a request to reset your account password. Click the button below to create a new password.
        </p>
        <a href="${resetUrl}" style="display:block;background:#2d1b4e;color:#f0ebe3;text-decoration:none;text-align:center;padding:14px 32px;border-radius:2px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:24px">
          Reset Password
        </a>
        <p style="color:rgba(45,27,78,0.4);font-size:12px;line-height:1.6;margin:0">
          This link is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: subjects[locale] ?? subjects.ru,
    html: bodies[locale] ?? bodies.ru,
  });
}
