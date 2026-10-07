import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Dashboard from "./page/Dashboard";
import {
  getStoredEmployees,
  saveActivatedPassword,
  verifyActivatedPassword
} from "./lib/employeeStorage";
import {
  Users, ChevronDown, Globe, ArrowRight, LayoutDashboard, MessageSquare,
  Calendar, FileText, ShieldCheck, Building2, Clock, DollarSign, UserCheck,
  Award, CheckCircle2, Zap, Crown, LogIn, Menu, X, Mail, Lock, Eye,
  EyeOff, Sparkles, AlertCircle, RefreshCw
} from "lucide-react";

const PHRASES = ["Employee App", "Human Resources System"];

const PARENT_COMPANY = {
  name: "Simpal Group of Companies",
  category: "Parent & Holding Enterprise",
  desc: "The primary corporate holding and parent entity managing all subsidiaries, corporate operations, and multi-industry ventures.",
  logoUrl: "/logos/SGC.png",
  tag: "Parent Group / Holding Entity"
};

const SUBSIDIARY_COMPANIES = [
  ["Simpal Construction (SIMCON)", "Construction & Infrastructure", "Building with Vision, Quality, and Pride. Heavy construction and field operations.", "/logos/SIM.png", "Construction"],
  ["Lucky Betplay Corporation", "Gaming & Entertainment", "Gaming operations and entertainment services across regional branches.", "/logos/LB.png", "Gaming"],
  ["5A Royal Gaming OPC", "Gaming & Entertainment", "One Person Corporation gaming venture under group executive oversight.", "/logos/5A.png", "Gaming"],
  ["Glowing Fortune", "Gaming & Entertainment", "Fortune, hospitality, and entertainment gaming enterprise.", "/logos/GLOW.png", "Gaming"],
  ["Imperial Gaming OPC", "Gaming & Entertainment", "One Person Corporation specialized in leisure and gaming operations within the group.", "/logos/IMP.png", "Gaming"]
].map(([name, category, desc, logoUrl, tag]) => ({ name, category, desc, logoUrl, tag }));

const demoCredentials = {
  email: "admin@hrhub.com",
  password: "admin123"
};

const Feature = ({ icon: Icon, children, emerald = false }) => (
  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-center gap-2">
    <Icon size={16} className={emerald ? "text-emerald-500" : "text-slate-700"} />
    {children}
  </div>
);

const Logo = ({ src, alt, fallback = "LOGO", parent = false }) => (
  <div className={`${parent ? "w-24 h-24 p-3 rounded-2xl" : "w-14 h-14 p-2 rounded-xl"} bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0 overflow-hidden`}>
    <img
      src={src}
      alt={alt}
      className="max-h-full max-w-full object-contain"
      onError={e => {
        e.currentTarget.onerror = null;
        e.currentTarget.parentElement.innerHTML =
          `<span class="${parent ? "text-slate-900 font-black" : "text-slate-400 font-bold"} text-xs text-center">${fallback}</span>`;
      }}
    />
  </div>
);

const App = () => {
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard"); // "dashboard" | "directory"
  const [currentUser, setCurrentUser] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authTab, setAuthTab] = useState("signin"); // "signin" | "activate" | "forgot"
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [loginError, setLoginError] = useState("");
  const [authSuccessNotice, setAuthSuccessNotice] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Check existing Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const email = session.user.email || "user@hrhub.com";
        const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        setCurrentUser({
          id: session.user.id,
          email,
          name,
          role: "HR Administrator",
          is_approved: true,
          source: "supabase"
        });
        setIsLoggedIn(true);
      }
    });
  }, []);

  useEffect(() => {
    const phrase = PHRASES[currentPhraseIndex];
    const delay = isDeleting ? 50 : 100;
    const timer = setTimeout(() => {
      if (!isDeleting && displayedText.length < phrase.length)
        setDisplayedText(phrase.slice(0, displayedText.length + 1));
      else if (!isDeleting)
        setIsDeleting(true);
      else if (displayedText.length)
        setDisplayedText(phrase.slice(0, displayedText.length - 1));
      else {
        setIsDeleting(false);
        setCurrentPhraseIndex(i => (i + 1) % PHRASES.length);
      }
    }, !isDeleting && displayedText.length === phrase.length ? 3000 : delay);
    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, currentPhraseIndex]);

  const closeMobile = () => setIsMobileMenuOpen(false);
  const navLink = (href, children, mobile = false) => (
    <a href={href} onClick={mobile ? closeMobile : undefined}
      className={mobile ? "text-sm font-semibold text-slate-700" : "hover:text-slate-900 transition"}>
      {children}
    </a>
  );

  const openLogin = (tab = "signin") => {
    const activeTab = typeof tab === "string" ? tab : "signin";
    setAuthTab(activeTab);
    setLoginError("");
    setAuthSuccessNotice("");
    setForm({ email: "", password: "", confirmPassword: "" });
    setLoginOpen(true);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    const trimmedEmail = form.email.trim();
    const trimmedPassword = form.password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setLoginError("Please enter your email and password.");
      return;
    }

    setLoginError("");
    setAuthSuccessNotice("");
    setIsSubmittingAuth(true);

    try {
      // 1. Authenticate via Supabase Auth (Strict Email + Password verification)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword
      });

      if (authData?.user) {
        // Check HR approval status in profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (profile && profile.is_approved === false) {
          setLoginError("Your account is pending HR approval. Please contact your system administrator.");
          setIsSubmittingAuth(false);
          return;
        }

        const name = authData.user.email
          ? authData.user.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
          : "User";

        setCurrentUser({
          id: authData.user.id,
          email: authData.user.email,
          name,
          role: "HR Administrator",
          is_approved: profile ? profile.is_approved : true,
          source: "supabase"
        });
        setIsLoggedIn(true);
        setLoginOpen(false);
        setForm({ email: "", password: "", confirmPassword: "" });
        return;
      }

      // 2. Demo credentials check (Strict Email + Password verification)
      if (trimmedEmail === demoCredentials.email && trimmedPassword === demoCredentials.password) {
        setCurrentUser({
          id: "demo-admin",
          email: "admin@hrhub.com",
          name: "HR Administrator",
          role: "HR Administrator",
          company: "Simpal Group of Companies",
          is_approved: true,
          source: "demo"
        });
        setIsLoggedIn(true);
        setLoginOpen(false);
        setForm({ email: "", password: "", confirmPassword: "" });
        return;
      }

      // 3. Activated employee password verification
      if (verifyActivatedPassword(trimmedEmail, trimmedPassword)) {
        const stored = getStoredEmployees();
        const effective = stored.find((e) => (e.email || "").toLowerCase() === trimmedEmail.toLowerCase()) || {
          email: trimmedEmail,
          name: trimmedEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          company: "Simpal Group of Companies",
          role: "Team Member",
          is_approved: true
        };

        if (effective.is_approved === false) {
          setLoginError("Your account is pending HR approval. Please contact your system administrator.");
          setIsSubmittingAuth(false);
          return;
        }

        setCurrentUser({
          id: effective.id || `act-${Date.now()}`,
          email: trimmedEmail,
          name: effective.name || trimmedEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          role: effective.role || "Team Member",
          company: effective.company || "Simpal Group of Companies",
          is_approved: true,
          source: "activated"
        });
        setIsLoggedIn(true);
        setLoginOpen(false);
        setForm({ email: "", password: "", confirmPassword: "" });
        return;
      }

      // If password check failed, check if the email exists in profiles or stored directory to provide helpful guidance
      const { data: matchedProfile } = await supabase
        .from("profiles")
        .select("*")
        .ilike("email", trimmedEmail)
        .maybeSingle();

      const storedEmployees = getStoredEmployees();
      const localExists = storedEmployees.some((e) => (e.email || "").toLowerCase() === trimmedEmail.toLowerCase());

      if (matchedProfile || localExists) {
        setLoginError("Invalid password. If this is your first time logging in or you haven't created a password yet, please switch to the 'Activate Account' tab.");
      } else {
        setLoginError("Invalid email or password. Please verify your credentials or use the demo administrator account.");
      }
    } catch (err) {
      console.warn("Auth attempt exception:", err);
      setLoginError("An unexpected error occurred during login. Please try again.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleActivateAccount = async (event) => {
    event.preventDefault();
    const trimmedEmail = form.email.trim();
    const trimmedPassword = form.password.trim();
    const trimmedConfirm = form.confirmPassword.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setLoginError("Please enter your registered email and choose a password.");
      return;
    }

    if (trimmedPassword.length < 6) {
      setLoginError("Password must be at least 6 characters long.");
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      setLoginError("Passwords do not match. Please re-enter your password.");
      return;
    }

    setLoginError("");
    setAuthSuccessNotice("");
    setIsSubmittingAuth(true);

    try {
      // 1. Check if email exists in the company directory (Supabase profiles OR stored employee registry)
      const { data: matchedProfile } = await supabase
        .from("profiles")
        .select("*")
        .ilike("email", trimmedEmail)
        .maybeSingle();

      const storedEmployees = getStoredEmployees();
      const localMatched = storedEmployees.find(
        (e) => (e.email || "").toLowerCase() === trimmedEmail.toLowerCase()
      );
      const effectiveProfile = matchedProfile || localMatched;

      if (!effectiveProfile) {
        setLoginError("This email address is not registered in the HR directory. Please contact your HR Manager to pre-register your account.");
        setIsSubmittingAuth(false);
        return;
      }

      if (effectiveProfile.is_approved === false) {
        setLoginError("Your profile is listed but is currently pending HR approval. Please contact your supervisor.");
        setIsSubmittingAuth(false);
        return;
      }

      // 2. Persist activated password
      saveActivatedPassword(trimmedEmail, trimmedPassword);

      // 3. Attempt Supabase Auth registration in background
      try {
        await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword
        });
      } catch (authErr) {
        console.info("Supabase signUp note:", authErr);
      }

      const name = effectiveProfile.name || trimmedEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      setCurrentUser({
        id: effectiveProfile.id || `act-${Date.now()}`,
        email: trimmedEmail,
        name,
        role: effectiveProfile.role || "Team Member",
        company: effectiveProfile.company || "Simpal Group of Companies",
        is_approved: true,
        source: "activated"
      });
      setIsLoggedIn(true);
      setLoginOpen(false);
      setForm({ email: "", password: "", confirmPassword: "" });
      return;
    } catch (err) {
      console.warn("Activation error:", err);
      setLoginError("An unexpected error occurred during account activation. Please try again.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    const trimmedEmail = form.email.trim();

    if (!trimmedEmail) {
      setLoginError("Please enter your registered email address.");
      return;
    }

    setLoginError("");
    setAuthSuccessNotice("");
    setIsSubmittingAuth(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (error) {
        setLoginError(error.message || "Failed to send reset link. Please verify your email.");
      } else {
        setAuthSuccessNotice("Password reset link has been dispatched! Please check your email inbox (and spam folder) to set a new password.");
      }
    } catch (err) {
      console.warn("Forgot password error:", err);
      setLoginError("Failed to send reset email: " + err.message);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // ignore
    }
    setCurrentUser(null);
    setIsLoggedIn(false);
    setCurrentPage("dashboard");
    setLoginOpen(false);
  };

  if (isLoggedIn) {
    return <Dashboard onLogout={handleLogout} currentUser={currentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-500 selection:text-white">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-emerald-400 font-bold text-xl shadow-md shadow-slate-900/20">H</div>
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">HR<span className="text-emerald-500">Hub</span></span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <div className="relative">
            <button onClick={() => setIsDropdownOpen(v => !v)}
              className="flex items-center gap-1 hover:text-slate-900 transition cursor-pointer py-1">
              Platform <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
                {[
                  ["#pillars", "Core Pillars"],
                  ["#modules", "System Modules"]
                ].map(([href, label]) => (
                  <a key={label} href={href} onClick={() => setIsDropdownOpen(false)}
                    className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600">{label}</a>
                ))}
              </div>
            )}
          </div>
          {navLink("#companies", "Managed Entities")}
          {navLink("#pillars", "Core Features")}
          {navLink("#cta", "Access Portal")}
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={() => openLogin("activate")}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100/90 hover:bg-emerald-50 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-200 transition cursor-pointer"
          >
            <Sparkles size={14} className="text-emerald-600" /> First-Time Setup
          </button>
          <button
            onClick={() => openLogin("signin")}
            className="bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-slate-900/20 cursor-pointer flex items-center gap-2"
          >
            <LogIn size={15} /> Member Login
          </button>
        </div>

        <button className="md:hidden text-slate-700 hover:text-slate-900 focus:outline-none" onClick={() => setIsMobileMenuOpen(v => !v)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 shadow-xl md:hidden">
            {navLink("#companies", "Managed Entities", true)}
            {navLink("#pillars", "Core Features", true)}
            {navLink("#cta", "Access Portal", true)}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <button onClick={() => openLogin("activate")} className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 flex items-center gap-1">
                <Sparkles size={13} /> Setup
              </button>
              <button onClick={() => openLogin("signin")} className="bg-slate-900 text-emerald-400 font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5">
                <LogIn size={14} /> Login
              </button>
            </div>
          </div>
        )}
      </nav>

      <section className="max-w-7xl mx-auto px-6 pt-12 pb-16 md:pt-16 md:pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center text-xs font-bold tracking-wider text-emerald-700 uppercase bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full min-h-8">
            {displayedText}<span className="animate-pulse ml-0.5 text-emerald-500 font-normal">|</span>
          </span>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">Unifying Multi-Company HR Operations</h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
            HRHub delivers centralized payroll, attendance, and employee management across <strong className="text-slate-900">Simpal Group of Companies</strong> and its diverse subsidiaries in construction and gaming.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button onClick={() => openLogin("signin")} className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3.5 rounded-xl transition shadow-lg shadow-slate-900/20 text-sm cursor-pointer">
              Login to System <ArrowRight size={17} className="text-emerald-400" />
            </button>
            <button onClick={() => openLogin("activate")} className="inline-flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-5 py-3.5 rounded-xl border border-emerald-200 transition text-sm cursor-pointer">
              <Sparkles size={15} className="text-emerald-600" /> First-Time Setup
            </button>
            <a href="#companies" className="inline-flex items-center justify-center bg-white hover:bg-slate-100 text-slate-700 font-semibold px-5 py-3.5 rounded-xl border border-slate-300 transition text-sm">Managed Entities</a>
          </div>
          <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium text-slate-600">
            {[
              [ShieldCheck, "Multi-Entity Support"],
              [UserCheck, "Automated Onboarding"],
              [LayoutDashboard, "Unified Dashboard"]
            ].map(([Icon, text]) => <div key={text} className="flex items-center gap-1.5"><Icon size={16} className="text-emerald-500 shrink-0" />{text}</div>)}
          </div>
        </div>

        <div className="relative flex justify-center">
          <div className="absolute -top-10 -right-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
          <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-400" /><div className="w-3 h-3 rounded-full bg-amber-400" /><div className="w-3 h-3 rounded-full bg-emerald-400" /></div>
              <div className="text-xs font-semibold text-slate-400 bg-slate-50 px-4 py-0.5 rounded-full border border-slate-100">app.hrhub.internal</div>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center font-bold text-xs text-slate-950">H</div>
                  <span className="font-semibold text-xs">HRHub • Simpal Group Portal</span>
                </div>
                <div className="flex gap-2"><MessageSquare size={14} className="text-slate-400" /><Calendar size={14} className="text-slate-400" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 bg-slate-900/5 border border-slate-900/10 p-4 rounded-xl space-y-2">
                  <div className="h-3 bg-slate-300 rounded w-1/3" />
                  <div className="h-16 bg-white border border-slate-200 rounded-lg p-2 shadow-sm flex items-center justify-center">
                    <p className="text-xs text-slate-800 font-medium text-center">Simpal Group consolidated multi-entity payroll completed successfully.</p>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-2 flex flex-col justify-between">
                  <div className="space-y-1"><div className="h-2 bg-slate-200 rounded w-2/3" /><div className="h-2 bg-slate-200 rounded w-1/2" /></div>
                  <div className="h-8 bg-emerald-500/10 rounded border border-emerald-500/30 flex items-center justify-center"><Clock size={14} className="text-emerald-600" /></div>
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">HR</div>
                  <div><div className="text-xs font-bold text-slate-800">HR Administrator</div><div className="text-[10px] text-slate-500">Simpal Group Executive</div></div>
                </div>
                <span className="text-[10px] bg-slate-900 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full shrink-0">Parent + 5 Subsidiaries</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="companies" className="border-y border-slate-200 bg-white py-16">
        <div className="max-w-7xl mx-auto px-6 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Multi-Entity Management</span>
            <h2 className="text-3xl font-extrabold text-slate-900">Companies Managed Under HR System</h2>
            <p className="text-sm text-slate-600">Centralized corporate governance, payroll, and workforce tracking across the entire group structure.</p>
          </div>

          <div className="relative bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-8 border-2 border-slate-800 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <Logo src={PARENT_COMPANY.logoUrl} alt={`${PARENT_COMPANY.name} Logo`} fallback="SGC LOGO" parent />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500 text-slate-950 px-3 py-1 rounded-full shadow-sm"><Crown size={14} /> Holding / Parent Entity</span>
                    <span className="text-xs font-medium text-slate-400">Central Corporate Governance</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{PARENT_COMPANY.name}</h3>
                  <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">{PARENT_COMPANY.desc}</p>
                </div>
              </div>
              <div className="w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800 lg:border-l lg:pl-8 flex flex-col justify-center space-y-2 shrink-0">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Group Status</span>
                <div className="inline-flex items-center gap-2 text-emerald-400 text-sm font-bold bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20"><CheckCircle2 size={16} /> Master Control Active</div>
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-3"><h3 className="text-lg font-bold text-slate-900">Subsidiaries & Affiliates Managed by Simpal Group</h3><div className="h-px bg-slate-200 flex-1" /></div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {SUBSIDIARY_COMPANIES.map(company => (
                <div key={company.name} className="bg-slate-50 hover:bg-white border border-slate-200 rounded-2xl p-6 transition duration-200 hover:shadow-lg flex flex-col justify-between space-y-4 group">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <Logo src={company.logoUrl} alt={`${company.name} Logo`} />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200/70 border border-slate-300 px-2.5 py-0.5 rounded-full shrink-0">{company.tag}</span>
                    </div>
                    <div><h4 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition">{company.name}</h4><p className="text-xs font-semibold text-emerald-600 mt-0.5">{company.category}</p></div>
                    <p className="text-xs text-slate-600 leading-relaxed">{company.desc}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Simpal HR Integration</span><span className="flex items-center gap-1 text-emerald-600 font-semibold">Active <CheckCircle2 size={14} /></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-b from-slate-100 to-white text-center">
        <div className="max-w-4xl mx-auto px-6 space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">One HR Engine for Construction, Gaming, and Holding Enterprises.</h2>
          <p className="text-slate-600 text-sm md:text-base leading-relaxed">Manage attendance, shifting schedules, and payroll independently per subsidiary or consolidated under the Simpal Group master portal.</p>
          <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-700">
            {["Multi-Company Payroll", "Branch Hierarchy", "Site & Field Timekeeping", "Consolidated Analytics"].map(x => <Feature key={x} icon={CheckCircle2} emerald>{x}</Feature>)}
          </div>
        </div>
      </section>

      <section id="pillars" className="max-w-7xl mx-auto px-6 py-20 space-y-24">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-black text-slate-900">HRHub Explained in 4 Pillars</h2>
          <p className="text-slate-600 text-sm">Everything you need to run a modern HR department across multiple companies.</p>
        </div>

        <Pillar
          icon={Users} title="1. Centralized Employee Profiles"
          text="Maintain separate or linked records for employees assigned across various business units under Simpal Group (Construction, Gaming, or Corporate Administration)."
          visual={<div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-4 border border-slate-200">
            <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-slate-900 text-emerald-400 font-bold flex items-center justify-center text-lg shrink-0">HR</div><div><h4 className="font-bold text-slate-900 text-sm">Site Manager / Officer</h4><p className="text-xs text-slate-500">Simpal Construction • Operations</p></div></div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100"><div className="bg-slate-50 p-2 rounded"><strong>Entity:</strong> SIMCON</div><div className="bg-slate-50 p-2 rounded"><strong>Shift:</strong> Field Rotation</div></div>
          </div>}
        />

        <Pillar
          icon={Building2} title="2. Multi-Entity Org Structure"
          text="Define distinct organigrams for SIMCON and gaming subsidiaries while retaining Simpal Group parent-level executive oversight."
          reverse
          iconBg
          visual={<div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-3 border border-slate-200">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Simpal Group Structure</div>
            {["Construction Division|SIMCON", "Gaming Operations|Lucky Betplay / Imperial"].map(x => {
              const [a,b] = x.split("|");
              return <div key={a} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-semibold flex justify-between"><span>{a}</span><span className="text-emerald-600">{b}</span></div>;
            })}
          </div>}
        />

        <Pillar
          icon={FileText} title="3. Policy & Compliance Control"
          text="Distribute specialized safety handbooks for construction teams and regulatory guidelines for gaming staff with digital acknowledgments."
          visual={<div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-3 border border-slate-200">
            {[[FileText, "SIMCON_Safety_Policy.pdf", "Construction Operations", false], [ShieldCheck, "Gaming_Compliance_Manual.pdf", "Gaming Subsidiaries", true]].map(([Icon, file, type, green]) =>
              <div key={file} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg"><Icon size={20} className={green ? "text-emerald-500" : "text-slate-700"} /><div className="text-xs"><div className="font-bold text-slate-800">{file}</div><div className="text-[10px] text-slate-400">{type}</div></div></div>
            )}
          </div>}
        />

        <Pillar
          icon={Zap} title="4. Tailored Modular Toolkit"
          text="Activate site biometric tracking for construction projects or shifting/overtime computing for 24/7 gaming branches."
          reverse iconBg
          visual={<div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {[[Clock,"Site Attendance"],[DollarSign,"Group Payroll"],[Calendar,"Shift Roster"],[Award,"Compliance"]].map(([Icon,text], i) =>
              <div key={text} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 text-center space-y-1"><Icon size={20} className={`mx-auto ${i % 2 ? "text-emerald-500" : "text-slate-700"}`} /><div className="text-xs font-bold text-slate-800">{text}</div></div>
            )}
          </div>}
        />
      </section>

      <section id="cta" className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-8">
        <div className="bg-slate-900 text-white p-8 rounded-2xl space-y-4 flex flex-col justify-between shadow-xl">
          <div><h3 className="text-2xl font-bold">Need Custom Integration?</h3><p className="text-slate-300 text-sm mt-2 leading-relaxed">Set up dedicated access levels and customized reports for Simpal Group of Companies subsidiaries.</p></div>
          <button className="self-start bg-emerald-500 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-sm hover:bg-emerald-400 transition mt-4 cursor-pointer">Contact Simpal HR Admin Team</button>
        </div>
        <div className="bg-white border border-slate-300 text-slate-900 p-8 rounded-2xl space-y-4 flex flex-col justify-between shadow-md">
          <div><h3 className="text-2xl font-bold">Access Simpal Portal</h3><p className="text-slate-600 text-sm mt-2 leading-relaxed">Log in to manage company profiles, employee records, and run group payroll in real-time.</p></div>
          <button onClick={openLogin} className="self-start bg-slate-900 text-emerald-400 font-bold px-6 py-2.5 rounded-lg text-sm hover:bg-slate-800 transition mt-4 cursor-pointer flex items-center gap-2"><LogIn size={16} /> Login to Portal</button>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8 text-xs">
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-base">H</div><span className="text-xl font-extrabold text-white tracking-tight">HR<span className="text-emerald-400">Hub</span></span></div>
            <p className="text-slate-400 max-w-sm leading-relaxed">Integrated HR platform for Simpal Group of Companies and its construction and gaming enterprises.</p>
          </div>
          <FooterColumn title="Entities" items={["Simpal Group (Parent)", "SIMCON", "Lucky Betplay", "5A Royal Gaming", "Imperial Gaming OPC"]} boldFirst />
          <FooterColumn title="Resources" items={["Documentation", "HR Guides", "API Access", "Help Center"]} />
          <FooterColumn title="Company" items={["About Us", "Contact", "Privacy Policy", "Terms of Service"]} />
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-8 mt-8 border-t border-slate-800 text-center text-[11px] text-slate-500">© 2026 HRHub System. Serving Simpal Group of Companies & Affiliates.</div>
      </footer>

      {loginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
            <div className="grid md:grid-cols-2">
              <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 text-white">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-400 flex items-center justify-center text-slate-950 font-black text-xl">H</div>
                  <div className="mt-8 space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                      {authTab === "signin" ? "Welcome back" : authTab === "activate" ? "First-Time Employee Setup" : "Account Recovery"}
                    </p>
                    <h2 className="text-3xl font-black leading-tight">
                      {authTab === "signin" ? "Sign in to HRHub" : authTab === "activate" ? "Activate Account" : "Reset Password"}
                    </h2>
                  </div>
                </div>

                <div className="space-y-4">
                  {(authTab === "activate" ? [
                    "Verify your pre-approved company email",
                    "Choose your secure personal password",
                    "Direct dashboard access upon verification"
                  ] : authTab === "forgot" ? [
                    "Enter your registered company email",
                    "Receive official password reset link",
                    "Securely update your credentials"
                  ] : [
                    "Unified employee dashboard",
                    "Payroll and attendance monitoring",
                    "Multi-company operations tracking"
                  ]).map(item => (
                    <div key={item} className="flex items-center gap-3 text-sm text-slate-200">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300 shrink-0">
                        <CheckCircle2 size={14} />
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 sm:p-8 lg:p-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-600">Personnel Portal</p>
                    <h3 className="mt-1 text-2xl font-black text-slate-900">
                      {authTab === "signin" ? "Member Login" : authTab === "activate" ? "Activate Account" : "Reset Password"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLoginOpen(false)}
                    className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Tab Switcher */}
                {authTab !== "forgot" ? (
                  <div className="mt-5 flex rounded-2xl bg-slate-100 p-1.5 border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => { setAuthTab("signin"); setLoginError(""); setAuthSuccessNotice(""); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                        authTab === "signin"
                          ? "bg-slate-900 text-emerald-400 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <LogIn size={14} /> Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthTab("activate"); setLoginError(""); setAuthSuccessNotice(""); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                        authTab === "activate"
                          ? "bg-slate-900 text-emerald-400 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Sparkles size={14} /> Activate Account
                    </button>
                  </div>
                ) : (
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => { setAuthTab("signin"); setLoginError(""); setAuthSuccessNotice(""); }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                    >
                      &larr; Back to Sign In
                    </button>
                  </div>
                )}

                {loginError && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                {authSuccessNotice && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
                    <span>{authSuccessNotice}</span>
                  </div>
                )}

                {authTab === "signin" && (
                  <form onSubmit={handleLogin} className="mt-5 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Company Email Address</label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
                        <Mail size={17} className="text-slate-400" />
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="admin@hrhub.com"
                          className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Password</label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
                        <Lock size={17} className="text-slate-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                        <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        Remember me
                      </label>
                      <button
                        type="button"
                        onClick={() => { setAuthTab("forgot"); setLoginError(""); setAuthSuccessNotice(""); }}
                        className="font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingAuth}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-emerald-400 transition hover:bg-slate-800 shadow-lg shadow-slate-900/15 cursor-pointer disabled:opacity-70"
                    >
                      {isSubmittingAuth ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" /> Verifying Credentials...
                        </>
                      ) : (
                        <>
                          Sign in to dashboard <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 space-y-1.5">
                      <p className="font-bold flex items-center gap-1.5 text-emerald-950">
                        <ShieldCheck size={14} className="text-emerald-600 shrink-0" /> Quick Access Guide:
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        • Demo Administrator: <span className="font-bold text-slate-900">admin@hrhub.com</span> / <span className="font-bold text-slate-900">admin123</span>
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        • First time using your email? Switch to the <strong className="text-emerald-950 cursor-pointer underline" onClick={() => { setAuthTab("activate"); setLoginError(""); setAuthSuccessNotice(""); }}>Activate Account</strong> tab above to set your personal password.
                      </p>
                    </div>
                  </form>
                )}

                {authTab === "activate" && (
                  <form onSubmit={handleActivateAccount} className="mt-5 space-y-4">
                    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
                      <p className="font-bold flex items-center gap-1.5 text-blue-950">
                        <UserCheck size={14} className="text-blue-600 shrink-0" /> Personnel Verification
                      </p>
                      <p className="mt-1 text-[11px] text-blue-800 leading-relaxed">
                        Enter your pre-registered company email (e.g. <strong className="text-slate-900">jrlim0413@gmail.com</strong>). Once verified against the approved team directory, your password will be created.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Registered Company Email</label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
                        <Mail size={17} className="text-slate-400" />
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="e.g. jrlim0413@gmail.com"
                          className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Choose New Password</label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
                        <Lock size={17} className="text-slate-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="At least 6 characters"
                          className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                        <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Confirm Password</label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
                        <Lock size={17} className="text-slate-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                          placeholder="Confirm your password"
                          className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingAuth}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-70"
                    >
                      {isSubmittingAuth ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" /> Verifying Directory...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} /> Activate &amp; Set Password
                        </>
                      )}
                    </button>
                  </form>
                )}

                {authTab === "forgot" && (
                  <form onSubmit={handleForgotPassword} className="mt-5 space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed">
                      Enter your registered email address below. We'll dispatch a secure password reset link to your inbox.
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Registered Email Address</label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
                        <Mail size={17} className="text-slate-400" />
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="name@company.com"
                          className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingAuth}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-emerald-400 transition hover:bg-slate-800 shadow-lg shadow-slate-900/15 cursor-pointer disabled:opacity-70"
                    >
                      {isSubmittingAuth ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" /> Dispatching Link...
                        </>
                      ) : (
                        <>
                          Send Password Reset Link <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Pillar = ({ icon: Icon, title, text, visual, reverse = false, iconBg = false }) => (
  <div className="grid md:grid-cols-2 gap-12 items-center">
    <div className={`bg-slate-100 p-8 rounded-3xl border border-slate-200 flex items-center justify-center ${reverse ? "md:order-2" : ""}`}>{visual}</div>
    <div className={`space-y-4 ${reverse ? "md:order-1" : ""}`}>
      <div className={`w-10 h-10 rounded-xl ${iconBg ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-900 text-emerald-400"} flex items-center justify-center font-bold`}><Icon size={20} /></div>
      <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{text}</p>
    </div>
  </div>
);

const FooterColumn = ({ title, items, boldFirst }) => (
  <div>
    <h5 className="font-bold text-white mb-3 uppercase tracking-wider">{title}</h5>
    <ul className="space-y-2">
      {items.map((item, i) => <li key={item}><a href={title === "Entities" ? "#companies" : "#"} className={`hover:text-emerald-400 transition ${boldFirst && i === 0 ? "font-bold text-slate-200" : ""}`}>{item}</a></li>)}
    </ul>
  </div>
);

export default App;