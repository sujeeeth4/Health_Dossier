import Link from "next/link";
import { ArrowRight, Check, ChevronRight, FileHeart, FolderHeart, HeartPulse, LockKeyhole, ScanLine, Share2, ShieldCheck, Stethoscope } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return <main className="landing">
    <header className="site-header wrap">
      <Brand />
      <nav aria-label="Main navigation" className="landing-nav"><a href="#how-it-works">How it works</a><a href="#benefits">Benefits</a><a href="#control">Your control</a></nav>
      <div className="header-actions"><ThemeToggle compact/><Button asChild variant="outline" className="header-cta"><Link href="/demo">Enter demo <ArrowRight size={16}/></Link></Button></div>
    </header>
    <section className="hero wrap">
      <div className="hero-copy">
        <span className="eyebrow"><span className="eyebrow-dot"/> LOCAL DEMO · VERSION 0.1.1</span>
        <h1>One Health Record.<br/><em>Better Connected Care.</em></h1>
        <p>Keep your medical history organized from birth to today, and share the right information with the right doctor when you choose.</p>
        <div className="hero-actions"><Button asChild><Link href="/demo">Explore the demo <ArrowRight size={18}/></Link></Button><Button asChild variant="quiet"><a href="#how-it-works">See how it works <ChevronRight size={18}/></a></Button></div>
        <div className="hero-foot"><ShieldCheck size={18}/><span>Patient-controlled sharing</span><span className="divider-dot">·</span><span>Fictional sample data</span></div>
      </div>
      <div className="hero-visual" aria-label="Illustration of an organized health record">
        <div className="visual-glow"/>
        <div className="hero-card main-record"><div className="record-top"><span className="mini-icon"><FolderHeart size={19}/></span><span className="record-pill">PATIENT RECORD</span></div><div className="record-heading">A lifetime of care,<br/>all in one place.</div><div className="record-sub">A clear view of every step in your health journey.</div><div className="record-line"><span className="line-dot blue-dot"/><div><b>Annual health check</b><small>Today · Laboratory report</small></div><Check size={16}/></div><div className="record-line"><span className="line-dot green-dot"/><div><b>Childhood vaccination</b><small>Age 5 · Immunization record</small></div><Check size={16}/></div><div className="record-line"><span className="line-dot cream-dot"/><div><b>First health record</b><small>At birth · Clinical document</small></div><Check size={16}/></div></div>
        <div className="float-card secure-card"><span className="float-icon"><LockKeyhole size={18}/></span><div><strong>You decide who sees what</strong><small>Share on your terms</small></div></div>
        <div className="float-card doctor-card"><span className="doctor-avatar">DR</span><div><strong>Shared with Dr. Meera</strong><small>View access · 7 days</small></div><span className="active-dot"/></div>
      </div>
    </section>
    <section className="problem-band"><div className="wrap problem-layout"><div><span className="section-kicker">THE CHALLENGE</span><h2>Your health story should never be scattered.</h2></div><p>Old prescriptions in a drawer. Scan reports in another hospital. A new doctor asking you to recall years of care. Health Dossier brings the history together so the conversation can move forward.</p></div></section>
    <section className="section wrap" id="how-it-works"><div className="section-intro"><span className="section-kicker">HOW IT WORKS</span><h2>One clear path through your care</h2><p>From the first record to your latest visit, everything stays easy to find and simple to share.</p></div><div className="steps"><article className="step-card"><span className="step-num">01</span><span className="step-icon sky-bg"><ScanLine size={26}/></span><h3>Add your reports</h3><p>Bring documents into one organized history and review their details before saving.</p></article><article className="step-card"><span className="step-num">02</span><span className="step-icon cream-bg"><FileHeart size={26}/></span><h3>See the full picture</h3><p>Browse by age, date, doctor, hospital, specialty, condition, or report type.</p></article><article className="step-card"><span className="step-num">03</span><span className="step-icon green-bg"><Share2 size={26}/></span><h3>Share with confidence</h3><p>Choose the records, the doctor, the permission, and when access ends.</p></article></div></section>
    <section className="section benefit-section" id="benefits"><div className="wrap benefit-grid"><div className="benefit-panel patient-panel"><span className="benefit-icon"><HeartPulse size={24}/></span><span className="section-kicker">FOR PATIENTS</span><h2>Your story, in your hands.</h2><p>Find the right report at the right moment, see your history over time, and stay in control of every share.</p><ul><li><Check size={17}/> Lifelong timeline</li><li><Check size={17}/> Easy report discovery</li><li><Check size={17}/> Visible access history</li></ul></div><div className="benefit-panel provider-panel"><span className="benefit-icon"><Stethoscope size={24}/></span><span className="section-kicker">FOR CARE TEAMS</span><h2>Better context for better conversations.</h2><p>With permission, doctors can see the relevant history and contribute to a more continuous record.</p><ul><li><Check size={17}/> Authorized patient view</li><li><Check size={17}/> Clear permissions and expiry</li><li><Check size={17}/> Attributable contributions</li></ul></div></div></section>
    <section className="control-section wrap" id="control"><div className="control-art"><div className="control-ring"><LockKeyhole size={42}/></div><div className="control-label label-one">Choose records</div><div className="control-label label-two">Set permissions</div><div className="control-label label-three">Revoke anytime</div></div><div><span className="section-kicker">BUILT AROUND YOUR CHOICE</span><h2>Access begins and ends with you.</h2><p>Share a single report, a selected collection, or your full history. Sensitive records stay out of broad sharing unless you deliberately include them. You can review and revoke access from one place.</p><Link className="button button-primary" href="/demo">Try the sharing demo <ArrowRight size={18}/></Link></div></section>
    <section className="final-cta"><div className="wrap final-inner"><div><span className="section-kicker">SEE THE IDEA IN ACTION</span><h2>A more connected health journey starts here.</h2><p>Explore a local demo with fictional information. No account is created.</p></div><Link className="button button-light" href="/demo">Explore the demo <ArrowRight size={18}/></Link></div></section>
    <footer className="footer wrap"><Brand/><p>Version 0.1.1 development demo. Do not upload real patient information.</p><div><span>Privacy · Coming later</span><span>Terms · Coming later</span><span>Contact · Coming later</span></div></footer>
  </main>;
}
