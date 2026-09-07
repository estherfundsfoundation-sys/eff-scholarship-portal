import {z} from "zod";

export const askEffMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(5_000),
});

export const askEffRequestSchema = z.object({
  requestId: z.string().uuid(),
  conversationId: z.string().uuid(),
  adultConfirmed: z.literal(true),
  pilotCode: z.string().trim().max(128).optional().default(""),
  messages: z.array(askEffMessageSchema).min(1).max(40),
});

export const feedbackRequestSchema = z.object({
  requestId: z.string().uuid(),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  answer: z.string().trim().min(1).max(8_000),
  lastQuestion: z.string().trim().max(5_000).optional(),
  consentToShare: z.literal(true),
});

export type AskEffMessage = z.infer<typeof askEffMessageSchema>;

export type EvidenceSource = {
  id: string;
  title: string;
  url: string;
  sourceType: "eff_program" | "eff_resource" | "scholarship_directory" | "external_official";
  accessedAt: string;
  applicableCycle?: string;
  jurisdiction?: string;
};

