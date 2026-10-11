import "server-only";
import type { ConditionCard } from "@/lib/schemas/card";
import { CaseFile } from "@/lib/schemas/case";
import { ExamFindingsOutput, InvestigationOutput, type ChatTurn } from "@/lib/schemas/consult";
import { anthropic, GRADER_MODEL, isMock, PATIENT_MODEL, structured, type Anthropic } from "./client";
import { mockCase, mockExam, mockGrade, mockInvestigations, mockPatientReply } from "./mock";
import { GradeResult } from "@/lib/schemas/grade";
import { graderSystemPrompt, graderUserPrompt } from "@/lib/prompts/grader";
import { patientSystemPrompt } from "@/lib/prompts/patient";
import { caseGenSystemPrompt, caseGenUserPrompt, examSystemPrompt, investigationSystemPrompt } from "@/lib/prompts/clinical";

export async function generateCase(card: ConditionCard, tier: number, recent: string[]): Promise<{ data: CaseFile; model: string }> {
  if (isMock()) return { data: mockCase(card, tier, Date.now() % 997), model: "mock" };
  const data = await structured({
    model: GRADER_MODEL,
    system: caseGenSystemPrompt(),
    user: caseGenUserPrompt(card, tier, recent),
    schema: CaseFile,
    effort: "medium",
  });
  return { data, model: GRADER_MODEL };
}

/** Streams the patient's reply as text chunks. The last turn in `transcript` is the doctor's. */
export async function* patientReply(c: CaseFile, tier: number, transcript: ChatTurn[]): AsyncGenerator<string> {
  if (isMock()) {
    const text = mockPatientReply(c, transcript);
    for (const word of text.split(/(?<=\s)/)) {
      yield word;
      await new Promise((r) => setTimeout(r, 15));
    }
    return;
  }
  const messages: Anthropic.MessageParam[] = transcript.map((t) => ({
    role: t.role === "doctor" ? "user" : "assistant",
    content: t.content,
  }));
  const stream = anthropic().messages.stream({
    model: PATIENT_MODEL,
    max_tokens: 2048,
    system: [{ type: "text", text: patientSystemPrompt(c, tier), cache_control: { type: "ephemeral" } }],
    messages,
    output_config: { effort: "low" },
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") yield "Sorry, doctor, could you ask me that another way?";
}

export async function examine(c: CaseFile, requests: string[]) {
  if (isMock()) return mockExam(c, requests);
  const out = await structured({
    model: PATIENT_MODEL,
    system: examSystemPrompt(c),
    user: `Examinations requested:\n${requests.map((r) => `- ${r}`).join("\n")}`,
    schema: ExamFindingsOutput,
    effort: "low",
    maxTokens: 4000,
  });
  return out.findings;
}

export async function runInvestigations(c: CaseFile, tests: string[]) {
  if (isMock()) return mockInvestigations(c, tests);
  const out = await structured({
    model: PATIENT_MODEL,
    system: investigationSystemPrompt(c),
    user: `Tests ordered:\n${tests.map((t) => `- ${t}`).join("\n")}`,
    schema: InvestigationOutput,
    effort: "low",
    maxTokens: 6000,
  });
  return out.results;
}

export async function gradeWithLlm(input: Parameters<typeof graderUserPrompt>[0]): Promise<{ result: GradeResult; model: string }> {
  if (isMock()) {
    return {
      result: mockGrade({ ...input, localPractice: input.localPractice.enabled }),
      model: "mock",
    };
  }
  const result = await structured({
    model: GRADER_MODEL,
    system: graderSystemPrompt(),
    user: graderUserPrompt(input),
    schema: GradeResult,
    effort: "high",
    maxTokens: 32000,
  });
  return { result, model: GRADER_MODEL };
}
