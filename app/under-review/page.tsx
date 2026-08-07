import type { Metadata } from "next";
import { basePath } from "@/lib/paths";

export const metadata: Metadata = {
  title: "Workspace under review",
  robots: { index: false, follow: false },
};

export default function UnderReviewPage() {
  return <main className="review-page">
    <div className="review-orbit" aria-hidden="true"><span>S</span></div>
    <span className="eyebrow">Private workspace</span>
    <h1>This workspace is under review.</h1>
    <p>Publishing access is temporarily unavailable. No action is required here; access will return after the review is complete.</p>
    <a className="button button-secondary" href={`${basePath}/`}>Return to LabbyS</a>
  </main>;
}
