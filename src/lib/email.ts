import "server-only";
import {Resend} from "resend";

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email delivery is not configured");
  return new Resend(key);
}

export const emailFrom = process.env.EMAIL_FROM ?? "Esther Funds Foundation <notifications@estherfundsinc.org>";
