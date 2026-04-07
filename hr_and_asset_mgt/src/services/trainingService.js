import api from "../api/apiClient";

const TRAINING_API = "/trainings";

export const getEmployeeTrainings = async (employeeId) => {
    const res = await api.get(`${TRAINING_API}/${employeeId}`);
    return res.data;
};

export const addEmployeeTraining = async (data) => {
    const res = await api.post(TRAINING_API, data);
    return res.data;
};
