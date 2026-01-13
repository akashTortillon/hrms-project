import express from 'express';
import {
    getSettings,
    updateGlobalSettings,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    toggleNotification
} from '../controllers/systemSettingsController.js';
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes here require authentication
router.use(protect);

router.get('/', getSettings);
router.put('/global', updateGlobalSettings);

// Holidays
router.post('/holidays', addHoliday);
router.put('/holidays/:id', updateHoliday);
router.delete('/holidays/:id', deleteHoliday);

// Notifications
router.put('/notifications/:id/toggle', toggleNotification);

export default router;
