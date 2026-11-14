import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Contact me", description: "Questions about an exam, your account or your pass? Send a message and get a personal reply." };

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const { topic, from } = await searchParams;
  const user = await getUser();
  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="text-center text-3xl font-extrabold">Contact me</h1>
      <p className="mx-auto mt-2 max-w-lg text-center text-soft">
        Stuck on a question, found a mistake, or have a concern about your account or pass? Send me a message. I read every one and usually reply within 1–2 days.
      </p>
      <div className="card mt-8 p-6">
        <ContactForm signedInEmail={user?.email} defaultTopic={typeof topic === "string" ? topic : undefined} from={typeof from === "string" ? from : undefined} />
      </div>
      <p className="mt-4 text-center text-xs text-muted">Found a problem with a specific practice question? The <b>Report</b> button under the question sends it to me with the question attached.</p>
    </div>
  );
}
