import axios from "axios";

const service = axios.create({
  timeout: 10 * 1000,
  withCredentials: true
});

export default service;
