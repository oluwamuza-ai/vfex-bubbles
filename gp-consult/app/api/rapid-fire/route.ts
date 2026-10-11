import { NextResponse } from "next/server";
import { rapidFireItems } from "@/lib/repo/rapidfire";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(rapidFireItems(40));
}
