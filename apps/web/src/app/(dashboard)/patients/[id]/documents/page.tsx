import { Suspense } from "react";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";

export default function PatientDocumentsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text">Upload Documents</h2>
        <p className="text-muted">Documents are encrypted with AES-256-GCM before they reach MinIO.</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-surface" />}>
        <DocumentUploadForm />
      </Suspense>
    </div>
  );
}
