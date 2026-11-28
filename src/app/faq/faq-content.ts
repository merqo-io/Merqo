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
        a: 'Merqo is the house brand behind a family of small-business tools ("kits") for Singapore micro/small sellers. qkit is piloting, and loopkit, paykit, stockkit, and printkit are in build.',
      },
      {
        q: "Who is behind Merqo?",
        a: "Merqo is a personal software project built and run by Clarence Lee. Merqo is not registered with ACRA or incorporated as a company.",
      },
      {
        q: "What does each kit do?",
        a: "qkit is piloting (running in a pilot): take orders and run your queue from a QR code, with no app and no hardware. loopkit, paykit, stockkit and printkit are in build (built, not yet tried with vendors): loopkit is stamp cards and points, paykit shows a PayNow QR and you confirm each payment, stockkit tracks stock in and out, and printkit prints qkit orders on a Bluetooth printer.",
      },
    ],
  },
  {
    id: "accounts-and-kits",
    heading: "Accounts and kits",
    rows: [
      {
        q: "Do I need to sign up for every kit separately?",
        a: "No. Each kit runs on its own. Use only the ones you need.",
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
      {
        q: "Which plan would suit me?",
        a: "Merqo is free during the pilot. The Which plan fits you page at /which-plan suggests a plan for each kind of vendor, in case paid plans are introduced. If they are, payment is in advance, by PayNow, recorded by hand. Nothing is charged before Merqo is registered as a business.",
      },
      {
        q: "If paid plans are introduced, is there a trial?",
        a: "Yes. Each business would get one 30-day Pro trial. It starts at your first order, not from sign-up. We may refuse a trial if the same email, PayNow number or UEN has already had one.",
      },
      {
        q: "If paid plans are introduced, what is the founder offer?",
        a: "The first 20 vendors would get numbered founder spots. The offer closes when 20 are taken, or 60 days after paid plans open. Founders are on Pro and skip the trial. The waitlist page shows how many spots are left.",
      },
      {
        q: "If paid plans are introduced, can I pause or miss a payment?",
        a: "You could pause for up to 3 months in any 12 months. Your data and your price are kept while paused. After a missed payment you get 7 days' grace after your billing date, then your account moves to Free. Your data is kept.",
      },
    ],
  },
  {
    id: "waitlist",
    heading: "Waitlist",
    rows: [
      {
        q: "How do I join the waitlist?",
        a: "Open the waitlist page, pick a kit and type your email. Only kits that are in build are listed: loopkit, paykit, stockkit and printkit.",
      },
      {
        q: "What happens to my email on the waitlist?",
        a: 'We save your email against the kit you pick. The form says "We may email you about this kit." A separate box, not ticked to start with, says "Also send me occasional Merqo updates." and we only record that if you tick it.',
      },
    ],
  },
];
