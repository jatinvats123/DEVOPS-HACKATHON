import nodemailer from 'nodemailer'
import { config } from './config.js';
const MailTranspoter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
    },
});
export default MailTranspoter;