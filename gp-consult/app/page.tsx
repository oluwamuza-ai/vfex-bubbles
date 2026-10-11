import Link from "next/link";
import { PageTitle } from "@/components/ui";

export default function Home() {
  return (
    <div>
      <PageTitle title="Dashboard" subtitle="Phase 1 — review your condition cards to get started." />
      <Link href="/cards" className="btn-primary">Review condition cards</Link>
    </div>
  );
}
