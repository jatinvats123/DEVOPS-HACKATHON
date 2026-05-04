import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import morgan from 'morgan';
import compression from 'compression';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { config } from "./config/config.js";


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
});

const blockUnwantedRequests = (req, res, next,) => {
    const unwantedPaths = ['.env', '.git', 'wp-admin', 'phpmyadmin'];
    if (unwantedPaths.some((path) => req.url.includes(path))) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    next();
};



const Middleware = (app) => {
    app.use(cors({
        origin: config.CORS_ORIGIN,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    app.use(helmet());
    app.use(limiter);
    app.use(blockUnwantedRequests);
    app.use(express.json({ limit: '16kb' }));
    app.use(express.urlencoded({ extended: true, limit: '16kb' }));
    app.use(cookieParser());
    app.use(morgan("dev"));
    app.use(compression());
    console.log('CORS_ORIGIN being used:', config.CORS_ORIGIN);
    app.use(express.static("public"));
};

export default Middleware;