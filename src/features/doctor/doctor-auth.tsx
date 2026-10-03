"use client";

import { FormEvent, ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Brand } from "@/components/brand";
import {
  authenticateDoctor,
  createDoctorAccount,
  demoDoctorPassword,
} from "@/lib/records";

type SignupStep = "account" | "professional" | "review";

type DoctorDraft = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  specialty: string;
  clinic: string;
  council: string;
  registration: string;
};

const emptyDoctor: DoctorDraft = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  specialty: "",
  clinic: "",
  council: "",
  registration: "",
};

function DoctorAuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="doctor-auth-page">
      <header className="site-header wrap">
        <Brand />
        <Link href="/" className="header-back">
          <ArrowLeft size={16} /> Home
        </Link>
      </header>
      <div className="doctor-auth-layout wrap">
        <aside className="doctor-auth-story">
          <span className="doctor-auth-mark">
            <Stethoscope size={30} />
          </span>
          <span className="eyeline">HEALTH DOSSIER FOR DOCTORS</span>
          <h1>
            The records your patient chose to share.
            <br />
            <em>Nothing more.</em>
          </h1>
          <p>
            Review time-limited access in one private inbox, with every preview
            and download reflected in the patient’s activity history.
          </p>
          <div className="doctor-auth-promise">
            <ShieldCheck size={20} />
            <span>
              <strong>Patient-controlled by design</strong>
              Access disappears when a grant expires or is revoked.
            </span>
          </div>
        </aside>
        <section className="doctor-auth-main">{children}</section>
      </div>
    </main>
  );
}

export function DoctorLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const doctor = await authenticateDoctor(email, password);
      if (!doctor) {
        setError("The email or password is incorrect.");
        return;
      }
      router.push("/doctor");
    } catch {
      setError("Doctor login could not be opened in this browser.");
    } finally {
      setSubmitting(false);
    }
  }

  function useDemoAccount() {
    setEmail("ananya.mehta@healthdossier.demo");
    setPassword(demoDoctorPassword);
    setError("");
  }

  return (
    <DoctorAuthShell>
      <div className="doctor-auth-card">
        <span className="signup-step-label">DOCTOR PORTAL</span>
        <h2>Welcome back</h2>
        <p className="signup-intro">
          Sign in to review access granted by your patients.
        </p>
        <button className="demo-account-button" onClick={useDemoAccount}>
          <BadgeCheck size={19} />
          <span>
            <strong>Use the verified demo account</strong>
            Dr Ananya Mehta · credentials will be filled in
          </span>
        </button>
        <div className="signup-divider">
          <span>or use your account</span>
        </div>
        <form onSubmit={login} noValidate>
          <label className="signup-label" htmlFor="doctor-email">
            Work email
          </label>
          <input
            id="doctor-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="doctor@clinic.in"
          />
          <label className="signup-label" htmlFor="doctor-password">
            Password
          </label>
          <input
            id="doctor-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
          />
          {error && (
            <p role="alert" className="signup-error">
              {error}
            </p>
          )}
          <button
            className="button button-primary signup-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"} <ArrowRight size={18} />
          </button>
        </form>
        <p className="doctor-auth-switch">
          New to Health Dossier?{" "}
          <Link href="/doctor/signup">Create a doctor account</Link>
        </p>
        <p className="doctor-demo-disclaimer">
          <LockKeyhole size={14} /> Demo only. This is not production
          authentication or medical-license verification.
        </p>
      </div>
    </DoctorAuthShell>
  );
}

export function DoctorSignup() {
  const router = useRouter();
  const [step, setStep] = useState<SignupStep>("account");
  const [draft, setDraft] = useState<DoctorDraft>(emptyDoctor);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof DoctorDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function continueFromAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim() || !/^\S+@\S+\.\S+$/.test(draft.email.trim())) {
      setError("Enter your name and a valid work email.");
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(draft.password)) {
      setError("Use at least 8 characters with a letter and a number.");
      return;
    }
    if (draft.password !== draft.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setError("");
    setStep("professional");
  }

  function continueFromProfessional(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !draft.specialty.trim() ||
      !draft.clinic.trim() ||
      !draft.council.trim() ||
      !draft.registration.trim()
    ) {
      setError("Complete every professional detail before continuing.");
      return;
    }
    setError("");
    setStep("review");
  }

  async function createAccount() {
    setSubmitting(true);
    setError("");
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      await createDoctorAccount({
        name: draft.name,
        email: draft.email,
        password: draft.password,
        specialty: draft.specialty,
        clinic: draft.clinic,
        council: draft.council,
        registration: draft.registration,
      });
      router.push("/doctor");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The doctor account could not be created.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DoctorAuthShell>
      <div className="doctor-auth-card doctor-signup-card">
        <div className="doctor-stepper" aria-label="Signup progress">
          {(["account", "professional", "review"] as const).map(
            (item, index) => (
              <span
                key={item}
                className={item === step ? "active" : ""}
                aria-current={item === step ? "step" : undefined}
              >
                {index + 1}
              </span>
            ),
          )}
        </div>
        {step === "account" && (
          <>
            <span className="signup-step-label">ACCOUNT DETAILS</span>
            <h2>Create your doctor account</h2>
            <p className="signup-intro">
              Your password stays hashed in this browser.
            </p>
            <form onSubmit={continueFromAccount} noValidate>
              <label className="signup-label" htmlFor="doctor-name">
                Full name
              </label>
              <input
                id="doctor-name"
                value={draft.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Dr Asha Rao"
                autoComplete="name"
              />
              <label className="signup-label" htmlFor="signup-doctor-email">
                Work email
              </label>
              <input
                id="signup-doctor-email"
                type="email"
                value={draft.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="doctor@clinic.in"
                autoComplete="email"
              />
              <div className="doctor-auth-field-grid">
                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    value={draft.password}
                    onChange={(event) => update("password", event.target.value)}
                    autoComplete="new-password"
                  />
                </label>
                <label>
                  <span>Confirm password</span>
                  <input
                    type="password"
                    value={draft.confirmPassword}
                    onChange={(event) =>
                      update("confirmPassword", event.target.value)
                    }
                    autoComplete="new-password"
                  />
                </label>
              </div>
              {error && (
                <p className="signup-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button button-primary signup-submit"
                type="submit"
              >
                Professional details <ArrowRight size={18} />
              </button>
            </form>
          </>
        )}
        {step === "professional" && (
          <>
            <button className="signup-back" onClick={() => setStep("account")}>
              <ArrowLeft size={16} /> Back
            </button>
            <span className="signup-step-label">PROFESSIONAL DETAILS</span>
            <h2>Tell patients who you are</h2>
            <p className="signup-intro">
              These details appear when a patient chooses a doctor.
            </p>
            <form onSubmit={continueFromProfessional} noValidate>
              <label className="signup-label" htmlFor="doctor-specialty">
                Specialty
              </label>
              <input
                id="doctor-specialty"
                value={draft.specialty}
                onChange={(event) => update("specialty", event.target.value)}
                placeholder="e.g. Cardiology"
              />
              <label className="signup-label" htmlFor="doctor-clinic">
                Clinic or hospital
              </label>
              <input
                id="doctor-clinic"
                value={draft.clinic}
                onChange={(event) => update("clinic", event.target.value)}
                placeholder="Where you practise"
              />
              <label className="signup-label" htmlFor="doctor-council">
                Medical council
              </label>
              <input
                id="doctor-council"
                value={draft.council}
                onChange={(event) => update("council", event.target.value)}
                placeholder="e.g. Telangana State Medical Council"
              />
              <label className="signup-label" htmlFor="doctor-registration">
                Registration number
              </label>
              <input
                id="doctor-registration"
                value={draft.registration}
                onChange={(event) => update("registration", event.target.value)}
                placeholder="e.g. TSMC 48291"
              />
              {error && (
                <p className="signup-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button button-primary signup-submit"
                type="submit"
              >
                Review details <ArrowRight size={18} />
              </button>
            </form>
          </>
        )}
        {step === "review" && (
          <>
            <button
              className="signup-back"
              onClick={() => setStep("professional")}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <span className="signup-step-label">DEMO VERIFICATION</span>
            <h2>Review your professional profile</h2>
            <p className="signup-intro">
              Confirm the details used in this simulated verification.
            </p>
            <div className="doctor-review-profile">
              <span>
                <Stethoscope size={24} />
              </span>
              <div>
                <strong>{draft.name}</strong>
                <p>
                  {draft.specialty} · {draft.clinic}
                </p>
                <small>
                  {draft.registration} · {draft.council}
                </small>
              </div>
            </div>
            <div className="doctor-verification-note">
              <BadgeCheck size={20} />
              <p>
                <strong>Simulated verification only</strong>
                No medical council or identity service is contacted. This
                profile is trusted only inside this Mac-local demo.
              </p>
            </div>
            {error && (
              <p className="signup-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button button-primary signup-submit"
              onClick={createAccount}
              disabled={submitting}
            >
              {submitting ? "Verifying…" : "Verify and create account"}
              <BadgeCheck size={18} />
            </button>
          </>
        )}
        <p className="doctor-auth-switch">
          Already registered? <Link href="/doctor/login">Sign in</Link>
        </p>
      </div>
    </DoctorAuthShell>
  );
}
