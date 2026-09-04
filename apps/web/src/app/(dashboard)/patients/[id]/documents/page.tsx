import { DocumentUploadForm } from "@/components/documents/document-upload-form";

export default function PatientDocumentsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text">Evrak Yükleme</h2>
        <p className="text-muted">Evraklar MinIO'ya gitmeden önce AES-256-GCM ile şifrelenir.</p>
      </div>
      <DocumentUploadForm />
    </div>
  );
}
