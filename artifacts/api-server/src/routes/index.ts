import { Router, type IRouter } from "express";
import healthRouter from "./health";
import inventoryRouter from "./inventory";
import releaseRequestsRouter from "./release-requests";

const router: IRouter = Router();

router.use(healthRouter);
router.use(inventoryRouter);
router.use(releaseRequestsRouter);

export default router;
