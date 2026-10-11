import Link from "next/link";
import { CardEditor } from "@/components/CardEditor";
import { PageTitle } from "@/components/ui";

export default function NewCardPage() {
  return (
    <div>
      <Link href="/cards" className="text-sm text-muted">← All cards</Link>
      <PageTitle title="New condition card" subtitle="New cards start unverified." />
      <CardEditor
        isNew
        card={{
          id: "",
          name: "",
          specialty: "medicine",
          tags: [],
          guidelineDate: "",
          verified: false,
          body: { presentations: [], redFlags: [], keyHistory: [], examination: [], investigations: [], firstLine: [], secondLine: [], referral: [], safetyNetting: [], thresholds: [], sources: [] },
        }}
      />
    </div>
  );
}
