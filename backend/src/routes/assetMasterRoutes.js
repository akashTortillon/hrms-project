import express from "express";
import {
    assetTypeController,
    assetCategoryController,
    assetStatusController,
    vendorController,
    serviceTypeController
} from "../controllers/assetMasterController.js";

const router = express.Router();

const registerRoutes = (path, controller) => {
    router.get(`/${path}`, controller.getAll);
    router.post(`/${path}`, controller.create);
    router.put(`/${path}/:id`, controller.update);
    router.delete(`/${path}/:id`, controller.delete);
};

registerRoutes("asset-types", assetTypeController);
registerRoutes("asset-categories", assetCategoryController);
registerRoutes("status-labels", assetStatusController);
registerRoutes("vendors", vendorController);
registerRoutes("service-types", serviceTypeController);

export default router;
