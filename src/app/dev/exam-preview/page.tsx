import { notFound } from "next/navigation";
import { ExamPreview } from "@/features/simulator/exam-preview";

export default async function ExamPreviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  return <ExamPreview phase={typeof params.phase === "string" ? params.phase : "idle"} failure={typeof params.failure === "string" ? params.failure : ""} calculatorMock={params.desmos === "mock"} />;
}
