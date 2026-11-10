"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AREAS, GROUPS, getArea, groupId } from "@/lib/areas";
import { BATHS, BEDS, BUDGETS, CONTACTS, FINANCING, MOTIVATIONS, OCCUPANCY, PROPERTY_TYPES, SELLER_PRICES, TIMELINES, labelOf } from "@/lib/options";
import type { Draft } from "@/lib/types";
import { emptyDraft, issuesForStep } from "@/lib/validate";

export function InquiryForm({
  kind,
  source,
  campaign = "",
  presetArea = "",
}: {
  kind: "buyer" | "seller";
  source: string;
  campaign?: string;
  presetArea?: string;
}) {
  const router = useRouter();
  const preset = getArea(presetArea)?.slug ?? "";
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft>(() => ({
    ...emptyDraft(),
    areas: kind === "buyer" && preset ? [preset] : [],
    area: kind === "seller" ? preset : "",
  }));

  const steps = kind === "buyer" ? ["Places", "Home", "Budget", "Timing", "You"] : ["Property", "Details", "Timing", "Price", "You"];

  function patch(next: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  function toggle(list: string[], id: string, max: number) {
    if (list.includes(id)) return list.filter((item) => item !== id);
    if (list.length >= max) return list;
    return [...list, id];
  }

  function failOrAdvance() {
    const issues = issuesForStep(kind, step, draft);
    if (issues.length) {
      setError(issues[0] ?? "Check that step.");
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function send() {
    const issues = issuesForStep(kind, step, draft);
    if (issues.length) {
      setError(issues[0] ?? "Check the form.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ kind, source, campaign, ...draft }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "We could not send that. Try again.");
        setPending(false);
        return;
      }
      router.push(`/thanks?kind=${kind}`);
    } catch {
      setError("We could not send that. Try again.");
      setPending(false);
    }
  }

  return (
    <form
      className="wizard"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (step < steps.length - 1) failOrAdvance();
        else void send();
      }}
    >
      <p className="kicker" id="step-label">
        Step {step + 1} of {steps.length} · {steps[step]}
      </p>
      <ol className="progress">
        {steps.map((label, index) => (
          <li key={label} aria-current={index === step ? "step" : undefined}>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 && kind === "buyer" ? (
        <AreaPicker selected={draft.areas} onToggle={(slug) => patch({ areas: toggle(draft.areas, slug, 8) })} multiple />
      ) : null}
      {step === 0 && kind === "seller" ? (
        <>
          <AreaPicker selected={draft.area ? [draft.area] : []} onToggle={(slug) => patch({ area: draft.area === slug ? "" : slug })} />
          <Field label="Street address" value={draft.address} onChange={(address) => patch({ address })} autoComplete="street-address" />
        </>
      ) : null}

      {step === 1 && kind === "buyer" ? (
        <>
          <MultiChoice legend="Home type" options={PROPERTY_TYPES} selected={draft.propertyTypes} onToggle={(id) => patch({ propertyTypes: toggle(draft.propertyTypes, id, 4) })} />
          <SingleChoice legend="Bedrooms" options={BEDS} value={draft.beds} onChange={(beds) => patch({ beds })} />
          <Field label="Must-haves" value={draft.mustHaves} onChange={(mustHaves) => patch({ mustHaves })} hint="Optional. Parking, a yard, a specific line, a floor." multiline />
        </>
      ) : null}
      {step === 1 && kind === "seller" ? (
        <>
          <SingleChoice legend="Property type" options={PROPERTY_TYPES} value={draft.propertyType} onChange={(propertyType) => patch({ propertyType })} />
          <SingleChoice legend="Bedrooms" options={BEDS} value={draft.bedsSeller} onChange={(bedsSeller) => patch({ bedsSeller })} />
          <SingleChoice legend="Bathrooms" options={BATHS} value={draft.baths} onChange={(baths) => patch({ baths })} optional />
        </>
      ) : null}

      {step === 2 && kind === "buyer" ? <SingleChoice legend="Budget" options={BUDGETS} value={draft.budget} onChange={(budget) => patch({ budget })} /> : null}
      {step === 2 && kind === "seller" ? (
        <>
          <SingleChoice legend="When do you want to move?" options={TIMELINES} value={draft.timeline} onChange={(timeline) => patch({ timeline })} />
          <SingleChoice legend="What is prompting this?" options={MOTIVATIONS} value={draft.motivation} onChange={(motivation) => patch({ motivation })} />
          <SingleChoice legend="Who lives there now?" options={OCCUPANCY} value={draft.occupancy} onChange={(occupancy) => patch({ occupancy })} />
        </>
      ) : null}

      {step === 3 && kind === "buyer" ? (
        <>
          <SingleChoice legend="Timing" options={TIMELINES} value={draft.timeline} onChange={(timeline) => patch({ timeline })} />
          <SingleChoice legend="Financing" options={FINANCING} value={draft.financing} onChange={(financing) => patch({ financing })} />
        </>
      ) : null}
      {step === 3 && kind === "seller" ? (
        <>
          <p className="hint">A number is optional. The first conversation can cover price.</p>
          <SingleChoice legend="What do you think it would sell for?" options={SELLER_PRICES} value={draft.price} onChange={(price) => patch({ price })} optional />
        </>
      ) : null}

      {step === 4 ? (
        <>
          <Review kind={kind} draft={draft} />
          <div className="split-fields">
            <Field label="First name" value={draft.firstName} onChange={(firstName) => patch({ firstName })} autoComplete="given-name" />
            <Field label="Last name" value={draft.lastName} onChange={(lastName) => patch({ lastName })} autoComplete="family-name" />
          </div>
          <Field label="Email" value={draft.email} onChange={(email) => patch({ email })} autoComplete="email" type="email" />
          <Field label="Phone" value={draft.phone} onChange={(phone) => patch({ phone })} autoComplete="tel" type="tel" />
          <SingleChoice legend="Best way to reach you" options={CONTACTS} value={draft.preferredContact} onChange={(preferredContact) => patch({ preferredContact })} />
          <Field label="Anything else" value={draft.notes} onChange={(notes) => patch({ notes })} hint={draft.area === "other" || draft.areas.includes("other") ? "Name the town." : "Optional. A commute, a deadline, a tenant."} multiline />
          <label className="check">
            <input type="checkbox" checked={draft.consent} onChange={(event) => patch({ consent: event.target.checked })} />
            <span>I want to be contacted about this Greater Boston inquiry. This is not an agreement to buy or sell, and it is not an appraisal.</span>
          </label>
        </>
      ) : null}

      <div className="hp" aria-hidden="true">
        <label>
          Company website
          <input tabIndex={-1} autoComplete="off" value={draft.companyWebsite} onChange={(event) => patch({ companyWebsite: event.target.value })} />
        </label>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="wizard-actions">
        {step > 0 ? (
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setError("");
              setStep((current) => current - 1);
            }}
          >
            Back
          </button>
        ) : null}
        {step < steps.length - 1 ? (
          <button type="button" className="button" onClick={failOrAdvance}>
            Continue
          </button>
        ) : (
          <button type="submit" className="button" disabled={pending}>
            {pending ? "Sending…" : kind === "seller" ? "Request a pricing conversation" : "Send my search"}
          </button>
        )}
      </div>
    </form>
  );
}

function AreaPicker({ selected, onToggle, multiple = false }: { selected: string[]; onToggle: (slug: string) => void; multiple?: boolean }) {
  return (
    <fieldset>
      <legend>{multiple ? "Where in Greater Boston?" : "Where is the property?"}</legend>
      {multiple ? <p className="hint">Choose up to eight. A shorter list is easier to act on.</p> : null}
      {GROUPS.map((group) => (
        <div key={group} className="area-block">
          <p className="group-label" id={groupId(group)}>
            {group}
          </p>
          <div className="choice-grid">
            {AREAS.filter((area) => area.group === group).map((area) => (
              <button key={area.slug} type="button" className="choice" aria-pressed={selected.includes(area.slug)} onClick={() => onToggle(area.slug)}>
                {area.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}

function SingleChoice({
  legend,
  options,
  value,
  onChange,
  optional = false,
}: {
  legend: string;
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  optional?: boolean;
}) {
  return (
    <fieldset>
      <legend>
        {legend}
        {optional ? <span className="optional"> optional</span> : null}
      </legend>
      <div className="choice-grid">
        {options.map((option) => (
          <button key={option.id} type="button" className="choice" aria-pressed={value === option.id} onClick={() => onChange(value === option.id && optional ? "" : option.id)}>
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function MultiChoice({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: readonly { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="choice-grid">
        {options.map((option) => (
          <button key={option.id} type="button" className="choice" aria-pressed={selected.includes(option.id)} onClick={() => onToggle(option.id)}>
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  type = "text",
  autoComplete,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  type?: string;
  autoComplete?: string;
  multiline?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      {multiline ? (
        <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} rows={4} maxLength={2000} />
      ) : (
        <input id={id} type={type} value={value} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} maxLength={160} />
      )}
      {hint ? <small className="hint">{hint}</small> : null}
    </label>
  );
}

function Review({ kind, draft }: { kind: "buyer" | "seller"; draft: Draft }) {
  const places = kind === "buyer" ? draft.areas.map((slug) => getArea(slug)?.name ?? slug).join(", ") : [getArea(draft.area)?.name, draft.address].filter(Boolean).join(" · ");
  const facts =
    kind === "buyer"
      ? [labelOf(BUDGETS, draft.budget), labelOf(BEDS, draft.beds) && `${labelOf(BEDS, draft.beds)} bed`, draft.propertyTypes.map((id) => labelOf(PROPERTY_TYPES, id)).join(", "), labelOf(TIMELINES, draft.timeline), labelOf(FINANCING, draft.financing)]
      : [labelOf(PROPERTY_TYPES, draft.propertyType), labelOf(BEDS, draft.bedsSeller) && `${labelOf(BEDS, draft.bedsSeller)} bed`, labelOf(TIMELINES, draft.timeline), labelOf(MOTIVATIONS, draft.motivation), labelOf(SELLER_PRICES, draft.price)];
  return (
    <div className="review">
      <p className="group-label">Check this before you send</p>
      <p>{places}</p>
      <p>{facts.filter(Boolean).join(" · ")}</p>
    </div>
  );
}
