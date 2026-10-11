import { NextResponse } from "next/server";
import { gradeConsultation } from "@/lib/grading";
import { handleError } from "@/lib/api";

export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const grade = await gradeConsultation((await params).id);
    return NextResponse.json(grade);
  } catch (e) {
    return handleError(e);
  }
}
