import { getFormSubmissions, getFormSubmissionPages } from "@/lib/actions/forms";
import FormsClient from "./_components/FormsClient";

export default async function FormsPage() {
  const [submissions, pages] = await Promise.all([
    getFormSubmissions(),
    getFormSubmissionPages(),
  ]);

  return <FormsClient submissions={submissions} pages={pages} />;
}
