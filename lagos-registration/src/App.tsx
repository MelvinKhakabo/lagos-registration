import { useMemo, useState } from "react";
import "./index.css";
import { supabase } from "./lib/supabase";

declare global {
  interface Window {
    PaystackPop?: new () => {
      newTransaction: (options: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        reference: string;
        metadata?: Record<string, unknown>;
        onSuccess: (response: { reference: string }) => void;
        onCancel: () => void;
      }) => void;
    };
  }
}

type ProgramType = "summer-camp" | "specialty-classes";
type PreferredContactMethod = "" | "whatsapp" | "email" | "phone_call";

type FormData = {
  studentName: string;
  studentAge: string;
  currentSchool: string;
  parentName: string;
  parentEmail: string;
  parentWhatsapp: string;
  preferredContactMethod: PreferredContactMethod;
  hasSiblings: boolean;
  siblingCount: string;
  siblingDetails: string;
};

type SpecialtyClass = {
  id: string;
  name: string;
  ageLabel: string;
  priceUsd: number;
  options: {
    id: string;
    label: string;
    time: string;
  }[];
};

const EXCHANGE_RATE = 1380;
const SUMMER_WEEK_PRICE_USD = 100;
const SPECIALTY_PRICE_USD = 90;
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

const initialFormData: FormData = {
  studentName: "",
  studentAge: "",
  currentSchool: "",
  parentName: "",
  parentEmail: "",
  parentWhatsapp: "",
  preferredContactMethod: "",
  hasSiblings: false,
  siblingCount: "",
  siblingDetails: "",
};

const summerWeeks = [
  { id: "week-1", label: "Week 1", dates: "July 6 – July 10", priceUsd: 100 },
  { id: "week-2", label: "Week 2", dates: "July 13 – July 17", priceUsd: 100 },
  { id: "week-3", label: "Week 3", dates: "July 20 – July 24", priceUsd: 100 },
  { id: "week-4", label: "Week 4", dates: "July 27 – July 31", priceUsd: 100 },
  { id: "week-5", label: "Week 5", dates: "August 3 – August 7", priceUsd: 100 },
  { id: "week-6", label: "Week 6", dates: "August 10 – August 14", priceUsd: 100 },
];

const specialtyClasses: SpecialtyClass[] = [
  {
    id: "speak-like-ted",
    name: "Speak like TED",
    ageLabel: "Ages 12–14",
    priceUsd: 90,
    options: [
      {
        id: "ted-july-6",
        label: "Week of July 6",
        time: "1:00 PM – 2:30 PM WAT",
      },
    ],
  },
  {
    id: "kpop-songwriting",
    name: "K-pop Songwriting",
    ageLabel: "Ages 13+",
    priceUsd: 90,
    options: [
      {
        id: "kpop-july-13",
        label: "Week of July 13",
        time: "1:30 PM – 2:30 PM WAT",
      },
      {
        id: "kpop-july-20",
        label: "Week of July 20",
        time: "1:30 PM – 2:30 PM WAT",
      },
    ],
  },
  {
    id: "music-production-afrobeats",
    name: "Music Production (Afrobeats)",
    ageLabel: "Ages 13+",
    priceUsd: 90,
    options: [
      {
        id: "afrobeats-july-27",
        label: "Week of July 27",
        time: "9:00 AM – 10:30 AM WAT",
      },
    ],
  },
];

function formatCurrency(amount: number, currency: "USD" | "NGN") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "NGN" ? 0 : 2,
  }).format(amount);
}

function App() {
  const [programType, setProgramType] = useState<ProgramType>("summer-camp");
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([]);
  const [selectedSpecialtyClass, setSelectedSpecialtyClass] = useState("");
  const [selectedSpecialtyOption, setSelectedSpecialtyOption] = useState("");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedClass = specialtyClasses.find(
    (item) => item.id === selectedSpecialtyClass
  );

  const selectedSpecialtyOptionData = selectedClass?.options.find(
    (option) => option.id === selectedSpecialtyOption
  );

  const totalUsd = useMemo(() => {
    if (programType === "summer-camp") {
      return selectedWeeks.length * SUMMER_WEEK_PRICE_USD;
    }

    return selectedSpecialtyClass && selectedSpecialtyOption
      ? SPECIALTY_PRICE_USD
      : 0;
  }, [programType, selectedWeeks, selectedSpecialtyClass, selectedSpecialtyOption]);

  const totalNgn = totalUsd * EXCHANGE_RATE;

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((current) => ({
      ...current,
      [key]: "",
    }));
  }

  function toggleWeek(weekId: string) {
    setSelectedWeeks((current) =>
      current.includes(weekId)
        ? current.filter((id) => id !== weekId)
        : [...current, weekId]
    );

    setErrors((current) => ({
      ...current,
      selectedWeeks: "",
    }));
  }

  function handleProgramChange(value: ProgramType) {
    setProgramType(value);
    setSelectedWeeks([]);
    setSelectedSpecialtyClass("");
    setSelectedSpecialtyOption("");
    setErrors({});
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};

    if (!formData.studentName.trim()) nextErrors.studentName = "Student name is required.";
    if (!formData.studentAge.trim()) nextErrors.studentAge = "Student age is required.";
    else if (Number(formData.studentAge) <= 0) nextErrors.studentAge = "Enter a valid age.";

    if (!formData.currentSchool.trim()) nextErrors.currentSchool = "Current school is required.";
    if (!formData.parentName.trim()) nextErrors.parentName = "Parent/guardian name is required.";

    if (!formData.parentEmail.trim()) {
      nextErrors.parentEmail = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.parentEmail)) {
      nextErrors.parentEmail = "Enter a valid email address.";
    }

    if (!formData.parentWhatsapp.trim()) nextErrors.parentWhatsapp = "WhatsApp number is required.";
    if (!formData.preferredContactMethod) nextErrors.preferredContactMethod = "Choose a preferred contact method.";

    if (programType === "summer-camp" && selectedWeeks.length === 0) {
      nextErrors.selectedWeeks = "Select at least one Summer Camp week.";
    }

    if (programType === "summer-camp" && formData.hasSiblings) {
      if (!formData.siblingCount.trim()) {
        nextErrors.siblingCount = "Enter the number of siblings attending.";
      }
      if (!formData.siblingDetails.trim()) {
        nextErrors.siblingDetails = "Enter sibling names and ages.";
      }
    }

    if (programType === "specialty-classes") {
      if (!selectedSpecialtyClass) nextErrors.selectedSpecialtyClass = "Select a specialty class.";
      if (!selectedSpecialtyOption) nextErrors.selectedSpecialtyOption = "Select a week/session.";
    }

    if (totalUsd <= 0) {
      nextErrors.total = "Please choose a valid program option before payment.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function saveRegistrationAfterPayment(reference: string, amountInKobo: number) {
    const { data: programData, error: programError } = await supabase
      .from("programs")
      .select("id, slug")
      .eq("slug", programType)
      .single();

    if (programError || !programData) {
      throw programError || new Error("Program not found");
    }

    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .insert({
        program_id: programData.id,
        student_name: formData.studentName,
        student_age: Number(formData.studentAge),
        current_school: formData.currentSchool,
        parent_name: formData.parentName,
        parent_email: formData.parentEmail,
        parent_whatsapp: formData.parentWhatsapp,
        preferred_contact_method: formData.preferredContactMethod,
        has_siblings: formData.hasSiblings,
        sibling_count: Number(formData.siblingCount || 0),
        total_usd: totalUsd,
        exchange_rate_used: EXCHANGE_RATE,
        total_ngn: totalNgn,
        paystack_amount_subunit: amountInKobo,
        payment_status: "paid",
        paystack_reference: reference,
      })
      .select()
      .single();

    if (regError || !registration) {
      throw regError || new Error("Failed to create registration");
    }

    if (programType === "summer-camp") {
      const { data: weeksData, error: weeksError } = await supabase
        .from("summer_camp_weeks")
        .select("id, week_number");

      if (weeksError) throw weeksError;

      const selectedWeekRows = weeksData?.filter((week) =>
        selectedWeeks.includes(`week-${week.week_number}`)
      );

      if (selectedWeekRows?.length) {
        const { error: weekInsertError } = await supabase
          .from("registration_summer_weeks")
          .insert(
            selectedWeekRows.map((week) => ({
              registration_id: registration.id,
              summer_camp_week_id: week.id,
            }))
          );

        if (weekInsertError) throw weekInsertError;
      }
    }

    if (programType === "specialty-classes") {
      const { data: classData, error: classError } = await supabase
        .from("specialty_classes")
        .select("id")
        .eq("slug", selectedSpecialtyClass)
        .single();

      if (classError || !classData) {
        throw classError || new Error("Specialty class not found");
      }

      const { data: optionData, error: optionError } = await supabase
        .from("specialty_class_options")
        .select("id")
        .eq("specialty_class_id", classData.id)
        .eq("label", selectedSpecialtyOptionData?.label)
        .single();

      if (optionError || !optionData) {
        throw optionError || new Error("Specialty option not found");
      }

      const { error: specialtyInsertError } = await supabase
        .from("registration_specialty_options")
        .insert({
          registration_id: registration.id,
          specialty_class_id: classData.id,
          specialty_class_option_id: optionData.id,
        });

      if (specialtyInsertError) throw specialtyInsertError;
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      registration_id: registration.id,
      reference,
      status: "paid",
      amount_ngn: totalNgn,
      amount_usd: totalUsd,
      exchange_rate_used: EXCHANGE_RATE,
      provider: "paystack",
      paid_at: new Date().toISOString(),
    });

    if (paymentError) throw paymentError;
  }

  function handleContinueToPayment() {
    const isValid = validateForm();

    if (!isValid) {
      document
        .getElementById("register")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (!PAYSTACK_PUBLIC_KEY) {
      alert("Paystack public key is missing. Please check your .env.local file.");
      return;
    }

    if (!window.PaystackPop) {
      alert("Paystack script has not loaded. Please refresh the page and try again.");
      return;
    }

    const reference = `LS-LAGOS-${Date.now()}`;
    const amountInKobo = Math.round(totalNgn * 100);

    const selectedSummerWeeks = summerWeeks.filter((week) =>
      selectedWeeks.includes(week.id)
    );

    const paystack = new window.PaystackPop();

    paystack.newTransaction({
      key: PAYSTACK_PUBLIC_KEY,
      email: formData.parentEmail,
      amount: amountInKobo,
      currency: "NGN",
      reference,
      metadata: {
        program_type: programType,
        student_name: formData.studentName,
        student_age: formData.studentAge,
        current_school: formData.currentSchool,
        parent_name: formData.parentName,
        parent_email: formData.parentEmail,
        parent_whatsapp: formData.parentWhatsapp,
        preferred_contact_method: formData.preferredContactMethod,
        has_siblings: formData.hasSiblings,
        sibling_count: formData.siblingCount || "0",
        sibling_details: formData.siblingDetails,
        total_usd: totalUsd,
        exchange_rate: EXCHANGE_RATE,
        total_ngn: totalNgn,
        selected_weeks: selectedSummerWeeks.map((week) => ({
          id: week.id,
          label: week.label,
          dates: week.dates,
        })),
        selected_specialty_class: selectedClass
          ? {
              id: selectedClass.id,
              name: selectedClass.name,
            }
          : null,
        selected_specialty_option: selectedSpecialtyOptionData
          ? {
              id: selectedSpecialtyOptionData.id,
              label: selectedSpecialtyOptionData.label,
              time: selectedSpecialtyOptionData.time,
            }
          : null,
      },
      onSuccess: async (response) => {
        try {
          await saveRegistrationAfterPayment(response.reference, amountInKobo);
          window.location.href = `/thank-you?reference=${response.reference}`;
        } catch (error) {
          console.error(error);
          alert("Payment succeeded but saving failed. Please contact support.");
        }
      },
      onCancel: () => {
        alert("Payment window closed. You can try again when ready.");
      },
    });
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Learning Sprouts Lagos</p>
          <h1>Summer Camp & Specialty Classes Registration</h1>
          <p className="hero-text">
            Register for our Lagos Summer Camp or online Specialty Classes.
            Pricing is shown in USD and can be completed in NGN.
          </p>
          <a href="#register" className="primary-button">
            Register Now
          </a>
        </div>
      </section>

      <section className="section program-grid">
        <article className="program-card">
          <span className="tag">In-person</span>
          <h2>Summer Camp</h2>
          <p>Math, AI/Coding, and Fun Sciences from July 6 to August 14.</p>
          <strong>$100 per week</strong>
        </article>

        <article className="program-card">
          <span className="tag">Online</span>
          <h2>Specialty Classes</h2>
          <p>
            Focused online classes in speaking, songwriting, and music
            production.
          </p>
          <strong>$90 per class</strong>
        </article>
      </section>

      <section id="register" className="section registration-layout">
        <form className="registration-form">
          <div>
            <p className="eyebrow">Registration</p>
            <h2>Choose your program</h2>
          </div>

          <div className="choice-grid">
            <button
              type="button"
              className={`choice-card ${programType === "summer-camp" ? "selected" : ""}`}
              onClick={() => handleProgramChange("summer-camp")}
            >
              <strong>Summer Camp</strong>
              <span>$100 per selected week</span>
            </button>

            <button
              type="button"
              className={`choice-card ${programType === "specialty-classes" ? "selected" : ""}`}
              onClick={() => handleProgramChange("specialty-classes")}
            >
              <strong>Specialty Classes</strong>
              <span>$90 per class</span>
            </button>
          </div>

          <div className="form-grid">
            <label>
              Student name
              <input
                type="text"
                placeholder="Student full name"
                value={formData.studentName}
                onChange={(event) => updateField("studentName", event.target.value)}
              />
              {errors.studentName && <span className="error-text">{errors.studentName}</span>}
            </label>

            <label>
              Student age
              <input
                type="number"
                min="1"
                placeholder="Age"
                value={formData.studentAge}
                onChange={(event) => updateField("studentAge", event.target.value)}
              />
              {errors.studentAge && <span className="error-text">{errors.studentAge}</span>}
            </label>

            <label className="full-span">
              Current school
              <input
                type="text"
                placeholder="School name"
                value={formData.currentSchool}
                onChange={(event) => updateField("currentSchool", event.target.value)}
              />
              {errors.currentSchool && <span className="error-text">{errors.currentSchool}</span>}
            </label>

            <label>
              Parent/guardian name
              <input
                type="text"
                placeholder="Parent full name"
                value={formData.parentName}
                onChange={(event) => updateField("parentName", event.target.value)}
              />
              {errors.parentName && <span className="error-text">{errors.parentName}</span>}
            </label>

            <label>
              Parent email
              <input
                type="email"
                placeholder="parent@email.com"
                value={formData.parentEmail}
                onChange={(event) => updateField("parentEmail", event.target.value)}
              />
              {errors.parentEmail && <span className="error-text">{errors.parentEmail}</span>}
            </label>

            <label>
              WhatsApp number
              <input
                type="tel"
                placeholder="+234..."
                value={formData.parentWhatsapp}
                onChange={(event) => updateField("parentWhatsapp", event.target.value)}
              />
              {errors.parentWhatsapp && <span className="error-text">{errors.parentWhatsapp}</span>}
            </label>

            <label>
              Preferred contact method
              <select
                value={formData.preferredContactMethod}
                onChange={(event) =>
                  updateField(
                    "preferredContactMethod",
                    event.target.value as PreferredContactMethod
                  )
                }
              >
                <option value="" disabled>
                  Select one
                </option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="phone_call">Phone call</option>
              </select>
              {errors.preferredContactMethod && (
                <span className="error-text">{errors.preferredContactMethod}</span>
              )}
            </label>
          </div>

          {programType === "summer-camp" && (
            <div className="form-section">
              <h3>Select Summer Camp weeks</h3>
              <p className="muted">You can select multiple weeks and pay once.</p>

              {errors.selectedWeeks && <p className="error-text">{errors.selectedWeeks}</p>}

              <div className="week-grid">
                {summerWeeks.map((week) => (
                  <button
                    type="button"
                    key={week.id}
                    className={`week-card ${selectedWeeks.includes(week.id) ? "selected" : ""}`}
                    onClick={() => toggleWeek(week.id)}
                  >
                    <strong>{week.label}</strong>
                    <span>{week.dates}</span>
                    <small>{formatCurrency(week.priceUsd, "USD")}</small>
                  </button>
                ))}
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={formData.hasSiblings}
                  onChange={(event) => updateField("hasSiblings", event.target.checked)}
                />
                Sibling(s) will also attend camp
              </label>

              {formData.hasSiblings && (
                <div className="form-grid sibling-fields">
                  <label>
                    Number of siblings
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 1"
                      value={formData.siblingCount}
                      onChange={(event) => updateField("siblingCount", event.target.value)}
                    />
                    {errors.siblingCount && <span className="error-text">{errors.siblingCount}</span>}
                  </label>

                  <label className="full-span">
                    Sibling names and ages
                    <textarea
                      placeholder="Example: Ada, 10; Timi, 8"
                      value={formData.siblingDetails}
                      onChange={(event) => updateField("siblingDetails", event.target.value)}
                    />
                    {errors.siblingDetails && <span className="error-text">{errors.siblingDetails}</span>}
                  </label>
                </div>
              )}
            </div>
          )}

          {programType === "specialty-classes" && (
            <div className="form-section">
              <h3>Select Specialty Class</h3>

              {errors.selectedSpecialtyClass && (
                <p className="error-text">{errors.selectedSpecialtyClass}</p>
              )}

              <div className="specialty-list">
                {specialtyClasses.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`specialty-card ${
                      selectedSpecialtyClass === item.id ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedSpecialtyClass(item.id);
                      setSelectedSpecialtyOption("");
                      setErrors((current) => ({
                        ...current,
                        selectedSpecialtyClass: "",
                        selectedSpecialtyOption: "",
                      }));
                    }}
                  >
                    <strong>{item.name}</strong>
                    <span>{item.ageLabel}</span>
                    <small>{formatCurrency(item.priceUsd, "USD")}</small>
                  </button>
                ))}
              </div>

              {selectedClass && (
                <label className="session-select">
                  Choose week / session
                  <select
                    value={selectedSpecialtyOption}
                    onChange={(event) => {
                      setSelectedSpecialtyOption(event.target.value);
                      setErrors((current) => ({
                        ...current,
                        selectedSpecialtyOption: "",
                      }));
                    }}
                  >
                    <option value="">Select an option</option>
                    {selectedClass.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label} · {option.time}
                      </option>
                    ))}
                  </select>
                  {errors.selectedSpecialtyOption && (
                    <span className="error-text">{errors.selectedSpecialtyOption}</span>
                  )}
                </label>
              )}
            </div>
          )}
        </form>

        <aside className="payment-summary">
          <p className="eyebrow">Payment summary</p>
          <h2>{formatCurrency(totalUsd, "USD")}</h2>
          <p className="muted">Converted at $1 = ₦{EXCHANGE_RATE}</p>

          <div className="summary-line">
            <span>Amount due</span>
            <strong>{formatCurrency(totalNgn, "NGN")}</strong>
          </div>

          {errors.total && <p className="error-text">{errors.total}</p>}

          <button
            type="button"
            className="primary-button full-button"
            onClick={handleContinueToPayment}
          >
            Continue to Payment
          </button>

          <p className="summary-note">
            Payment will be completed securely through Paystack.
          </p>
        </aside>
      </section>
    </main>
  );
}

export default App;