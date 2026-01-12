import express from "express";
import {
    employeeTypeController,
    leaveTypeController,
    documentTypeController,
    nationalityController
} from "../controllers/hrMasterController.js";

const router = express.Router();

// Helper to register routes
const registerRoutes = (path, controller) => {
    router.get(`/${path}`, controller.getAll);
    router.post(`/${path}`, controller.add);
    router.put(`/${path}/:id`, controller.update);
    router.delete(`/${path}/:id`, controller.delete);
};

registerRoutes("employee-types", employeeTypeController);
registerRoutes("leave-types", leaveTypeController);
registerRoutes("document-types", documentTypeController);
registerRoutes("nationalities", nationalityController);

export default router;
