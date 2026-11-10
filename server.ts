import express from "express";
import { registerApplication } from "./server/_core/app";

const app = registerApplication(express());

export default app;
