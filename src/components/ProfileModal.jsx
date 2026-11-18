import { useState } from "react";
import {
  Camera, Mail, Phone, MapPin, Building2, Briefcase, CalendarDays,
  CheckCircle2, AlertCircle, RefreshCw, Lock
} from "lucide-react";

function formatJoinedDate(dateStr) {
  if (!dateStr) return "Active Account";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return `Joined ${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
  } catch {
    return "Active Account";
  }
}

export default function ProfileModal({
  mode,
  onClose,
  profileName,
  setProfileName,
  profileRole,
  setProfileRole,
  profileEmail,
  setProfileEmail,
  profileCompany = "",
  profilePhone,
  setProfilePhone,
  profileLocation,
  setProfileLocation,
  profileDepartment,
  setProfileDepartment,
  profileBio,
  setProfileBio,
  profileJoinedDate = "",
  profilePhotoUrl = "",
  profileSaved,
  setProfileSaved,
  passwordSaved,
  setPasswordSaved,
  onSaveProfile,
  onChangePassword
}) {
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const initials = (profileName || profileEmail || "HR")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "HR";

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileSaved(false);
    setIsSavingProfile(true);
    try {
      if (typeof onSaveProfile === "function") {
        const res = await onSaveProfile({
          name: (profileName || "").trim(),
          role: (profileRole || "").trim(),
          email: (profileEmail || "").trim(),
          phone: (profilePhone || "").trim(),
          location: (profileLocation || "").trim(),
          department: (profileDepartment || "").trim(),
          bio: (profileBio || "").trim()
        });
        if (res && res.success === false) {
          setProfileError(res.error || "Unable to save profile changes.");
        } else {
          setProfileSaved(true);
        }
      } else {
        setProfileSaved(true);
      }
    } catch (err) {
      setProfileError(err?.message || "Failed to update profile in database.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      if (typeof onChangePassword === "function") {
        const res = await onChangePassword({ currentPassword, newPassword });
        if (res && res.success === false) {
          setPasswordError(res.error || "Unable to update password.");
        } else {
          setPasswordSaved(true);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }
      } else {
        setPasswordSaved(true);
      }
    } catch (err) {
      setPasswordError(err?.message || "Failed to update password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-3 sm:p-4 pt-6 sm:pt-10 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Account Settings • Database Synchronized</p>
            <h2 className="mt-1 text-lg font-extrabold">{mode === "profile" ? "Update Profile" : "Change Password"}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-700 cursor-pointer">×</button>
        </div>

        {mode === "profile" ? (
          <form className="mt-4 max-h-[78vh] overflow-y-auto px-1" onSubmit={handleProfileSubmit}>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div className="relative h-24 bg-gradient-to-r from-sky-300 via-emerald-200 to-teal-200" />
              <div className="relative px-5 pb-5">
                <div className="-mt-12 flex items-end justify-between">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-slate-900 text-2xl font-extrabold text-emerald-400 shadow-lg overflow-hidden">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt={profileName} className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                    <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-slate-950 shadow-sm">
                      <Camera size={13} />
                    </span>
                  </div>
                  <span className="mb-2 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    Active Account
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="text-lg font-extrabold text-slate-900">{profileName || "Unnamed User"}</h3>
                  <p className="text-xs text-slate-500">
                    {profileRole || "Team Member"} · {profileCompany || "Assigned Entity"}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <Building2 size={13} className="text-emerald-600" />
                    {profileCompany || "No company assigned"}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-emerald-600" />
                    {profileLocation || "Location not set"}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays size={13} className="text-emerald-600" />
                    {formatJoinedDate(profileJoinedDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600">
                Full name
                <input
                  value={profileName}
                  onChange={(event) => {
                    setProfileName(event.target.value);
                    setProfileSaved(false);
                  }}
                  placeholder="Enter your full name"
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Position / Designation
                <input
                  value={profileRole}
                  onChange={(event) => {
                    setProfileRole(event.target.value);
                    setProfileSaved(false);
                  }}
                  placeholder="e.g. Field Monitoring, HR Admin"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1">
                  <Mail size={13} /> Work email
                  <span className="ml-auto inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-400">
                    <Lock size={9} /> Login ID
                  </span>
                </span>
                <input
                  type="email"
                  value={profileEmail}
                  readOnly
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-normal text-slate-500 outline-none cursor-not-allowed"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1"><Phone size={13} /> Phone number</span>
                <input
                  value={profilePhone}
                  onChange={(event) => {
                    setProfilePhone(event.target.value);
                    setProfileSaved(false);
                  }}
                  placeholder="Enter mobile / contact number"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1"><MapPin size={13} /> Branch / Location</span>
                <input
                  value={profileLocation}
                  onChange={(event) => {
                    setProfileLocation(event.target.value);
                    setProfileSaved(false);
                  }}
                  placeholder="Enter assigned branch or city"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1"><Briefcase size={13} /> Department</span>
                <input
                  value={profileDepartment}
                  onChange={(event) => {
                    setProfileDepartment(event.target.value);
                    setProfileSaved(false);
                  }}
                  placeholder="Enter department or division"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500"
                />
              </label>
            </div>
            <label className="mt-4 block text-xs font-bold text-slate-600">
              About you
              <textarea
                rows="3"
                value={profileBio}
                onChange={(event) => {
                  setProfileBio(event.target.value);
                  setProfileSaved(false);
                }}
                placeholder="Write a short note about your role and responsibilities..."
                className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500"
              />
            </label>

            {profileError && (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                <AlertCircle size={14} className="shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              {profileSaved ? (
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 size={14} />
                  <span>Profile saved to database successfully.</span>
                </p>
              ) : (
                <span className="text-[10px] text-slate-400">Synced directly with your live Employee Directory record.</span>
              )}
              <button
                type="submit"
                disabled={isSavingProfile}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-emerald-400 hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
              >
                {isSavingProfile && <RefreshCw size={12} className="animate-spin" />}
                <span>{isSavingProfile ? "Saving..." : "Save Profile"}</span>
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit}>
            <label className="block text-xs font-bold text-slate-600">
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              New password (min. 6 characters)
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500"
              />
            </label>

            {passwordError && (
              <div className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                <AlertCircle size={14} className="shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSaved && (
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 size={14} />
                <span>Password updated successfully.</span>
              </p>
            )}

            <button
              type="submit"
              disabled={isSavingPassword}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
            >
              {isSavingPassword && <RefreshCw size={12} className="animate-spin" />}
              <span>{isSavingPassword ? "Updating..." : "Update Password"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
