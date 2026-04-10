import express from 'express';
import nodemailer from 'nodemailer';
import { getSmtpTransportConfig } from '../utils/smtpConfig.js';

const router = express.Router();

const hasMailConfig = () => (
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

router.post('/', async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    const email = req.body?.email?.trim().toLowerCase();
    const subject = req.body?.subject?.trim();
    const message = req.body?.message?.trim();

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!hasMailConfig()) {
      return res.status(500).json({
        message: 'Email service is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.'
      });
    }

    const receiverEmail = process.env.CONTACT_RECEIVER_EMAIL || 'irfwardrobe@gmail.com';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    const transporter = nodemailer.createTransport(getSmtpTransportConfig());

    await transporter.sendMail({
      from: `IRFWARDROBE Contact <${fromEmail}>`,
      to: receiverEmail,
      replyTo: email,
      subject: `[Contact Form] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
      html: `
        <h2>New Contact Form Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br/>')}</p>
      `
    });

    res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to send message' });
  }
});

export default router;
