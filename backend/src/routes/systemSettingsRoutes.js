import express from 'express';
import {
    getSettings,
    updateGlobalSettings,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    addAllowanceType,
    updateAllowanceType,
    deleteAllowanceType,
    toggleNotification
} from '../controllers/systemSettingsController.js';
import { protect, hasPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes here require authentication and MANAGE_SETTINGS permission
router.use(protect);
router.use(hasPermission("MANAGE_SETTINGS"));

router.get('/', getSettings);
router.put('/global', updateGlobalSettings);

// Holidays
router.post('/holidays', addHoliday);
router.put('/holidays/:id', updateHoliday);
router.delete('/holidays/:id', deleteHoliday);

// Allowance Types
router.post('/allowance-types', addAllowanceType);
router.put('/allowance-types/:id', updateAllowanceType);
router.delete('/allowance-types/:id', deleteAllowanceType);

// Notifications
router.put('/notifications/:id/toggle', toggleNotification);

export default router;
