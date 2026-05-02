import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = ["MONGO_URL", "JWT_SECRET", "MISTRAL_API_KEY"];

requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
        throw new Error(`Environment variable ${envVar} is missing!`);
    }
});

export const config = {
    PORT: process.env.PORT || 3000,
    MONGO_URL: process.env.MONGO_URL,
    NODE_ENV: process.env.NODE_ENV || "development",
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRY: process.env.JWT_EXPIRY || "1d",
    FRONTEND_URL: process.env.FRONTEND_URL,
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
}