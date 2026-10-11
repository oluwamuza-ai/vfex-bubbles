import { getSettings } from "@/lib/repo/settings";
import { GRADER_MODEL, PATIENT_MODEL, isMock } from "@/lib/llm/client";
import { PageTitle } from "@/components/ui";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div>
      <PageTitle title="Settings" />
      <SettingsForm initial={getSettings()} models={{ patient: PATIENT_MODEL, grader: GRADER_MODEL, mock: isMock(), key: !!process.env.ANTHROPIC_API_KEY }} />
    </div>
  );
}
