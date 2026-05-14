import { useMemo, useState } from "react";
import "./index.css";
import { supabase } from "./lib/supabase";
import { FiGlobe, FiMail } from "react-icons/fi";
import { FaInstagram } from "react-icons/fa";

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
    id: "public-speaking-lab",
    name: "Public Speaking Lab",
    ageLabel: "Ages 12–18",
    priceUsd: 90,
    options: [
      { id: "public-speaking-12-14", label: "Ages 12–14", time: "1:00 PM – 2:30 PM WAT" },
      { id: "public-speaking-15-18", label: "Ages 15–18", time: "3:00 PM – 4:30 PM WAT" },
    ],
  },
  {
    id: "kpop-songwriting",
    name: "K-pop Songwriting",
    ageLabel: "Ages 13+",
    priceUsd: 90,
    options: [
      { id: "kpop-july-13", label: "Week of July 13", time: "1:30 PM – 2:30 PM WAT" },
      { id: "kpop-july-20", label: "Week of July 20", time: "1:30 PM – 2:30 PM WAT" },
    ],
  },
  {
    id: "music-production-afrobeats",
    name: "Music Production (Afrobeats)",
    ageLabel: "Ages 13+",
    priceUsd: 90,
    options: [
      { id: "afrobeats-july-27", label: "Week of July 27", time: "9:00 AM – 10:30 AM WAT" },
    ],
  },
];

const hardSkills = [
  {
    icon: "📐",
    title: "Math Hackathon",
    descriptionJsx: (
      <>
        Not your typical math! <em>Example themes</em>: There is a flood in your city! As the mayor, how do you use math concepts to optimally distribute emergency supplies to your people?
      </>
    ),
  },
  {
    icon: "🔬",
    title: "Fun Sciences",
    descriptionJsx: (
      <>
        Discover the wonder of the natural world through experiments, investigations, and curiosity-driven exploration of biology, chemistry, and physics.
      </>
    ),
  },
  {
    icon: "💻",
    title: "Artificial Intelligence Hackathon",
    descriptionJsx: (
      <>
        Who says kids are too young to solve big world problems? <em>Example themes</em>: How can AI help doctors in rural areas diagnose diseases faster? Every week's class culminates in an actual AI hackathon challenge.
      </>
    ),
  },
];

const softSkills = [
  {
    icon: "🎤",
    title: "Public Speaking Lab",
    descriptionJsx: (
      <>
        <strong>Taught by:</strong> Ms. Helena — CEO &amp; Founder of Learning Sprouts, Harvard University graduate, and 4x TEDx/TEDxYouth coach.
      </>
    ),
  },
  {
    icon: "🎵",
    title: "K-pop Songwriting",
    descriptionJsx: (
      <>
        <strong>Taught by:</strong> Shorelle — internationally recognized songwriter whose credits include BTS, TWICE, ITZY, LE SSERAFIM, and the Winter Olympics.
      </>
    ),
  },
  {
    icon: "🎧",
    title: "Afrobeats Music Production",
    descriptionJsx: (
      <>
        <strong>Taught by:</strong> Pascal Bill — music arranger/director behind projects for Grammy-winning band, Sauti Sol and Kenya's national celebrations. Students will create Burna Boy-style tracks from scratch.
      </>
    ),
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
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [programType, setProgramType] = useState<ProgramType>("summer-camp");
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([]);
  const [selectedSpecialtyClass, setSelectedSpecialtyClass] = useState("");
  const [selectedSpecialtyOption, setSelectedSpecialtyOption] = useState("");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedClass = specialtyClasses.find((item) => item.id === selectedSpecialtyClass);
  const selectedSpecialtyOptionData = selectedClass?.options.find(
    (option) => option.id === selectedSpecialtyOption
  );

  const childCount =
    programType === "summer-camp" && formData.hasSiblings
      ? 1 + Number(formData.siblingCount || 0)
      : 1;

  const totalUsd = useMemo(() => {
    if (programType === "summer-camp") {
      return selectedWeeks.length * SUMMER_WEEK_PRICE_USD * childCount;
    }
    return selectedSpecialtyClass && selectedSpecialtyOption ? SPECIALTY_PRICE_USD : 0;
  }, [programType, selectedWeeks, selectedSpecialtyClass, selectedSpecialtyOption, childCount]);


  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function handleProgramChange(value: ProgramType) {
    setProgramType(value);
    setSelectedWeeks([]);
    setSelectedSpecialtyClass("");
    setSelectedSpecialtyOption("");
    setErrors({});
  }

  function openRegistration(value: ProgramType) {
    handleProgramChange(value);
    setIsRegistrationOpen(true);
  }

  function toggleWeek(weekId: string) {
    setSelectedWeeks((current) =>
      current.includes(weekId) ? current.filter((id) => id !== weekId) : [...current, weekId]
    );
    setErrors((current) => ({ ...current, selectedWeeks: "" }));
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};

    if (!formData.studentName.trim()) nextErrors.studentName = "Student name is required.";
    if (!formData.studentAge.trim()) nextErrors.studentAge = "Student age is required.";
    else if (Number(formData.studentAge) <= 0) nextErrors.studentAge = "Enter a valid age.";
    if (!formData.currentSchool.trim()) nextErrors.currentSchool = "School name is required.";
    if (!formData.parentName.trim()) nextErrors.parentName = "Parent/guardian name is required.";
    if (!formData.parentEmail.trim()) nextErrors.parentEmail = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(formData.parentEmail))
      nextErrors.parentEmail = "Enter a valid email address.";
    if (!formData.parentWhatsapp.trim()) nextErrors.parentWhatsapp = "WhatsApp number is required.";
    if (!formData.preferredContactMethod)
      nextErrors.preferredContactMethod = "Choose a preferred contact method.";

    if (programType === "summer-camp" && selectedWeeks.length === 0)
      nextErrors.selectedWeeks = "Select at least one Summer Camp week.";

    if (programType === "summer-camp" && formData.hasSiblings) {
      if (!formData.siblingCount.trim())
        nextErrors.siblingCount = "Enter the number of siblings attending.";
      else if (Number(formData.siblingCount) <= 0)
        nextErrors.siblingCount = "Enter at least 1 sibling.";
      if (!formData.siblingDetails.trim())
        nextErrors.siblingDetails = "Enter sibling names and ages.";
    }

    if (programType === "specialty-classes") {
      if (!selectedSpecialtyClass) nextErrors.selectedSpecialtyClass = "Select a specialty class.";
      if (!selectedSpecialtyOption) nextErrors.selectedSpecialtyOption = "Select a week/session.";
    }

    if (totalUsd <= 0) nextErrors.total = "Please choose a valid program option before payment.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function saveRegistrationAfterPayment(reference: string, amountInUsdCents: number) {
    const { data: programData, error: programError } = await supabase
      .from("programs")
      .select("id, slug")
      .eq("slug", programType)
      .single();

    if (programError || !programData) throw programError || new Error("Program not found");

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
        paystack_amount_subunit: amountInUsdCents,
        payment_status: "paid",
        paystack_reference: reference,
      })
      .select()
      .single();

    if (regError || !registration) throw regError || new Error("Failed to create registration");

    if (programType === "summer-camp") {
      const { data: weeksData, error: weeksError } = await supabase
        .from("summer_camp_weeks")
        .select("id, week_number");

      if (weeksError) throw weeksError;

      const selectedWeekRows = weeksData?.filter((week) =>
        selectedWeeks.includes(`week-${week.week_number}`)
      );

      if (selectedWeekRows?.length) {
        const { error } = await supabase.from("registration_summer_weeks").insert(
          selectedWeekRows.map((week) => ({
            registration_id: registration.id,
            summer_camp_week_id: week.id,
          }))
        );
        if (error) throw error;
      }
    }

    if (programType === "specialty-classes") {
      const { data: classData, error: classError } = await supabase
        .from("specialty_classes")
        .select("id")
        .eq("slug", selectedSpecialtyClass)
        .single();

      if (classError || !classData) throw classError || new Error("Specialty class not found");

      const { data: optionData, error: optionError } = await supabase
        .from("specialty_class_options")
        .select("id")
        .eq("specialty_class_id", classData.id)
        .eq("label", selectedSpecialtyOptionData?.label)
        .single();

      if (optionError || !optionData) throw optionError || new Error("Specialty option not found");

      const { error } = await supabase.from("registration_specialty_options").insert({
        registration_id: registration.id,
        specialty_class_id: classData.id,
        specialty_class_option_id: optionData.id,
      });
      if (error) throw error;
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      registration_id: registration.id,
      reference,
      status: "paid",
      amount_usd: totalUsd,
      provider: "paystack",
      paid_at: new Date().toISOString(),
    });

    if (paymentError) throw paymentError;
  }

  function handleContinueToPayment() {
    if (!validateForm()) return;

    if (!PAYSTACK_PUBLIC_KEY) {
      alert("Paystack public key is missing. Please check your .env.local file.");
      return;
    }

    if (!window.PaystackPop) {
      alert("Paystack script has not loaded. Please refresh the page and try again.");
      return;
    }

    const reference = `LS-LAGOS-${Date.now()}`;
    const amountInUsdCents = Math.round(totalUsd * 100);
    const selectedSummerWeeks = summerWeeks.filter((week) => selectedWeeks.includes(week.id));
    const paystack = new window.PaystackPop();

    paystack.newTransaction({
      key: PAYSTACK_PUBLIC_KEY,
      email: formData.parentEmail,
      amount: amountInUsdCents,
      currency: "USD",
      reference,
      metadata: {
        program_type: programType,
        student_name: formData.studentName,
        parent_name: formData.parentName,
        parent_email: formData.parentEmail,
        parent_whatsapp: formData.parentWhatsapp,
        child_count: childCount,
        charge_currency: "USD",
        total_usd: totalUsd,
        selected_weeks: selectedSummerWeeks,
        selected_specialty_class: selectedClass,
        selected_specialty_option: selectedSpecialtyOptionData,
      },
      onSuccess: async (response) => {
        try {
          await saveRegistrationAfterPayment(response.reference, amountInUsdCents);
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
      {/* ── HERO ── */}
      <section className="hero">
        <p className="eyebrow">Learning Sprouts Lagos</p>
        <div className="hero-body">
          <h1 className="hero-headline">
            Future Skills.<br />Real&nbsp;Growth.
          </h1>
          <p className="hero-sub">
            Learning Sprouts is a Kenya-based future skills training provider founded by <strong>Harvard University</strong> graduates. We offer research-driven programs that help students build academic excellence, creativity, leadership, and real-world problem-solving skills.
          </p>
          <p className="hero-sub">
            As part of our expansion into West Africa, we are launching our <strong>first pilot summer program in Lagos</strong> — with in-person programs in Mathematics, Science, and AI/Coding, alongside online specialty classes in Public Speaking, K-pop Songwriting, and Afrobeats Music Production open to students worldwide.
          </p>
          <p className="hero-sub">
            Learning Sprouts is also partnering with <strong>Princeton University</strong> Mathematics Club to bring <strong>Africa's first Princeton University Mathematics Competition</strong>, giving students access to a globally recognized problem-solving platform.
          </p>
          <div className="hero-cta">
            <a href="#register" className="hero-cta-btn">Register Here</a>
          </div>
        </div>
      </section>

      {/* ── CURRICULUM ── */}
      <section className="curriculum-section">
        <div className="section-label">What you'll learn</div>
        <h2 className="section-title">Explore our Learning Paths</h2>
        <p className="section-sub">
          Sign Up 1 Week At a Time. Online Classes Open to Students Worldwide.
        </p>

        <div className="skills-block">
          <div className="skills-group">
            <div className="skills-group-header">
              <span className="skills-badge hard">Hard Skills</span>
              <span className="skills-meta">In-person · Lagos · July 6 – Aug 14</span>
            </div>
            <div className="skills-grid">
              {hardSkills.map((s) => (
                <div className="skill-card" key={s.title}>
                  <span className="skill-icon">{s.icon}</span>
                  <h3 className="skill-title"><strong>{s.title}</strong></h3>
                  <p className="skill-desc">{s.descriptionJsx}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="skills-group">
            <div className="skills-group-header">
              <span className="skills-badge soft">Soft Skills</span>
              <span className="skills-meta">Online · Flexible schedule</span>
            </div>
            <div className="skills-grid">
              {softSkills.map((s) => (
                <div className="skill-card" key={s.title}>
                  <span className="skill-icon">{s.icon}</span>
                  <h3 className="skill-title"><strong>{s.title}</strong></h3>
                  <p className="skill-desc">{s.descriptionJsx}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── REGISTRATION ── */}
      <section className="register-section" id="register">
        <div className="section-label">Enroll now</div>
        <h2 className="section-title">Register for the Program of Your Choice</h2>
        <p className="section-sub">
          Select the program that fits your child's interests. You can register for the
          Summer Camp, Specialty Classes, or both.
        </p>

        <div className="program-selection">
          <article className="program-card">
            <span className="tag">In-person · Lagos</span>
            <h2>Summer Camp</h2>
            <p>
              A 6-week in-person experience with Math, AI/Coding, and Fun Sciences.
              Register weekly or choose multiple weeks in one payment.
            </p>
            <div className="detail-grid">
              <div className="detail-row">
                <span>July 6 – Aug 14</span>
                <span className="detail-sep">/</span>
                <span>$100 per week</span>
              </div>
              <div className="detail-row">
                <span>Math</span>
                <span className="detail-sep">·</span>
                <span>Fun Sciences</span>
                <span className="detail-sep">·</span>
                <span>AI/Coding</span>
              </div>
            </div>
            <button type="button" className="primary-button card-button" onClick={() => openRegistration("summer-camp")}>
              Register for Summer Camp
            </button>
          </article>

          <article className="program-card program-card--alt">
            <span className="tag">Online</span>
            <h2>Specialty Classes</h2>
            <p>
              Focused online classes for students interested in public speaking,
              songwriting, and Afrobeats music production.
            </p>
            <div className="detail-grid">
              <div className="detail-row">
                <span>$90 per specialty class</span>
              </div>
              <div className="detail-row">
                <span>Public Speaking Lab</span>
                <span className="detail-sep">·</span>
                <span>K-pop Songwriting</span>
                <span className="detail-sep">·</span>
                <span>Music Production</span>
              </div>
            </div>
            <button type="button" className="primary-button card-button" onClick={() => openRegistration("specialty-classes")}>
              Register for Specialty Classes
            </button>
          </article>
        </div>
      </section>

      {/* ── MODAL ── */}
      {isRegistrationOpen && (
        <div className="modal-backdrop">
          <section className="registration-modal registration-layout">
            <form className="registration-form">
              <button type="button" className="modal-close" onClick={() => setIsRegistrationOpen(false)}>×</button>

              <p className="eyebrow">Registration</p>
              <h2>{programType === "summer-camp" ? "Register for Summer Camp" : "Register for Specialty Classes"}</h2>

              <div className="form-grid">
                <label>
                  Student Name
                  <input value={formData.studentName} onChange={(e) => updateField("studentName", e.target.value)} placeholder="Student full name" />
                  {errors.studentName && <span className="error-text">{errors.studentName}</span>}
                </label>

                <label>
                  Student Age
                  <input type="number" value={formData.studentAge} onChange={(e) => updateField("studentAge", e.target.value)} placeholder="Age" />
                  {errors.studentAge && <span className="error-text">{errors.studentAge}</span>}
                </label>

                <label className="full-span">
                  School Name
                  <input value={formData.currentSchool} onChange={(e) => updateField("currentSchool", e.target.value)} placeholder="School Name" />
                  {errors.currentSchool && <span className="error-text">{errors.currentSchool}</span>}
                </label>

                <label>
                  Parent/Guardian Name
                  <input value={formData.parentName} onChange={(e) => updateField("parentName", e.target.value)} placeholder="Parent full name" />
                  {errors.parentName && <span className="error-text">{errors.parentName}</span>}
                </label>

                <label>
                  Parent Email
                  <input type="email" value={formData.parentEmail} onChange={(e) => updateField("parentEmail", e.target.value)} placeholder="parent@email.com" />
                  {errors.parentEmail && <span className="error-text">{errors.parentEmail}</span>}
                </label>

                <label>
                  WhatsApp Number
                  <input value={formData.parentWhatsapp} onChange={(e) => updateField("parentWhatsapp", e.target.value)} placeholder="+234..." />
                  {errors.parentWhatsapp && <span className="error-text">{errors.parentWhatsapp}</span>}
                </label>

                <label>
                  Preferred Contact Method
                  <select value={formData.preferredContactMethod} onChange={(e) => updateField("preferredContactMethod", e.target.value as PreferredContactMethod)}>
                    <option value="" disabled>Select one</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="phone_call">Phone call</option>
                  </select>
                  {errors.preferredContactMethod && <span className="error-text">{errors.preferredContactMethod}</span>}
                </label>
              </div>

              {programType === "summer-camp" && (
                <div className="form-section">
                  <h3>Select Summer Camp weeks</h3>
                  {errors.selectedWeeks && <p className="error-text">{errors.selectedWeeks}</p>}
                  <div className="week-grid">
                    {summerWeeks.map((week) => (
                      <button key={week.id} type="button" className={`week-card ${selectedWeeks.includes(week.id) ? "selected" : ""}`} onClick={() => toggleWeek(week.id)}>
                        <strong>{week.label}</strong>
                        <div className="week-meta">
                          <span>{week.dates}</span>
                          <small>{formatCurrency(week.priceUsd, "USD")}</small>
                        </div>
                      </button>
                    ))}
                  </div>

                  <label className="checkbox-row">
                    <input type="checkbox" checked={formData.hasSiblings} onChange={(e) => updateField("hasSiblings", e.target.checked)} />
                    Sibling(s) will also attend camp
                  </label>

                  {formData.hasSiblings && (
                    <div className="form-grid sibling-fields">
                      <label>
                        Number of Siblings
                        <input type="number" min="1" value={formData.siblingCount} onChange={(e) => updateField("siblingCount", e.target.value)} placeholder="e.g. 1" />
                        {errors.siblingCount && <span className="error-text">{errors.siblingCount}</span>}
                      </label>
                      <label className="full-span">
                        Sibling Names and Ages
                        <textarea value={formData.siblingDetails} onChange={(e) => updateField("siblingDetails", e.target.value)} placeholder="Example: Ada, 10; Timi, 8" />
                        {errors.siblingDetails && <span className="error-text">{errors.siblingDetails}</span>}
                      </label>
                    </div>
                  )}
                </div>
              )}

              {programType === "specialty-classes" && (
                <div className="form-section">
                  <h3>Select Specialty Class</h3>
                  {errors.selectedSpecialtyClass && <p className="error-text">{errors.selectedSpecialtyClass}</p>}
                  <div className="specialty-list">
                    {specialtyClasses.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`specialty-card ${selectedSpecialtyClass === item.id ? "selected" : ""}`}
                        onClick={() => { setSelectedSpecialtyClass(item.id); setSelectedSpecialtyOption(""); }}
                      >
                        <strong>{item.name}</strong>
                        <div className="week-meta">
                          <span>{item.ageLabel}</span>
                          <small>{formatCurrency(item.priceUsd, "USD")}</small>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedClass && (
                    <label className="session-select">
                      Choose Week/Session
                      <select value={selectedSpecialtyOption} onChange={(e) => setSelectedSpecialtyOption(e.target.value)}>
                        <option value="">Select an option</option>
                        {selectedClass.options.map((option) => (
                          <option key={option.id} value={option.id}>{option.label} · {option.time}</option>
                        ))}
                      </select>
                      {errors.selectedSpecialtyOption && <span className="error-text">{errors.selectedSpecialtyOption}</span>}
                    </label>
                  )}
                </div>
              )}
            </form>

            <aside className="payment-summary">
              <p className="eyebrow">Payment summary</p>
              <h2>{formatCurrency(totalUsd, "USD")}</h2>
              {programType === "summer-camp" && <p className="muted">Children included: {childCount}</p>}
              <div className="summary-line">
                <span>Amount charged</span>
                <strong>{formatCurrency(totalUsd, "USD")}</strong>
              </div>
              {errors.total && <p className="error-text">{errors.total}</p>}
              <button type="button" className="primary-button full-button" onClick={handleContinueToPayment}>
                Continue to Payment
              </button>
              <p className="summary-note">
                Payment will be processed securely in USD through Paystack.
              </p>
            </aside>
          </section>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <p className="footer-brand">Learning Sprouts Lagos</p>
        <div className="trust-strip">
          <a href="https://www.instagram.com/learningsprouts_?igsh=MTJjcm5xaHU1ejh2ZA==" target="_blank" rel="noreferrer" className="trust-pill">
            <FaInstagram size={16} /><span>Instagram</span>
          </a>
          <a href="https://learningsprouts.school/" target="_blank" rel="noreferrer" className="trust-pill">
            <FiGlobe size={16} /><span>Website</span>
          </a>
          <a href="mailto:ask@learningsprouts.school" className="trust-pill">
            <FiMail size={16} /><span>Email</span>
          </a>
        </div>
        <p className="footer-copy">© {new Date().getFullYear()} Learning Sprouts. All rights reserved.</p>
      </footer>
    </main>
  );
}

export default App;

