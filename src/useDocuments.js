import { useTable } from "./useTable";
import { supabase } from "./supabaseClient";

const BUCKET = "documents";
const MAX_BYTES = 15 * 1024 * 1024; // Storage isn't as tight as the old artifact's 5MB key limit

export function useDocuments(companyId) {
  const { rows: documents, loading, error, insert, update, remove: removeRow, refresh } = useTable("documents", "created_at", false, companyId);

  // Uploads the file to Storage, then inserts the metadata row. Returns true/false.
  // meta.reviewStatus is optional — pass "pending" when a driver is uploading their
  // own compliance doc, so Fleet can confirm or reject it before it counts as valid.
  async function uploadDocument(meta, file) {
    if (!file) return false;
    if (file.size > MAX_BYTES) return false;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${meta.category}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) return false;

    const { error: insertError } = await insert({
      category: meta.category,
      linked_to: meta.linkedTo || null,
      doc_type: meta.docType,
      issue_date: meta.issueDate || null,
      expiry_date: meta.expiryDate || null,
      notes: meta.notes || null,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      created_by: meta.createdBy || null,
      review_status: meta.reviewStatus || null,
    });
    if (insertError) {
      // Clean up the orphaned file if the metadata insert failed
      await supabase.storage.from(BUCKET).remove([path]);
      return false;
    }
    return true;
  }

  // Opens a short-lived signed URL to view/download the file (bucket is private).
  async function viewDocument(doc) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 60);
    if (error || !data) return null;
    return data.signedUrl;
  }

  async function deleteDocument(doc) {
    await supabase.storage.from(BUCKET).remove([doc.file_path]);
    return removeRow(doc.id);
  }

  function confirmDocument(doc) {
    return update(doc.id, { review_status: "confirmed" });
  }
  function rejectDocument(doc) {
    return update(doc.id, { review_status: "rejected" });
  }

  return { documents, loading, error, uploadDocument, viewDocument, deleteDocument, confirmDocument, rejectDocument, refresh };
}
