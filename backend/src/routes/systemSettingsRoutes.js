import express from 'express';
import {
    getSettings,
    updateGlobalSettings,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    toggleNotification
} from '../controllers/systemSettingsController.js';

const router = express.Router();

router.get('/', getSettings);
router.put('/global', updateGlobalSettings);

// Holidays
router.post('/holidays', addHoliday);
router.put('/holidays/:id', updateHoliday);
router.delete('/holidays/:id', deleteHoliday);

// Notifications
router.put('/notifications/:id/toggle', toggleNotification);

export default router;
