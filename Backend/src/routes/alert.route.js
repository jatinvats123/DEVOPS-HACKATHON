import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getAlerts,
  createAlert,
  toggleAlertStatus,
  deleteAlert,
  getAlertHistory,
} from "../controllers/alert.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/")
  .get(getAlerts)
  .post(createAlert);

router.route("/history")
  .get(getAlertHistory);

router.route("/:id")
  .patch(toggleAlertStatus)
  .delete(deleteAlert);

export default router;
