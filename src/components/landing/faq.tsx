import Link from "next/link";
import { FaqRows } from "@merqo/ui";

export const FAQ = [
  {
    q: "What is Merqo?",
    a: 'Merqo is the house brand behind a family of small-business tools ("kits") for Singapore micro/small sellers. qkit is piloting, and loopkit, paykit, stockkit, and printkit are in build.',
  },
  {
    q: "Do I need to sign up for every kit separately?",
    a: "Each kit runs on its own, so you set up only the ones you use.",
  },
  {
    q: "Can I use just one kit?",
    a: "Yes. Every kit works standalone. Use only the ones you need.",
  },
] as const;

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-16">
      <h2 className="mb-10 font-display text-3xl font-bold tracking-tight">
        Questions
      </h2>
      <FaqRows rows={FAQ} />
      <Link
        href="/faq"
        className="mt-6 inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline active:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        More questions
      </Link>
    </section>
  );
}
