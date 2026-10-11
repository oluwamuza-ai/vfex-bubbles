import Link from "next/link";
import { listClinics, CLINIC_SIZE, CLINIC_BONUS_XP } from "@/lib/repo/clinic";
import { getSettings } from "@/lib/repo/settings";
import { Empty, PageTitle } from "@/components/ui";
import { StartButton } from "@/components/StartButton";

export const dynamic = "force-dynamic";

export default function ClinicIndex() {
  const clinics = listClinics();
  return (
    <div className="space-y-4">
      <PageTitle title="Clinic session" subtitle={`${CLINIC_SIZE} mixed patients across specialties, then a session summary. +${CLINIC_BONUS_XP} XP for finishing.`} />
      <div className="card space-y-3">
        <p className="text-sm text-muted">Patients are chosen adaptively, one from each specialty starting with your weakest. All six are generated up front, which can take a minute.</p>
        <StartButton endpoint="/api/clinic" to="/clinic" body={{ timed: getSettings().gpClock }} label="Open a new clinic" busyLabel="Filling the waiting room…" className="btn-primary w-full py-3 text-base" />
      </div>
      <h2 className="font-bold">Previous clinics</h2>
      {clinics.length === 0 ? (
        <Empty>No clinics yet.</Empty>
      ) : (
        <ul className="space-y-2">
          {clinics.map((c) => (
            <li key={c.id}>
              <Link href={`/clinic/${c.id}`} className="card flex items-center gap-3 py-3 hover:border-accent">
                <span className="flex-1 text-sm">{new Date(c.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                <span className={`chip ${c.completedAt ? "!text-ok" : ""}`}>{c.completedAt ? "Completed" : "In progress"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
