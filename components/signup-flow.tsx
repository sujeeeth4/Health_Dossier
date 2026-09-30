"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Phone } from "lucide-react";
import { Brand } from "@/components/brand";
import { DossierIllustration } from "@/components/dossier-illustration";

type Step = "choose" | "phone" | "verify";

function GoogleMark() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.22c0-.68-.06-1.35-.17-2H12v3.79h5.25a4.5 4.5 0 0 1-1.95 2.95v2.46h3.16c1.85-1.7 2.89-4.21 2.89-7.2Z"/><path fill="#34A853" d="M12 21.73c2.65 0 4.88-.88 6.5-2.38l-3.16-2.46c-.88.59-2.01.95-3.34.95-2.57 0-4.75-1.73-5.53-4.06H3.21v2.54a9.82 9.82 0 0 0 8.79 5.41Z"/><path fill="#FBBC05" d="M6.47 13.35a5.9 5.9 0 0 1 0-3.7V7.11H3.21a9.83 9.83 0 0 0 0 8.78l3.26-2.54Z"/><path fill="#EA4335" d="M12 5.16c1.4 0 2.65.48 3.64 1.43l2.73-2.73A9.56 9.56 0 0 0 12 1.27a9.82 9.82 0 0 0-8.79 5.84l3.26 2.54C7.25 6.89 9.43 5.16 12 5.16Z"/></svg>;
}
function AppleMark() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M17.05 12.54c.03 2.5 2.2 3.33 2.23 3.34-.02.06-.35 1.2-1.14 2.38-.69 1.02-1.4 2.04-2.52 2.06-1.1.02-1.45-.66-2.71-.66-1.27 0-1.66.64-2.69.68-1.08.04-1.9-1.1-2.59-2.12-1.41-2.04-2.49-5.77-1.04-8.28a4 4 0 0 1 3.38-2.06c1.05-.02 2.04.72 2.68.72.64 0 1.84-.89 3.1-.76.53.02 2.03.21 2.99 1.62-.08.05-1.78 1.04-1.76 3.08ZM14.92 6.5a3.87 3.87 0 0 0 .89-2.81c-.86.04-1.9.57-2.51 1.3a3.68 3.68 0 0 0-.92 2.72c.96.08 1.94-.49 2.54-1.21Z"/></svg>;
}

export function SignupFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) { setError("Enter a valid phone number."); return; }
    setPhone(digits); setOtp(""); setError(""); setStep("verify");
  }
  function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (otp.length !== 6) { setError("Enter the 6-digit code."); return; }
    setError(""); router.push("/records");
  }
  function goBack() { setError(""); setStep(step === "verify" ? "phone" : "choose"); }

  return <main className="signup-page"><header className="site-header wrap"><Brand/><div className="header-actions"><Link href="/" className="header-back"><ArrowLeft size={16}/> Home</Link></div></header><div className="signup-layout wrap">
    <aside className="signup-story"><span className="eyeline">Make yourself at home</span><h1>A little more order.<br/><em>A little more ease.</em></h1><p>Your health records deserve a place of their own.</p><DossierIllustration className="signup-illustration"/><p className="signup-story-foot">Start with one record. The rest can follow.</p></aside>
    <section className="signup-main" aria-labelledby="signup-title"><div className="signup-card">{step !== "choose" && <button type="button" className="signup-back" onClick={goBack}><ArrowLeft size={16}/> Back</button>}
      {step === "choose" && <><span className="signup-step-label">WELCOME</span><h2 id="signup-title">Create your account</h2><p className="signup-intro">Let’s bring your records together.</p><div className="signup-options"><button type="button" className="provider-button" onClick={() => router.push("/records")}><GoogleMark/> Continue with Google</button><button type="button" className="provider-button" onClick={() => router.push("/records")}><AppleMark/> Continue with Apple</button></div><div className="signup-divider"><span>or</span></div><button type="button" className="provider-button phone-button" onClick={() => setStep("phone")}><Phone size={19}/> Continue with phone number</button></>}
      {step === "phone" && <><span className="signup-step-label">PHONE NUMBER</span><h2 id="signup-title">Continue with your phone</h2><p className="signup-intro">Enter your number to continue.</p><form onSubmit={sendCode} noValidate><label className="signup-label" htmlFor="phone-number">Phone number</label><div className="phone-field"><label className="sr-only" htmlFor="country-code">Country code</label><select id="country-code" value={countryCode} onChange={event => setCountryCode(event.target.value)}><option value="+91">+91</option><option value="+1">+1</option><option value="+44">+44</option></select><input id="phone-number" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="Your phone number" value={phone} onChange={event => setPhone(event.target.value)} required/></div>{error && <p role="alert" className="signup-error">{error}</p>}<button className="button button-primary signup-submit" type="submit">Continue <ArrowRight size={18}/></button></form></>}
      {step === "verify" && <><span className="signup-step-label">ONE-TIME CODE</span><h2 id="signup-title">Enter your code</h2><p className="signup-intro">Enter the six-digit code for {countryCode} {phone}.</p><form onSubmit={verifyCode} noValidate><label className="signup-label" htmlFor="verification-code">Verification code</label><input id="verification-code" className="otp-input" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}/>{error && <p role="alert" className="signup-error">{error}</p>}<button className="button button-primary signup-submit" type="submit">Continue <ArrowRight size={18}/></button></form></>}
    </div><p className="signup-side-note">One record at a time. At your own pace.</p></section>
  </div></main>;
}
