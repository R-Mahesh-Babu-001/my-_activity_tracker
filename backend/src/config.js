import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 8787),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "*",
  defaultTabName: process.env.GOOGLE_SHEET_TAB ?? "DailyTracker"
};
