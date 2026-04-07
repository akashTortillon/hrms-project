import api from "./apiClient";

export const registerUser = async (data) => {
  const res = await api.post("/auth/register", data);
  return res.data;
};

export const loginUser = async (data) => {
  const res = await api.post("/auth/login", data, {
    withCredentials: true, // Important for receiving httpOnly cookies
  });
  return res.data;
};

export const logoutUser = async () => {
  try {
    await api.post("/auth/logout", {}, {
      withCredentials: true, // Important for sending httpOnly cookies
    });
  } catch (error) {
    console.error("Logout API call failed", error);
  }
};

export const changePassword = async (oldPassword, newPassword) => {
  const res = await api.post("/auth/change-password", { oldPassword, newPassword });
  return res.data;
};
