 "use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";

interface DonationType {
  id: number;
  name: string;
  category: string;
  description: string;
  is_mandatory: boolean;
  is_active: boolean;
  deadline: string | null;
  target_amount: string | null;
}

const sectionConfig: Record<
  string,
  { title: string; description: string; categoryFilter: string | null }
> = {
  ishrakaat: {
    title: "Ishrakaat",
    description: "Core donation campaigns and ongoing projects.",
    categoryFilter: "PROJECT",
  },
  "zakah-sadaqah": {
    title: "Zakah & Sadaqah",
    description: "Obligatory and voluntary charity campaigns.",
    categoryFilter: "MONTHLY",
  },
  waqf: {
    title: "Waqf",
    description: "Endowments and longer term projects.",
    categoryFilter: "PROJECT",
  },
  tabararaat: {
    title: "Tabararaat",
    description: "Voluntary contributions and gifts.",
    categoryFilter: null,
  },
  aqsah: {
    title: "Aqsah",
    description: "Special causes and emergencies.",
    categoryFilter: "IMPROMPTU",
  },
  welfare: {
    title: "Welfare",
    description: "Support for families and communities.",
    categoryFilter: null,
  },
};

export default function SectionPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const config = sectionConfig[slug] ?? sectionConfig.ishrakaat;
  const isWelfare = slug === "welfare";
  const isAqsah = slug === "aqsah";
  const isWaqf = slug === "waqf";

  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<DonationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [donatingId, setDonatingId] = useState<number | null>(null);
  const [donationAmount, setDonationAmount] = useState<Record<number, string>>(
    {}
  );
  const [donationMessage, setDonationMessage] = useState("");
  const [adoptionType, setAdoptionType] = useState<"orphan" | "widow">(
    "orphan"
  );
  const [applicantName, setApplicantName] = useState("");
  const [applicantAddress, setApplicantAddress] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [ref1Name, setRef1Name] = useState("");
  const [ref1Address, setRef1Address] = useState("");
  const [ref1Phone, setRef1Phone] = useState("");
  const [ref2Name, setRef2Name] = useState("");
  const [ref2Address, setRef2Address] = useState("");
  const [ref2Phone, setRef2Phone] = useState("");
  const [interestMessage, setInterestMessage] = useState("");
  const [welfareDonationAmount, setWelfareDonationAmount] = useState("");
  const [welfareDonationPurpose, setWelfareDonationPurpose] = useState<
    "ORPHAN" | "WIDOW" | "FAMILY"
  >("ORPHAN");
  const [welfareDonating, setWelfareDonating] = useState(false);

  const [familyNeedPurpose, setFamilyNeedPurpose] = useState<
    "FOOD" | "SCHOOL" | "SHELTER" | "CLOTHING"
  >("FOOD");
  const [familyNeedAmount, setFamilyNeedAmount] = useState("");
  const [familyNeedLoading, setFamilyNeedLoading] = useState(false);

  const [waqfFormOpen, setWaqfFormOpen] = useState(false);
  const [waqfCategory, setWaqfCategory] = useState<"MASJID" | "KNOWLEDGE" | "INCOME">("MASJID");
  const [waqfProjectType, setWaqfProjectType] = useState("");
  const [waqfMethod, setWaqfMethod] = useState<"EXECUTE" | "HANDOVER">("EXECUTE");
  const [waqfOnBehalfOf, setWaqfOnBehalfOf] = useState("");
  const [waqfDate, setWaqfDate] = useState("");
  const [waqfGuestName, setWaqfGuestName] = useState("");
  const [waqfGuestEmail, setWaqfGuestEmail] = useState("");
  const [waqfGuestPhone, setWaqfGuestPhone] = useState("");
  const [waqfNotes, setWaqfAdditionalNotes] = useState("");
  const [waqfSubmitting, setWaqfSubmitting] = useState(false);
  const [waqfMessage, setWaqfMessage] = useState("");

  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDescription, setNewCampaignDescription] = useState("");
  const [newCampaignCategory, setNewCampaignCategory] = useState("");
  const [newCampaignTarget, setNewCampaignTarget] = useState("");
  const [newCampaignDeadline, setNewCampaignDeadline] = useState("");
  const [createCampaignMessage, setCreateCampaignMessage] = useState("");
  const [createCampaignError, setCreateCampaignError] = useState("");
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [campaignsData, me] = await Promise.all([
          apiGet("/donations/campaigns/"),
          apiGet("/auth/me/", true).catch(() => null),
        ]);
        setProfile(me);
        const filtered = config.categoryFilter
          ? (campaignsData as DonationType[]).filter((c) => c.category === config.categoryFilter)
          : (campaignsData as DonationType[]);
        setCampaigns(filtered);
      } catch {
        setError("Could not load campaigns.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [config.categoryFilter]);

  async function handleDonate(campaign: DonationType) {
    const raw = donationAmount[campaign.id] || "";
    const amount = parseFloat(raw || "0");
    setDonationMessage("");
    if (!amount || amount <= 0) {
      setDonationMessage("Enter a valid amount before donating.");
      return;
    }
    setDonatingId(campaign.id);
    try {
      await apiPost(
        "/donations/transactions/",
        {
          amount,
          transaction_type: "DONATION",
          donation_type: campaign.id,
          description: `Donation to ${campaign.name}`,
        },
        true
      );
      setDonationMessage("Donation recorded from your Money Box.");
      setDonationAmount((prev) => ({ ...prev, [campaign.id]: "" }));
    } catch {
      setDonationMessage(
        "Could not process donation. Ensure you are signed in and have enough balance."
      );
    } finally {
      setDonatingId(null);
    }
  }

  async function handleWelfareDonation() {
    const amount = parseFloat(welfareDonationAmount || "0");
    setDonationMessage("");
    if (!amount || amount <= 0) {
      setDonationMessage("Enter a valid amount for welfare donation.");
      return;
    }
    const targetCampaign = campaigns[0];
    if (!targetCampaign) {
      setDonationMessage("No welfare campaign is available to receive this donation.");
      return;
    }
    setWelfareDonating(true);
    try {
      await apiPost(
        "/donations/transactions/",
        {
          amount,
          transaction_type: "DONATION",
          donation_type: targetCampaign.id,
          description:
            welfareDonationPurpose === "ORPHAN"
              ? "Donation for orphans"
              : welfareDonationPurpose === "WIDOW"
              ? "Donation for widows"
              : "Donation for needy families",
        },
        true
      );
      setDonationMessage("Welfare donation recorded from your Money Box.");
      setWelfareDonationAmount("");
    } catch {
      setDonationMessage(
        "Could not process welfare donation. Ensure you are signed in and have enough balance."
      );
    } finally {
      setWelfareDonating(false);
    }
  }

  async function handleFamilyNeedDonation() {
    const raw = familyNeedAmount || "";
    const amount = parseFloat(raw || "0");
    setDonationMessage("");
    if (!amount || amount <= 0) {
      setDonationMessage("Enter a valid amount for family need donation.");
      return;
    }
    setFamilyNeedLoading(true);
    try {
      await apiPost(
        "/donations/welfare/family/",
        {
          amount,
          purpose: familyNeedPurpose,
        },
        true
      );
      setDonationMessage("Family need donation recorded from your Money Box.");
      setFamilyNeedAmount("");
    } catch {
      setDonationMessage(
        "Could not process family need donation. Ensure you are signed in and have enough balance."
      );
    } finally {
      setFamilyNeedLoading(false);
    }
  }

  async function handleCreateCampaign(e: FormEvent) {
    e.preventDefault();
    setCreateCampaignMessage("");
    setCreateCampaignError("");

    if (!newCampaignName.trim()) {
      setCreateCampaignError("Enter a short title for the campaign.");
      return;
    }

    const categoryToUse = config.categoryFilter || newCampaignCategory;
    if (!categoryToUse) {
      setCreateCampaignError("Please select a category for the campaign.");
      return;
    }

    let target: number | null = null;
    if (newCampaignTarget.trim()) {
      const parsed = parseFloat(newCampaignTarget.trim());
      if (!parsed || parsed <= 0) {
        setCreateCampaignError("Enter a valid target amount or leave it empty.");
        return;
      }
      target = parsed;
    }

    const deadline =
      newCampaignDeadline.trim() !== ""
        ? `${newCampaignDeadline.trim()}T23:59:59`
        : null;

    setCreatingCampaign(true);
    try {
      const created: DonationType = await apiPost(
        "/donations/campaigns/",
        {
          name: newCampaignName.trim(),
          category: categoryToUse,
          description: newCampaignDescription.trim(),
          is_mandatory: false,
          is_active: true,
          deadline,
          target_amount: target,
        },
        true // REQUIRED: Authentication for admin actions
      );
      setCampaigns((prev) => [created, ...prev]);
      setNewCampaignName("");
      setNewCampaignDescription("");
      setNewCampaignTarget("");
      setNewCampaignDeadline("");
      setNewCampaignCategory("");
      setCreateCampaignMessage(`${config.title} campaign created.`);
    } catch {
      setCreateCampaignError(
        "Could not create campaign. Ensure you are signed in as admin."
      );
    } finally {
      setCreatingCampaign(false);
    }
  }

  async function handleWaqfSubmit(e: FormEvent) {
    e.preventDefault();
    setWaqfMessage("");
    setWaqfSubmitting(true);

    try {
      await apiPost(
        "/donations/waqf/interest/",
        {
          waqf_category: waqfCategory,
          project_type: waqfProjectType,
          contribution_method: waqfMethod,
          on_behalf_of: waqfOnBehalfOf,
          preferred_date: waqfDate,
          guest_name: waqfGuestName,
          guest_email: waqfGuestEmail,
          guest_phone: waqfGuestPhone,
          additional_notes: waqfNotes,
        },
        false // Allow guest
      );
      setWaqfMessage("Your interest has been recorded. We will reach out soon.");
      // Reset form
      setWaqfProjectType("");
      setWaqfOnBehalfOf("");
      setWaqfDate("");
      setWaqfGuestName("");
      setWaqfGuestEmail("");
      setWaqfGuestPhone("");
      setWaqfAdditionalNotes("");
    } catch (err: any) {
      setWaqfMessage(err.message || "Could not submit form. Please check mandatory fields.");
    } finally {
      setWaqfSubmitting(false);
    }
  }

  function handleInterestSubmit(e: FormEvent) {
    e.preventDefault();
    setInterestMessage("");
    if (
      !applicantName ||
      !applicantPhone ||
      !ref1Name ||
      !ref1Phone ||
      !ref2Name ||
      !ref2Phone
    ) {
      setInterestMessage(
        "Fill all required fields including two referees with phone numbers."
      );
      return;
    }
    setInterestMessage(
      adoptionType === "orphan"
        ? "Orphan adoption interest form captured."
        : "Widow marriage interest form captured."
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 px-4 pb-6 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-300">
            Ishrakaat
          </p>
          <p className="text-base md:text-lg font-semibold text-slate-50">
            {config.title}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-200"
        >
          Home
        </Link>
      </header>

      <main className="flex-1 space-y-3">
        <p className="text-xs md:text-sm text-slate-300">
          {config.description}
        </p>

        {isWaqf && (
        <section className="rounded-2xl border border-violet-500/40 bg-violet-950/30 p-4 text-sm space-y-3">
          <div className="space-y-1">
            <p className="text-xs md:text-[13px] font-semibold uppercase tracking-[0.24em] text-violet-300">
              Waqf endowments
            </p>
            <p className="text-sm text-slate-200">
              Waqf here focuses on assets and projects that keep serving over
              many years: masjid infrastructure, learning spaces, income
              generating properties and long-term welfare.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={() => {
                setWaqfCategory("MASJID");
                setWaqfFormOpen(true);
              }}
              className="text-left rounded-xl border border-violet-500/50 bg-slate-950 px-4 py-3 active:scale-[0.98] transition-transform"
            >
              <p className="text-sm font-semibold text-violet-100">
                Masjid and centres
              </p>
              <p className="mt-1 text-xs md:text-sm text-violet-50/80">
                Land, masjid buildings, boreholes and learning centres that
                remain waqf for the community.
              </p>
            </button>
            <button
              onClick={() => {
                setWaqfCategory("KNOWLEDGE");
                setWaqfFormOpen(true);
              }}
              className="text-left rounded-xl border border-emerald-500/40 bg-slate-950 px-4 py-3 active:scale-[0.98] transition-transform"
            >
              <p className="text-sm font-semibold text-emerald-100">
                Knowledge and scholarships
              </p>
              <p className="mt-1 text-xs md:text-sm text-emerald-50/80">
                Endowments that fund students, teachers, books and da&apos;wah
                activities year after year.
              </p>
            </button>
            <button
              onClick={() => {
                setWaqfCategory("INCOME");
                setWaqfFormOpen(true);
              }}
              className="text-left rounded-xl border border-amber-500/40 bg-slate-950 px-4 py-3 active:scale-[0.98] transition-transform"
            >
              <p className="text-sm font-semibold text-amber-100">
                Income waqf projects
              </p>
              <p className="mt-1 text-xs md:text-sm text-amber-50/80">
                Shops, farms or other assets whose profit is locked as sadaqat
                jariyah for agreed causes.
              </p>
            </button>
          </div>

          {waqfFormOpen && (
            <form
              onSubmit={handleWaqfSubmit}
              className="mt-4 space-y-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 animate-in fade-in slide-in-from-top-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">
                  Waqf Interest Form:{" "}
                  {waqfCategory === "MASJID"
                    ? "Masjid and centres"
                    : waqfCategory === "KNOWLEDGE"
                    ? "Knowledge and scholarships"
                    : "Income waqf projects"}
                </p>
                <button
                  type="button"
                  onClick={() => setWaqfFormOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">
                    What would you like to contribute?
                  </label>
                  <select
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
                    value={waqfProjectType}
                    onChange={(e) => setWaqfProjectType(e.target.value)}
                  >
                    <option value="">Select an option</option>
                    {waqfCategory === "MASJID" && (
                      <>
                        <option value="Land">Land for Masjid/Centre</option>
                        <option value="Masjid Building">Masjid Building</option>
                        <option value="Borehole">Borehole / Water Well</option>
                        <option value="Learning Centre">Learning Centre</option>
                      </>
                    )}
                    {waqfCategory === "KNOWLEDGE" && (
                      <>
                        <option value="Scholarship Fund">Scholarship Fund</option>
                        <option value="Teacher Salary Support">Teacher Support</option>
                        <option value="Books/Curriculum">Books and Curriculum</option>
                        <option value="Da'wah Materials">Da&apos;wah Materials</option>
                      </>
                    )}
                    {waqfCategory === "INCOME" && (
                      <>
                        <option value="Shop/Commercial Space">Commercial Shop</option>
                        <option value="Farm/Agricultural Land">Farm Land</option>
                        <option value="Rental Property">Rental Property</option>
                        <option value="Equipment">Income-generating Equipment</option>
                      </>
                    )}
                    <option value="Other">Other (specify in notes)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">
                    Contribution method
                  </label>
                  <select
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
                    value={waqfMethod}
                    onChange={(e) => setWaqfMethod(e.target.value as any)}
                  >
                    <option value="EXECUTE">Project Execution Request (Do in my name)</option>
                    <option value="HANDOVER">Asset Handover (Surrender to Ishrakaat)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">
                    On behalf of (Name)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Late Parents, Self, Family"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
                    value={waqfOnBehalfOf}
                    onChange={(e) => setWaqfOnBehalfOf(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">
                    Target Date
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
                    value={waqfDate}
                    onChange={(e) => setWaqfDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">
                    Full Name (Mandatory)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
                    value={waqfGuestName}
                    onChange={(e) => setWaqfGuestName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">
                    Phone Number (Mandatory)
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Phone"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
                    value={waqfGuestPhone}
                    onChange={(e) => setWaqfGuestPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  Email Address (Mandatory)
                </label>
                <input
                  type="email"
                  required
                  placeholder="email@example.com"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
                  value={waqfGuestEmail}
                  onChange={(e) => setWaqfGuestEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  Additional Notes
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
                  rows={2}
                  placeholder="Any extra details or preferences..."
                  value={waqfNotes}
                  onChange={(e) => setWaqfAdditionalNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={waqfSubmitting}
                className="w-full rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-60"
              >
                {waqfSubmitting ? "Submitting..." : "Submit Waqf Interest"}
              </button>

              {waqfMessage && (
                <p className={`text-xs text-center ${waqfMessage.includes("recorded") ? "text-emerald-400" : "text-rose-400"}`}>
                  {waqfMessage}
                </p>
              )}
            </form>
          )}

          <div className="border-t border-slate-800 pt-3 space-y-2 text-xs md:text-sm text-slate-300">
            <p>
              Use the waqf campaigns listed below to direct your contribution
              to specific long-term projects. Each donation is recorded from
              your Money Box history so you can track your endowment
              commitments.
            </p>
            <p>
              You can also set a monthly amount on your dashboard and let the
              system keep funding selected waqf campaigns regularly from your
              balance.
            </p>
          </div>
        </section>
      )}

        {profile?.is_staff && (
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Admin: Create new {config.title} campaign
            </p>
            <form onSubmit={handleCreateCampaign} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                  placeholder="Campaign Title"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                />
                {!config.categoryFilter && (
                  <select
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                    value={newCampaignCategory}
                    onChange={(e) => setNewCampaignCategory(e.target.value)}
                  >
                    <option value="">Select Category</option>
                    <option value="PROJECT">Specific Project</option>
                    <option value="MONTHLY">Monthly Recurring</option>
                    <option value="IMPROMPTU">Impromptu / Emergency</option>
                  </select>
                )}
                <input
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                  placeholder="Target Amount (Optional)"
                  type="number"
                  value={newCampaignTarget}
                  onChange={(e) => setNewCampaignTarget(e.target.value)}
                />
              </div>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                placeholder="Campaign Description"
                rows={2}
                value={newCampaignDescription}
                onChange={(e) => setNewCampaignDescription(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] text-slate-400 uppercase tracking-wider">
                    Deadline (Optional)
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                    type="date"
                    value={newCampaignDeadline}
                    onChange={(e) => setNewCampaignDeadline(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingCampaign}
                  className="mt-5 h-10 rounded-full bg-slate-50 px-6 text-sm font-semibold text-slate-950 active:scale-[0.97] disabled:opacity-60"
                >
                  {creatingCampaign ? "Creating..." : "Create Campaign"}
                </button>
              </div>
              {createCampaignMessage && (
                <p className="text-[11px] text-emerald-400">
                  {createCampaignMessage}
                </p>
              )}
              {createCampaignError && (
                <p className="text-[11px] text-rose-400">
                  {createCampaignError}
                </p>
              )}
            </form>
          </section>
        )}

        {isWelfare && (
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm space-y-3">
            <div className="space-y-1">
              <p className="text-xs md:text-[13px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Welfare focus
              </p>
              <p className="text-sm text-slate-200">
                Support is organized around orphans, widows, and families that
                need help.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-100">
                  Orphans
                </p>
                <p className="mt-1 text-xs md:text-sm text-emerald-50/80">
                  Adoption interest and ongoing support for orphans.
                </p>
              </div>
              <div className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-sky-100">
                  Widows
                </p>
                <p className="mt-1 text-xs md:text-sm text-sky-50/80">
                  Marriage interest and material support for widows.
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-amber-100">
                  Families
                </p>
                <p className="mt-1 text-xs md:text-sm text-amber-50/80">
                  Poor families that need regular assistance.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 space-y-3">
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <button
                  type="button"
                  onClick={() => setAdoptionType("orphan")}
                  className={`rounded-full px-3 py-1 border ${
                    adoptionType === "orphan"
                      ? "bg-emerald-500 text-slate-950 border-emerald-500"
                      : "bg-slate-900 text-slate-200 border-slate-700"
                  }`}
                >
                  Orphan adoption form
                </button>
                <button
                  type="button"
                  onClick={() => setAdoptionType("widow")}
                  className={`rounded-full px-3 py-1 border ${
                    adoptionType === "widow"
                      ? "bg-emerald-500 text-slate-950 border-emerald-500"
                      : "bg-slate-900 text-slate-200 border-slate-700"
                  }`}
                >
                  Widow marriage form
                </button>
              </div>

              <form
                onSubmit={handleInterestSubmit}
                className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3"
              >
                <p className="text-xs md:text-sm font-semibold text-slate-100 mb-2">
                  {adoptionType === "orphan"
                    ? "Orphan adoption interest"
                    : "Widow marriage interest"}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-xs md:text-sm text-slate-300 mb-1">
                      Your full name
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs md:text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs md:text-sm text-slate-300 mb-1">
                      Phone number
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs md:text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                      value={applicantPhone}
                      onChange={(e) => setApplicantPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs md:text-sm text-slate-300 mb-1">
                    Address
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs md:text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                    value={applicantAddress}
                    onChange={(e) => setApplicantAddress(e.target.value)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs md:text-sm font-semibold text-slate-200">
                      Referee 1
                    </p>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs md:text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                      placeholder="Name"
                      value={ref1Name}
                      onChange={(e) => setRef1Name(e.target.value)}
                    />
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs md:text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                      placeholder="Address"
                      value={ref1Address}
                      onChange={(e) => setRef1Address(e.target.value)}
                    />
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs md:text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                      placeholder="Phone number"
                      value={ref1Phone}
                      onChange={(e) => setRef1Phone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs md:text-sm font-semibold text-slate-200">
                      Referee 2
                    </p>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs md:text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                      placeholder="Name"
                      value={ref2Name}
                      onChange={(e) => setRef2Name(e.target.value)}
                    />
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs md:text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                      placeholder="Address"
                      value={ref2Address}
                      onChange={(e) => setRef2Address(e.target.value)}
                    />
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs md:text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                      placeholder="Phone number"
                      value={ref2Phone}
                      onChange={(e) => setRef2Phone(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs md:text-sm font-semibold text-slate-950 active:scale-[0.97]"
                >
                  Submit interest form
                </button>

                {interestMessage && (
                  <p className="text-xs md:text-sm text-emerald-300 mt-1">
                    {interestMessage}
                  </p>
                )}
              </form>

              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 space-y-2">
                <p className="text-sm font-semibold text-slate-100">
                  Welfare donation portal
                </p>
                <p className="text-xs md:text-sm text-slate-300">
                  Donate specifically towards orphans, widows, or needy
                  families from your Money Box.
                </p>
                <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                  <button
                    type="button"
                    onClick={() => setWelfareDonationPurpose("ORPHAN")}
                    className={`rounded-full px-3 py-1 border ${
                      welfareDonationPurpose === "ORPHAN"
                        ? "bg-emerald-500 text-slate-950 border-emerald-500"
                        : "bg-slate-900 text-slate-200 border-slate-700"
                    }`}
                  >
                    Orphans
                  </button>
                  <button
                    type="button"
                    onClick={() => setWelfareDonationPurpose("WIDOW")}
                    className={`rounded-full px-3 py-1 border ${
                      welfareDonationPurpose === "WIDOW"
                        ? "bg-emerald-500 text-slate-950 border-emerald-500"
                        : "bg-slate-900 text-slate-200 border-slate-700"
                    }`}
                  >
                    Widows
                  </button>
                  <button
                    type="button"
                    onClick={() => setWelfareDonationPurpose("FAMILY")}
                    className={`rounded-full px-3 py-1 border ${
                      welfareDonationPurpose === "FAMILY"
                        ? "bg-emerald-500 text-slate-950 border-emerald-500"
                        : "bg-slate-900 text-slate-200 border-slate-700"
                    }`}
                  >
                    Needy families
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs md:text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                    type="number"
                    min="0"
                    placeholder="Amount from Money Box"
                    value={welfareDonationAmount}
                    onChange={(e) => setWelfareDonationAmount(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleWelfareDonation}
                    disabled={welfareDonating}
                    className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs md:text-sm font-semibold text-slate-950 active:scale-[0.97] disabled:opacity-60"
                  >
                    {welfareDonating ? "Processing..." : "Donate"}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 space-y-2">
                <p className="text-sm font-semibold text-amber-100">
                  Family needs (food, school, shelter, clothing)
                </p>
                <p className="text-xs md:text-sm text-amber-50/90">
                  Pick the specific family need and send an amount from your
                  Money Box or your paystack account or 8079823665 opay idrees
                  ademola oladimeji. Each payment is recorded.
                </p>
                <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                  <button
                    type="button"
                    onClick={() => setFamilyNeedPurpose("FOOD")}
                    className={`rounded-full px-3 py-1 border ${
                      familyNeedPurpose === "FOOD"
                        ? "bg-amber-400 text-slate-950 border-amber-300"
                        : "bg-slate-900 text-slate-200 border-slate-700"
                    }`}
                  >
                    Food
                  </button>
                  <button
                    type="button"
                    onClick={() => setFamilyNeedPurpose("SCHOOL")}
                    className={`rounded-full px-3 py-1 border ${
                      familyNeedPurpose === "SCHOOL"
                        ? "bg-amber-400 text-slate-950 border-amber-300"
                        : "bg-slate-900 text-slate-200 border-slate-700"
                    }`}
                  >
                    School package
                  </button>
                  <button
                    type="button"
                    onClick={() => setFamilyNeedPurpose("SHELTER")}
                    className={`rounded-full px-3 py-1 border ${
                      familyNeedPurpose === "SHELTER"
                        ? "bg-amber-400 text-slate-950 border-amber-300"
                        : "bg-slate-900 text-slate-200 border-slate-700"
                    }`}
                  >
                    Shelter / house rent
                  </button>
                  <button
                    type="button"
                    onClick={() => setFamilyNeedPurpose("CLOTHING")}
                    className={`rounded-full px-3 py-1 border ${
                      familyNeedPurpose === "CLOTHING"
                        ? "bg-amber-400 text-slate-950 border-amber-300"
                        : "bg-slate-900 text-slate-200 border-slate-700"
                    }`}
                  >
                    Clothing
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs md:text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                    type="number"
                    min="0"
                    placeholder="Amount from Money Box"
                    value={familyNeedAmount}
                    onChange={(e) => setFamilyNeedAmount(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleFamilyNeedDonation}
                    disabled={familyNeedLoading}
                    className="rounded-full bg-amber-400 px-4 py-1.5 text-xs md:text-sm font-semibold text-slate-950 active:scale-[0.97] disabled:opacity-60"
                  >
                    {familyNeedLoading ? "Processing..." : "Family need"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {loading && (
          <p className="text-xs text-slate-400">Loading campaigns...</p>
        )}

        {error && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <p className="text-xs text-slate-400">
            No campaigns available yet in this section.
          </p>
        )}

        {donationMessage && (
          <p className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-2">
            {donationMessage}
          </p>
        )}

        <div className="space-y-2">
          {campaigns.map((campaign) => {
            const isImpromptu = campaign.category === "IMPROMPTU";
            return (
              <div
                key={campaign.id}
                className={`rounded-2xl border p-3 text-xs ${
                  isImpromptu
                    ? "border-red-500/70 bg-red-950/40"
                    : "border-slate-800 bg-slate-950/70"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-50">
                    {campaign.name}
                  </p>
                  <span
                    className={
                      isImpromptu
                        ? "rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-semibold text-slate-50 border border-red-300 animate-pulse"
                        : "rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-800"
                    }
                  >
                    {isImpromptu ? "Emergency • Aqsah" : campaign.category}
                  </span>
                </div>
                {campaign.description && (
                  <p className="mb-2 text-sm text-slate-200">
                    {campaign.description}
                  </p>
                )}
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>
                      Target:{" "}
                      {campaign.target_amount
                        ? `₦${Number(
                            campaign.target_amount
                          ).toLocaleString()}`
                        : "Not set"}
                    </span>
                    {campaign.deadline && (
                      <span>
                        Deadline:{" "}
                        {new Date(
                          campaign.deadline
                        ).toLocaleDateString("en-NG")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                      type="number"
                      min="0"
                      placeholder="Amount from Money Box"
                      value={donationAmount[campaign.id] || ""}
                      onChange={(e) =>
                        setDonationAmount((prev) => ({
                          ...prev,
                          [campaign.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      onClick={() => handleDonate(campaign)}
                      disabled={donatingId === campaign.id}
                      className="rounded-full bg-emerald-500 px-3 py-1 text-sm font-semibold text-slate-950 active:scale-[0.97] disabled:opacity-60"
                    >
                      {donatingId === campaign.id ? "Processing..." : "Donate"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
