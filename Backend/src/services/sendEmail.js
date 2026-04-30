import MailTranspoter from "../config/mail.js";

export const sendEmail = async ({ email, subject, message }) => {
    const mailOptions = {
        from: `noreply@hackathon.com`,
        to: email,
        subject: subject,
        text: message,
    };
    await MailTranspoter.sendMail(mailOptions);
};
