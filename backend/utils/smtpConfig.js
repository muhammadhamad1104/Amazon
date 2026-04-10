const TRUE_VALUES = new Set(['true', '1', 'yes']);
const STARTTLS_VALUES = new Set(['tls', 'starttls']);

export const getSmtpTransportConfig = () => {
  const mode = String(process.env.SMTP_SECURE || 'false').trim().toLowerCase();
  const secure = TRUE_VALUES.has(mode);
  const requireTLS = STARTTLS_VALUES.has(mode);

  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure,
    requireTLS,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };
};
