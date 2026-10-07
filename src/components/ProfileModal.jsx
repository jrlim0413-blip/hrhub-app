import {
  Camera, Mail, Phone, MapPin, Building2, Briefcase, CalendarDays
} from "lucide-react";

export default function ProfileModal({
  mode,
  onClose,
  profileName,
  setProfileName,
  profileRole,
  setProfileRole,
  profileEmail,
  setProfileEmail,
  profilePhone,
  setProfilePhone,
  profileLocation,
  setProfileLocation,
  profileDepartment,
  setProfileDepartment,
  profileBio,
  setProfileBio,
  profileSaved,
  setProfileSaved,
  passwordSaved,
  setPasswordSaved
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Account settings</p>
            <h2 className="mt-1 text-lg font-extrabold">{mode === "profile" ? "Update profile" : "Change password"}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-700">×</button>
        </div>

        {mode === "profile" ? (
          <form className="mt-4 max-h-[78vh] overflow-y-auto px-1" onSubmit={(event) => { event.preventDefault(); setProfileSaved(true); }}>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div className="relative h-24 bg-gradient-to-r from-sky-300 via-emerald-200 to-pink-200" />
              <div className="relative px-5 pb-5">
                <div className="-mt-12 flex items-end justify-between">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-slate-900 text-2xl font-extrabold text-emerald-400 shadow-lg">
                    {profileName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                    <button type="button" aria-label="Change profile photo" className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-slate-950 shadow-sm hover:bg-emerald-400">
                      <Camera size={14} />
                    </button>
                  </div>
                  <span className="mb-2 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Active account</span>
                </div>
                <div className="mt-3">
                  <h3 className="text-lg font-extrabold text-slate-900">{profileName}</h3>
                  <p className="text-xs text-slate-500">{profileRole} · Simpal Group Executive</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1"><Building2 size={13} className="text-emerald-600" /> Simpal Group</span>
                  <span className="flex items-center gap-1"><MapPin size={13} className="text-emerald-600" /> {profileLocation}</span>
                  <span className="flex items-center gap-1"><CalendarDays size={13} className="text-emerald-600" /> Joined August 2024</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600">
                Full name
                <input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Position
                <input value={profileRole} onChange={(event) => setProfileRole(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1"><Mail size={13} /> Work email</span>
                <input type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1"><Phone size={13} /> Phone number</span>
                <input value={profilePhone} onChange={(event) => setProfilePhone(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1"><MapPin size={13} /> Location</span>
                <input value={profileLocation} onChange={(event) => setProfileLocation(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1"><Briefcase size={13} /> Department</span>
                <input value={profileDepartment} onChange={(event) => setProfileDepartment(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
              </label>
            </div>
            <label className="mt-4 block text-xs font-bold text-slate-600">
              About you
              <textarea rows="3" value={profileBio} onChange={(event) => setProfileBio(event.target.value)} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
            </label>
            <div className="mt-4 flex items-center justify-between gap-3">
              {profileSaved ? <p className="text-xs font-semibold text-emerald-600">Profile updated successfully.</p> : <span className="text-[10px] text-slate-400">Your work details are visible to your HRHub colleagues.</span>}
              <button type="submit" className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-emerald-400 hover:bg-slate-800">Save profile</button>
            </div>
          </form>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); setPasswordSaved(true); }}>
            <label className="block text-xs font-bold text-slate-600">
              Current password
              <input type="password" required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              New password
              <input type="password" required minLength={6} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
            </label>
            {passwordSaved && <p className="text-xs font-semibold text-emerald-600">Password changed successfully.</p>}
            <button type="submit" className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-slate-800">Update password</button>
          </form>
        )}
      </div>
    </div>
  );
}
