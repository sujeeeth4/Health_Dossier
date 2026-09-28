import Link from "next/link";
import { ArrowDown, ArrowRight, FileText, Search, Download } from "lucide-react";
import { Brand } from "@/components/brand";
import { DossierIllustration } from "@/components/dossier-illustration";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  { number: "01", icon: FileText, title: "The papers you keep meaning to sort.", description: "Prescriptions, lab results, scans, and care notes. Give each one a name and a date, and keep them together." },
  { number: "02", icon: Search, title: "That report from a few years ago.", description: "Find a record by its title, your doctor’s name, or a note you remember. A little detail now saves a long search later." },
  { number: "03", icon: Download, title: "The original, whenever you need it.", description: "Open the actual document, check a detail, or download a copy before your next visit." },
];

export default function Home() {
  return (
    <main className="landing" id="top">
      <header className="site-header wrap">
        <Brand />
        <nav className="landing-nav" aria-label="Main navigation"><a href="#your-library">Your library</a><a href="#how-it-works">How it works</a></nav>
        <div className="header-actions"><ThemeToggle compact /><Link className="button button-primary header-cta" href="/signup">Get started <ArrowRight size={16} /></Link></div>
      </header>

      <section className="home-hero wrap">
        <div className="home-hero-copy">
          <p className="eyeline"><span className="little-cross" aria-hidden="true" /> A little care for your records</p>
          <h1>A home for<br />your <em>health story.</em></h1>
          <p className="hero-description">The scan from last summer. Your latest prescription. Keep them together, ready for whatever comes next.</p>
          <Link className="button button-primary hero-cta" href="/signup">Start your dossier <ArrowRight size={18} /></Link>
          <a className="understated-link" href="#how-it-works">Let’s take a look <ArrowDown size={15} /></a>
        </div>
        <figure className="home-hero-art"><DossierIllustration /><figcaption>A place for the things worth keeping.</figcaption></figure>
      </section>

      <div className="document-strip wrap"><p>Big moments. Routine visits.<br /> <strong>There’s room for all of it.</strong></p><ul aria-label="Supported record categories"><li>Prescriptions</li><li>Lab reports</li><li>Scans &amp; imaging</li><li>Care notes</li></ul></div>

      <section className="home-library wrap" id="your-library">
        <div className="section-aside"><span className="eyeline">Made for everyday life</span><h2>Less looking.<br /><em>More living.</em></h2><p>Health records have a way of ending up everywhere. This is one place to bring them back together.</p><span className="aside-flower" aria-hidden="true">✳</span></div>
        <div className="feature-rows">{features.map(({ number, icon: Icon, title, description }) => <article className="feature-row" key={number}><span className="feature-index">{number}</span><div><Icon size={23} strokeWidth={1.5} aria-hidden="true" /><h3>{title}</h3><p>{description}</p></div></article>)}</div>
      </section>

      <section className="home-how" id="how-it-works"><div className="wrap">
        <div className="how-heading"><span className="eyeline">One small start</span><h2>You don’t need to<br />organize it all today.</h2><p>Start with the document in front of you.<br /> The rest can follow.</p></div>
        <ol className="how-steps"><li><span className="step-number">1</span><h3>Make yourself at home</h3><p>Get started with Google, Apple, or your phone number.</p></li><li><span className="step-number">2</span><h3>Bring your first record</h3><p>Add a PDF or photo. Include a date and a few useful details.</p></li><li><span className="step-number">3</span><h3>Come back when you need it</h3><p>Your documents, ready to search, open, and download.</p></li></ol>
      </div></section>

      <section className="home-invitation wrap"><span className="invitation-mark" aria-hidden="true"><FileText size={30} strokeWidth={1.25} /></span><div><h2>Begin with one record.</h2><p>A little more organized. A little more at ease.</p></div><Link className="button button-primary" href="/signup">Get started <ArrowRight size={17} /></Link></section>
      <footer className="footer wrap"><Brand /><p>A little order. A little peace of mind.</p><a href="#top">Back to top <ArrowUpIcon /></a></footer>
    </main>
  );
}

function ArrowUpIcon() { return <ArrowDown size={14} style={{ transform: "rotate(180deg)" }} aria-hidden="true" />; }
