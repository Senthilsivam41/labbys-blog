"use client";

import { FormEvent, useState } from "react";
import { firebaseServices } from "@/lib/firebase";

export function InquiryForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("sending"); setError("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (String(values.company ?? "")) { setState("sent"); return; }
    const services = await firebaseServices();
    if (!services) { setError("The inquiry service is not configured yet. Please try again after launch."); setState("error"); return; }
    try {
      await services.functions.httpsCallable("submitInquiry")({ name: values.name, email: values.email, message: values.message });
      form.reset(); setState("sent");
    } catch {
      setError("Your inquiry could not be sent. Please wait a moment and try again."); setState("error");
    }
  }

  if (state === "sent") return <div className="form-success" role="status"><span aria-hidden="true">✓</span><h2>Thank you for reaching out.</h2><p>Your note is in Sendil’s inbox. Expect a thoughtful response rather than an automated one.</p></div>;
  return <form className="inquiry-form" onSubmit={submit}><div className="honeypot" aria-hidden="true"><label>Company website<input name="company" tabIndex={-1} autoComplete="off" /></label></div><label><span>Your name</span><input required name="name" autoComplete="name" maxLength={100} placeholder="How should I address you?" /></label><label><span>Email address</span><input required name="email" type="email" autoComplete="email" maxLength={200} placeholder="you@example.com" /></label><label><span>What would you like to explore?</span><textarea required name="message" minLength={20} maxLength={3000} rows={7} placeholder="A little context, the decision in front of you, and what a useful outcome might look like." /></label>{state === "error" && <p className="form-error" role="alert">{error}</p>}<button className="button" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send inquiry ↗"}</button><p className="form-note">Your message is used only to respond to this inquiry.</p></form>;
}
