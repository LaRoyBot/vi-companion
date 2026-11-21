import Link from "next/link";

const faqs = [
  {
    title: "What can VI Companion access?",
    body: "Only the records and preferences you save to your VI Companion account. Profile, session, objective, collection and note tools run against the authenticated account and are protected by user-scoped database policies.",
  },
  {
    title: "Does it connect to my PlayStation or Xbox?",
    body: "No. PS5 and Xbox are manually selected platform labels. VI Companion does not collect console credentials, connect to PSN or Xbox, inspect a console, read live game state or control gameplay.",
  },
  {
    title: "Can it provide GTA VI mission guides or live information?",
    body: "Game-derived knowledge retrieval is disabled pending a rights review. The app will not claim live game access or retrieve content from unapproved sources.",
  },
  {
    title: "How do I connect it to ChatGPT?",
    body: "Use the VI Companion app connection flow in ChatGPT when the app is available to your account. Sign in to VI Companion and review the requested access on the consent screen before approving.",
  },
  {
    title: "How do I export or delete my data?",
    body: "The connected MCP integration provides an export action. Account deletion is a separate, destructive action and requires the exact confirmation phrase DELETE. Once processed, the account and associated user records are removed.",
  },
  {
    title: "Where do I report a bug or security issue?",
    body: "For general bugs, use the repository issue tracker. For a vulnerability, use GitHub Security Advisories and do not publish details or secrets in an ordinary issue.",
  },
];

export default function SupportPage() {
  return (
    <main className="document-shell">
      <div className="document-brand"><span className="brand-mark">VI</span><b>VI COMPANION</b></div>
      <article className="document-card">
        <div className="eyebrow"><span className="eyebrow-line"/> PLAYER SUPPORT</div>
        <h1>Help & support</h1>
        <p>VI Companion keeps your own player records organized across devices. Here are the current capabilities and important boundaries.</p>
        <div className="support-list">
          {faqs.map((item) => (
            <div className="support-item" key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
        <h2>Contact and issue reporting</h2>
        <p>For product questions and bugs, use the <Link href="https://github.com/LaRoyBot/vi-companion/issues">GitHub issue tracker</Link>. For private security reports, use <Link href="https://github.com/LaRoyBot/vi-companion/security/advisories/new">GitHub Security Advisories</Link>.</p>
        <p className="legal-note">Privacy policy and terms are still draft documents and must be reviewed and completed before general public launch.</p>
      </article>
      <Link className="document-back" href="/">← Back to companion</Link>
    </main>
  );
}
