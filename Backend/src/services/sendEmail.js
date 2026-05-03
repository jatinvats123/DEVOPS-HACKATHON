import MailTranspoter from "../config/mail.js";

export const sendEmail = async ({ email, subject, message, html }) => {
    const mailOptions = {
        from: `noreply@hackathon.com`,
        to: email,
        subject: subject,
        text: message,
        html
    };
    await MailTranspoter.sendMail(mailOptions);
};
