import EmployeeTraining from "../models/trainingModel.js";

// Get training records for an employee
export const getEmployeeTrainings = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const trainings = await EmployeeTraining.find({ employee: employeeId }).sort({ date: -1 });
        res.json(trainings);
    } catch (error) {
        // console.error("Get trainings error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Add training record
export const addEmployeeTraining = async (req, res) => {
    try {
        const { employeeId, title, date, score, status } = req.body;

        const training = await EmployeeTraining.create({
            employee: employeeId,
            title,
            date,
            score,
            status
        });

        res.status(201).json(training);
    } catch (error) {
        // console.error("Add training error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
