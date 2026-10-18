import { DEMO_SPEC_SYSTEM_INSTRUCTION, buildDemoSpecPrompt } from "./prompts";
import { demoSpecResponseSchema, demoSpecSchema, type DemoSpecOutput } from "./schemas";
import type { GeminiUsage, StructuredGenerator } from "./types";

export interface DemoSpecInput {
  category: string;
  title: string;
  summary: string;
  requiredFeatures: string[];
  suggestedFeatures: string[];
  technologyPreferences: string[];
  templateName: string;
  styleNotes?: string;
}

export async function generateDemoSpecification(
  input: DemoSpecInput,
  generator: StructuredGenerator,
): Promise<{ spec: DemoSpecOutput; usage: GeminiUsage }> {
  const { data, usage } = await generator.generateStructured({
    operation: "demo_specification",
    systemInstruction: DEMO_SPEC_SYSTEM_INSTRUCTION,
    prompt: buildDemoSpecPrompt(input),
    responseSchema: demoSpecResponseSchema,
    validate: (value) => demoSpecSchema.parse(value),
    maxOutputTokens: 3072,
    temperature: 0.6,
  });

  return { spec: data, usage };
}
