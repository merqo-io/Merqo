import type { FaqGroup } from "@merqo/ui";

export const FAQ_TITLE = "Frequently asked questions";

export const FAQ_INTRO =
  "Short answers about Merqo and the family of small-business kits behind it.";

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "about-merqo",
    heading: "About Merqo",
    rows: [
      {
        q: "What is Merqo?",
        a: 'Merqo is the house brand behind a family of small-business tools ("kits") for Singapore micro/small sellers. qkit is piloting, and loopkit, paykit, and stockkit are in build.',
      },
      {
        q: "Who is behind Merqo?",
        a: "Merqo is a personal software project built and run by Clarence Lee. Merqo is not registered with ACRA or incorporated as a company.",
      },
      {
        q: "What does each kit do?",
        a: "qkit is piloting (running with a few vendors): take orders and run your queue from a QR code, with no app and no hardware. loopkit, paykit and stockkit are in build (built, not yet tried with vendors): loopkit is stamp cards and points, paykit shows a PayNow QR and you confirm each payment, and stockkit tracks stock in and out.",
      },
    ],
  },
  {
    id: "accounts-and-kits",
    heading: "Accounts and kits",
    rows: [
      {
        q: "Do I need to sign up for every kit separately?",
        a: "No. The plan is one Merqo account and one sign-in across the kits.",
      },
      {
        q: "Can I use just one kit?",
        a: "Yes. Every kit works standalone. Use only the ones you need.",
      },
      {
        q: "Is Merqo itself something I sign up for separately?",
        a: "No. Merqo is the account and dashboard layer over the kits you already use, not a separate product to purchase.",
      },
      {
        q: "Do I sign in with Google or a password?",
        a: "Either one. The Merqo sign-in page offers Google, or an email and password.",
      },
      {
        q: "Do the kits work together?",
        a: "Two links are in build: paykit showing a PayNow QR on a qkit order page, and loopkit offering a stamp on a qkit order page. stockkit is not linked to the others.",
      },
    ],
  },
  {
    id: "waitlist",
    heading: "Waitlist",
    rows: [
      {
        q: "How do I join the waitlist?",
        a: "Open the waitlist page, pick a kit and type your email. Only kits that are in build are listed: loopkit, paykit and stockkit.",
      },
      {
        q: "What happens to my email on the waitlist?",
        a: 'We save your email against the kit you pick. The form says "Clarence may email you about this kit." A separate box, not ticked to start with, says "Also send me occasional Merqo updates." and we only record that if you tick it.',
      },
    ],
  },
];
