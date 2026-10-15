// instrumentation.ts
import { forceIST } from "@/lib/forceIST";

export function register() {
  process.env.TZ = "Asia/Kolkata";
  forceIST();
}