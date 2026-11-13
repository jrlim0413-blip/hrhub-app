import { useState, useMemo, useEffect, useRef } from "react";
import {
  Megaphone, Sparkles, Award, Image, Send, Heart,
  ThumbsUp, MessageCircle, Share2, Pin, Trash2, X,
  CheckCircle2, AlertCircle, RefreshCw, MoreHorizontal,
  Clock, Calendar, Globe, Camera, Smile, ShieldCheck,
  User, Check, ChevronDown
} from "lucide-react";
import {
  getBulletinPostsFromDb,
  createBulletinPostInDb,
  toggleLikeBulletinPostInDb,
  addCommentToBulletinPostInDb,
  deleteBulletinPostFromDb,
  deleteCommentFromBulletinPostInDb
} from "../lib/bulletinPostsStorage.js";

const CATEGORIES = [
  { label: "Announcement", icon: Megaphone, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "Official Memo", icon: ShieldCheck, color: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  { label: "Celebration & Event", icon: Sparkles, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { label: "Recognition", icon: Award, color: "bg-amber-50 text-amber-800 border-amber-200" }
];

function formatRelativeTime(isoString) {
  if (!isoString) return "Just now";
  const date = new Date(isoString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function CompanyBulletinFeed({
  currentUser,
  profileName = "Colleague",
  profileRole = "Team Member",
  profileCompany = "Simpal Group of Companies",
  userInitials = "HR",
  isHRMD = false,
  canPost = true
}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'Announcement' | 'Official Memo' | 'Celebration & Event' | 'pinned'

  // Composer Form States
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postCategory, setPostCategory] = useState("Announcement");
  const [isPinned, setIsPinned] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  // Active Open Comments State (Map of postId -> boolean)
  const [openCommentsMap, setOpenCommentsMap] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [submittingCommentPostId, setSubmittingCommentPostId] = useState(null);

  // Lightbox Image Preview State
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  // Toast notice
  const [toastMessage, setToastMessage] = useState(null);

  const fileInputRef = useRef(null);
  const currentEmail = (currentUser?.email || "").trim().toLowerCase();

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Load bulletin posts from Supabase database
  const fetchFeed = async () => {
    try {
      setLoading(true);
      const res = await getBulletinPostsFromDb();
      setPosts(res.posts || []);
    } catch (err) {
      console.warn("Error fetching bulletin feed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // 2. Handle image file selection with browser client-side compression
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotice({ type: "warning", message: "Please select an image file (PNG, JPG, or WEBP)." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 1200;
        const maxHeight = 1200;
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
        setAttachedImage(compressedBase64);
        setIsComposerExpanded(true);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // 3. Handle Submit Post to Database
  const handleCreatePost = async (e) => {
    e?.preventDefault();
    if (!postContent.trim() && !attachedImage) {
      setNotice({ type: "warning", message: "Please write a message or attach an image to post." });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const payload = {
        authorName: profileName,
        authorEmail: currentEmail,
        authorRole: profileRole,
        authorCompany: profileCompany,
        category: postCategory,
        title: postTitle.trim(),
        content: postContent.trim(),
        imageUrl: attachedImage,
        pinned: Boolean(isHRMD && isPinned),
        isOfficial: Boolean(postCategory === "Official Memo" || isHRMD)
      };

      const res = await createBulletinPostInDb(payload);
      if (res.success) {
        setPosts(res.allPosts);
        setPostTitle("");
        setPostContent("");
        setAttachedImage(null);
        setIsPinned(false);
        setIsComposerExpanded(false);
        showToast("✓ Post published successfully to Company Bulletin!");
      }
    } catch (err) {
      console.error("Post creation error:", err);
      setNotice({ type: "error", message: "Failed to publish post: " + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Handle Like Toggle
  const handleToggleLike = async (postId) => {
    if (!currentEmail) return;

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const likes = Array.isArray(p.likes) ? p.likes : [];
          const hasLiked = likes.some((e) => String(e).toLowerCase() === currentEmail);
          const updatedLikes = hasLiked
            ? likes.filter((e) => String(e).toLowerCase() !== currentEmail)
            : [...likes, currentEmail];
          return { ...p, likes: updatedLikes };
        }
        return p;
      })
    );

    try {
      await toggleLikeBulletinPostInDb(postId, currentEmail);
    } catch (err) {
      console.warn("Like update error:", err);
    }
  };

  // 5. Handle Comment Submit
  const handleAddComment = async (postId) => {
    const text = (commentInputs[postId] || "").trim();
    if (!text) return;

    setSubmittingCommentPostId(postId);
    try {
      const commentPayload = {
        authorName: profileName,
        authorEmail: currentEmail,
        authorRole: profileRole,
        authorCompany: profileCompany,
        content: text
      };

      const res = await addCommentToBulletinPostInDb(postId, commentPayload);
      if (res.success) {
        setPosts(res.allPosts);
        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      }
    } catch (err) {
      console.error("Comment submit error:", err);
    } finally {
      setSubmittingCommentPostId(null);
    }
  };

  // 6. Delete Post
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post from the bulletin?")) return;
    try {
      const res = await deleteBulletinPostFromDb(postId);
      if (res.success) {
        setPosts(res.allPosts);
        showToast("Post deleted from feed.");
      }
    } catch (err) {
      console.error("Delete post error:", err);
    }
  };

  // 7. Delete Comment
  const handleDeleteComment = async (postId, commentId) => {
    try {
      const res = await deleteCommentFromBulletinPostInDb(postId, commentId);
      if (res.success) {
        setPosts(res.allPosts);
      }
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  };

  // 8. Filtered Feed
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (activeFilter === "pinned") return Boolean(p.pinned);
      if (activeFilter !== "all") return p.category === activeFilter;
      return true;
    }).sort((a, b) => {
      // Pinned posts always stay on top
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [posts, activeFilter]);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. FACEBOOK-STYLE "CREATE POST" COMPOSER                     */}
      {/* ============================================================ */}
      {canPost ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3 transition">
          {/* Top Trigger Row */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-emerald-400 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {userInitials}
            </div>

            <div
              onClick={() => setIsComposerExpanded(true)}
              className="flex-1 bg-slate-100/80 hover:bg-slate-100 rounded-full px-4 py-2.5 text-xs text-slate-500 font-medium cursor-pointer transition select-none flex items-center justify-between"
            >
              <span>What&apos;s on your mind, {profileName.split(" ")[0]}? Share an update or announcement...</span>
              <Sparkles size={14} className="text-emerald-600 hidden sm:block" />
            </div>
          </div>

          {/* Expanded Composer Drawer */}
          {isComposerExpanded && (
            <div className="pt-2 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
              {/* Author Header & Audience Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{profileName}</span>
                  <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                    {profileCompany}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                  <Globe size={11} className="text-slate-400" />
                  <span>Public • Enterprise Feed</span>
                </div>
              </div>

              {/* Optional Post Title */}
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Topic / Title (optional, e.g. Monthly Operations Briefing)..."
                className="w-full text-xs font-bold px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
              />

              {/* Main Post Textarea */}
              <textarea
                rows={3}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder={`Write something to announce across all branches and entities...`}
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none transition leading-relaxed placeholder:text-slate-400"
              />

              {/* Attached Photo Preview */}
              {attachedImage && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-72 bg-slate-950 flex items-center justify-center">
                  <img src={attachedImage} alt="Attachment" className="max-h-72 w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition cursor-pointer shadow-md"
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Category Pills & Action Buttons */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Category:</span>
                  {CATEGORIES.map((cat) => {
                    const isSelected = postCategory === cat.label;
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setPostCategory(cat.label)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <Icon size={11} className={isSelected ? "text-emerald-400" : "text-slate-500"} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Pinned announcement checkbox (HRMD only) */}
                {isHRMD && (
                  <label className="flex items-center gap-2 pt-1 text-xs text-slate-600 font-bold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className="flex items-center gap-1">
                      <Pin size={12} className="text-amber-500" />
                      Pin to top of feed
                    </span>
                  </label>
                )}
              </div>

              {/* Form Validation Notice */}
              {notice && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                  notice.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}>
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{notice.message}</span>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {/* Actions Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition cursor-pointer"
                    title="Attach photo or announcement poster"
                  >
                    <Camera size={14} className="text-emerald-600" />
                    <span>Photo</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsComposerExpanded(false);
                      setPostContent("");
                      setPostTitle("");
                      setAttachedImage(null);
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleCreatePost}
                    disabled={isSubmitting || (!postContent.trim() && !attachedImage)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-sm shadow-emerald-600/20 transition cursor-pointer active:scale-95"
                  >
                    <Send size={13} />
                    <span>{isSubmitting ? "Posting..." : "Post"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 flex items-center justify-between">
          <span>Posting to the official company bulletin is restricted for your role.</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Read-Only Mode</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. FEED TOOLBAR & CATEGORY FILTER TABS                       */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2.5 flex items-center justify-between gap-2 shadow-2xs overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5">
          {[
            { id: "all", label: "All Posts" },
            { id: "Announcement", label: "Announcements" },
            { id: "Official Memo", label: "Memos" },
            { id: "Celebration & Event", label: "Events" },
            { id: "pinned", label: "Pinned" }
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={fetchFeed}
          title="Refresh Feed"
          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : ""} />
        </button>
      </div>

      {/* ============================================================ */}
      {/* 3. POSTS FEED LIST                                           */}
      {/* ============================================================ */}
      <div className="space-y-4">
        {loading && posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-2">
            <RefreshCw size={22} className="animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs font-bold text-slate-600">Loading company announcements...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-2 text-slate-400">
            <Megaphone size={28} className="mx-auto text-slate-300" />
            <h4 className="text-sm font-bold text-slate-700">No announcements in this view</h4>
            <p className="text-xs">Select &quot;All Posts&quot; to view company updates or share the first announcement.</p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isAuthor = currentEmail && post.authorEmail === currentEmail;
            const canDelete = isAuthor || isHRMD;
            const likesArray = Array.isArray(post.likes) ? post.likes : [];
            const hasLiked = currentEmail && likesArray.some((e) => String(e).toLowerCase() === currentEmail);
            const commentsArray = Array.isArray(post.comments) ? post.comments : [];
            const isCommentsOpen = Boolean(openCommentsMap[post.id]);
            const authorInitials = post.authorName
              ? post.authorName.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              : "HR";

            return (
              <article
                key={post.id}
                className={`bg-white rounded-2xl border transition shadow-xs overflow-hidden ${
                  post.pinned ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                {/* Pinned Banner */}
                {post.pinned && (
                  <div className="bg-amber-50 px-4 py-1.5 border-b border-amber-200/70 flex items-center justify-between text-[11px] font-bold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Pin size={12} className="text-amber-600 fill-amber-500" />
                      PINNED ANNOUNCEMENT
                    </span>
                    <span className="text-[10px] text-amber-700 font-semibold">Priority Notice</span>
                  </div>
                )}

                {/* Post Header */}
                <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-emerald-400 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {authorInitials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {post.authorName || "HR Administrator"}
                        </h4>
                        {post.isOfficial && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-black text-emerald-700 uppercase">
                            <CheckCircle2 size={9} className="text-emerald-600" />
                            Official
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
                        <span className="font-semibold text-slate-600">{post.authorRole || "Team Member"}</span>
                        <span>•</span>
                        <span className="truncate">{post.authorCompany || "Simpal Group"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-slate-400">
                          <Clock size={10} />
                          {formatRelativeTime(post.createdAt)}
                        </span>
                        <Globe size={11} className="text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* Header Actions: Category Badge & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
                      {post.category || "Announcement"}
                    </span>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete post"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Post Content Body */}
                <div className="px-4 sm:px-5 space-y-2">
                  {post.title && (
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                      {post.title}
                    </h3>
                  )}

                  {post.content && (
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-normal">
                      {post.content}
                    </p>
                  )}
                </div>

                {/* Attached Photo Display */}
                {post.imageUrl && (
                  <div className="mt-3 bg-slate-950/95 overflow-hidden flex items-center justify-center max-h-[460px]">
                    <img
                      src={post.imageUrl}
                      alt="Attachment"
                      onClick={() => setPreviewImageUrl(post.imageUrl)}
                      className="w-full object-contain max-h-[460px] cursor-pointer hover:opacity-95 transition"
                    />
                  </div>
                )}

                {/* Facebook Reaction & Counts Stats Bar */}
                <div className="px-4 sm:px-5 pt-3 pb-2 flex items-center justify-between text-xs text-slate-500 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    {likesArray.length > 0 && (
                      <span className="flex items-center -space-x-1">
                        <span className="w-4.5 h-4.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] shadow-xs">
                          👍
                        </span>
                        <span className="w-4.5 h-4.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] shadow-xs">
                          ❤️
                        </span>
                      </span>
                    )}
                    <span className="font-semibold text-[11px] text-slate-600">
                      {likesArray.length} {likesArray.length === 1 ? "Like" : "Likes"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenCommentsMap((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                    className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                  >
                    {commentsArray.length} {commentsArray.length === 1 ? "Comment" : "Comments"}
                  </button>
                </div>

                {/* Facebook Action Buttons (Like, Comment, Share) */}
                <div className="px-3 sm:px-4 py-1.5 grid grid-cols-3 gap-1 text-slate-600 font-bold text-xs select-none">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(post.id)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition cursor-pointer ${
                      hasLiked
                        ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 font-black"
                        : "hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    <ThumbsUp size={15} className={hasLiked ? "fill-emerald-600 text-emerald-600" : ""} />
                    <span>Like</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOpenCommentsMap((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition cursor-pointer ${
                      isCommentsOpen
                        ? "bg-slate-100 text-slate-900 font-black"
                        : "hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    <MessageCircle size={15} />
                    <span>Comment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const shareText = `[HRHub Memo: ${post.title || post.category}]\n\n${post.content || ""}\n\nPosted by: ${post.authorName} (${post.authorCompany})`;
                      navigator.clipboard.writeText(shareText);
                      showToast("✓ Announcement text copied to clipboard!");
                    }}
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                  >
                    <Share2 size={15} />
                    <span>Share</span>
                  </button>
                </div>

                {/* ============================================================ */}
                {/* 4. EXPANDABLE FACEBOOK-STYLE COMMENTS SECTION                */}
                {/* ============================================================ */}
                {isCommentsOpen && (
                  <div className="px-4 sm:px-5 py-3 bg-slate-50/70 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
                    {/* List of Comments */}
                    {commentsArray.length > 0 && (
                      <div className="space-y-2.5">
                        {commentsArray.map((comm) => {
                          const commAuthor = currentEmail && comm.authorEmail === currentEmail;
                          const canDeleteComm = commAuthor || isHRMD;
                          const commInitials = comm.authorName
                            ? comm.authorName.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                            : "U";

                          return (
                            <div key={comm.id} className="flex items-start gap-2.5 group">
                              <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {commInitials}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="bg-slate-100 hover:bg-slate-200/70 rounded-2xl px-3.5 py-2 inline-block max-w-full text-xs space-y-0.5 transition">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-900">{comm.authorName}</span>
                                    <span className="text-[10px] text-slate-400">{comm.authorRole || "Member"}</span>
                                  </div>
                                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
                                    {comm.content}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3 pl-2 pt-0.5 text-[10px] text-slate-400 font-medium">
                                  <span>{formatRelativeTime(comm.createdAt)}</span>
                                  {canDeleteComm && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(post.id, comm.id)}
                                      className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Write Comment Box */}
                    <div className="flex items-center gap-2.5 pt-1">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {userInitials}
                      </div>

                      <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3.5 py-1.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition shadow-2xs">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ""}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(post.id);
                            }
                          }}
                          placeholder={`Write a comment as ${profileName.split(" ")[0]}...`}
                          className="w-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
                        />

                        <button
                          type="button"
                          onClick={() => handleAddComment(post.id)}
                          disabled={submittingCommentPostId === post.id || !(commentInputs[post.id] || "").trim()}
                          className="p-1 rounded-full text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                          title="Post comment"
                        >
                          <Send size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* ============================================================ */}
      {/* 5. LIGHTBOX IMAGE PREVIEW MODAL                              */}
      {/* ============================================================ */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-2 cursor-pointer transition"
            >
              <X size={24} />
            </button>
            <img
              src={previewImageUrl}
              alt="Full view"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}
