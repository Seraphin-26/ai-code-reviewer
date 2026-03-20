import type { Metadata } from "next";
import CodeReviewPanel from "@/components/ui/CodeReviewPanel";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return <CodeReviewPanel />;
}
