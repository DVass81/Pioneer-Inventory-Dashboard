import { Router, type IRouter } from "express";
import healthRouter from "./health";
import inventoryRouter from "./inventory";
import releaseRequestsRouter from "./release-requests";
import emailRouter from "./email";

const router: IRouter = Router();

router.use(healthRouter);
router.use(inventoryRouter);
router.use(releaseRequestsRouter);
router.use(emailRouter);

export default router;
