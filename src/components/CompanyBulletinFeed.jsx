import { useState, useMemo, useEffect, useRef } from "react";
import {
  Megaphone, Sparkles, Award, Image, Send, Heart,
  ThumbsUp, MessageCircle, Share2, Pin, Trash2, X,
  CheckCircle2, AlertCircle, RefreshCw, MoreHorizontal,
  Clock, Calendar, Globe, Camera, Smile, ShieldCheck,
  User, Check, ChevronDown, Video, Film, Link2, Play,
  FileVideo, Filter, ArrowRight
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
  { label: "Announcement", icon: Megaphone, color: "bg-blue-50 text-blue-700 border-blue-200", badgeColor: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "Official Memo", icon: ShieldCheck, color: "bg-emerald-50 text-emerald-800 border-emerald-300", badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  { label: "HR Motivation", icon: Sparkles, color: "bg-amber-50 text-amber-800 border-amber-300", badgeColor: "bg-amber-100 text-amber-900 border-amber-300" },
  { label: "HR Reminder", icon: Clock, color: "bg-rose-50 text-rose-700 border-rose-200", badgeColor: "bg-rose-100 text-rose-800 border-rose-200" },
  { label: "HR Video & Reel", icon: Video, color: "bg-indigo-50 text-indigo-700 border-indigo-200", badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { label: "Celebration & Event", icon: Heart, color: "bg-purple-50 text-purple-700 border-purple-200", badgeColor: "bg-purple-50 text-purple-700 border-purple-200" },
  { label: "Recognition", icon: Award, color: "bg-teal-50 text-teal-800 border-teal-200", badgeColor: "bg-teal-50 text-teal-800 border-teal-200" }
];

export function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  // Standard watch: youtube.com/watch?v=ID
  const watchMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }
  // Shorts: youtube.com/shorts/ID
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/i);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}`;
  }
  // Vimeo: vimeo.com/ID
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
  }
  return null;
}

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
  const [activeFilter, setActiveFilter] = useState("all");

  // Composer Form States
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postCategory, setPostCategory] = useState("Announcement");
  const [isPinned, setIsPinned] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedVideo, setAttachedVideo] = useState(null); // { url, type: 'file' | 'youtube' | 'direct', fileName?: string }
  const [isVideoLinkModalOpen, setIsVideoLinkModalOpen] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState("");
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
  const videoFileInputRef = useRef(null);
  const currentEmail = (currentUser?.email || "").trim().toLowerCase();

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Load bulletin posts from database
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
        setAttachedVideo(null); // Either image or video
        setIsComposerExpanded(true);
        setNotice(null);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // 3. Handle video file selection from device
  const handleVideoFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setNotice({ type: "warning", message: "Please select a valid video file (MP4, WebM, or MOV)." });
      return;
    }

    // 25MB check for smooth in-browser performance
    if (file.size > 25 * 1024 * 1024) {
      setNotice({
        type: "warning",
        message: `Video size is ${(file.size / (1024 * 1024)).toFixed(1)}MB. For files over 25MB, you can paste a YouTube or video link instead.`
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedVideo({
        url: event.target.result,
        type: "file",
        fileName: file.name
      });
      setAttachedImage(null);
      setIsComposerExpanded(true);
      setNotice(null);
    };
    reader.readAsDataURL(file);
  };

  // 4. Handle Video Link / URL paste (YouTube, Vimeo, MP4 direct)
  const handleApplyVideoLink = () => {
    if (!videoUrlInput.trim()) return;
    const trimmed = videoUrlInput.trim();
    const ytEmbed = getYouTubeEmbedUrl(trimmed);
    const isDirectVideo = /\.(mp4|webm|mov|ogg)($|\?)/i.test(trimmed);

    setAttachedVideo({
      url: trimmed,
      type: ytEmbed ? "youtube" : isDirectVideo ? "direct" : "youtube",
      embedUrl: ytEmbed || trimmed
    });
    setAttachedImage(null);
    setVideoUrlInput("");
    setIsVideoLinkModalOpen(false);
    setIsComposerExpanded(true);
    setNotice(null);
  };

  // 5. Handle Submit Post to Database
  const handleCreatePost = async (e) => {
    e?.preventDefault();
    if (!postContent.trim() && !attachedImage && !attachedVideo) {
      setNotice({ type: "warning", message: "Please write a message or attach a photo/video to post." });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const payload = {
        authorName: profileName || "HR Admin",
        authorEmail: currentEmail,
        authorRole: profileRole,
        authorCompany: profileCompany,
        category: postCategory,
        title: postTitle.trim(),
        content: postContent.trim(),
        imageUrl: attachedImage || null,
        videoUrl: attachedVideo?.url || null,
        videoType: attachedVideo?.type || null,
        pinned: Boolean(isHRMD && isPinned),
        isOfficial: Boolean(postCategory === "Official Memo" || isHRMD)
      };

      const res = await createBulletinPostInDb(payload);
      if (res.success) {
        setPosts(res.allPosts);
        // Reset composer
        setPostTitle("");
        setPostContent("");
        setAttachedImage(null);
        setAttachedVideo(null);
        setIsPinned(false);
        setIsComposerExpanded(false);
        showToast("Post published successfully to the company bulletin!");
      } else {
        setNotice({ type: "warning", message: "Failed to publish post. Please retry." });
      }
    } catch (err) {
      console.error("Post creation error:", err);
      setNotice({ type: "warning", message: "An error occurred while publishing." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Handle Like Toggle
  const handleToggleLike = async (postId) => {
    if (!currentEmail) {
      showToast("Please log in to acknowledge announcements.");
      return;
    }

    try {
      const res = await toggleLikeBulletinPostInDb(postId, currentEmail);
      if (res.success) {
        setPosts(res.allPosts);
      }
    } catch (err) {
      console.error("Like toggle error:", err);
    }
  };

  // 7. Toggle Comment Section
  const handleToggleComments = (postId) => {
    setOpenCommentsMap((prev) => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // 8. Handle Submit Comment
  const handleSubmitComment = async (postId) => {
    const text = (commentInputs[postId] || "").trim();
    if (!text) return;

    setSubmittingCommentPostId(postId);

    try {
      const commentPayload = {
        authorName: profileName || "Colleague",
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

  // 9. Delete Post
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

  // 10. Delete Comment
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

  // 11. Pinned post extraction for executive spotlight
  const primaryPinnedPost = useMemo(() => {
    return posts.find((p) => Boolean(p.pinned)) || null;
  }, [posts]);

  // 12. Filtered Feed (Strictly chronological: newest post is ALWAYS at the very top)
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (activeFilter === "pinned") return Boolean(p.pinned);
      if (activeFilter === "videos") return Boolean(p.videoUrl || p.category === "HR Video & Reel");
      if (activeFilter !== "all") return p.category === activeFilter;
      return true;
    }).sort((a, b) => {
      // Newest post is always at the top regardless of pinned status
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
              <span>What&apos;s on your mind, {profileName.split(" ")[0]}? Share announcements, motivations, reminders, or videos...</span>
              <Sparkles size={14} className="text-emerald-600 hidden sm:block" />
            </div>
          </div>

          {/* Quick Media Action Row */}
          {!isComposerExpanded && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-around text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setIsComposerExpanded(true);
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <Camera size={16} className="text-emerald-600" />
                <span>Photo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsComposerExpanded(true);
                  videoFileInputRef.current?.click();
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <Video size={16} className="text-indigo-600" />
                <span>Video Clip</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsComposerExpanded(true);
                  setIsVideoLinkModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <Link2 size={16} className="text-rose-600" />
                <span>Video Link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsComposerExpanded(true);
                  setPostCategory("HR Motivation");
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <Sparkles size={16} className="text-amber-500" />
                <span>Motivation</span>
              </button>
            </div>
          )}

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
                placeholder="Topic / Title (e.g. Weekly Operational Reminder, Motivation of the Day)..."
                className="w-full text-xs font-bold px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
              />

              {/* Main Post Textarea */}
              <textarea
                rows={3}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Write your announcement, motivational message, policy reminder, or video description..."
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

              {/* Attached Video Preview */}
              {attachedVideo && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 p-2 shadow-xs">
                  {getYouTubeEmbedUrl(attachedVideo.url) ? (
                    <div className="w-full aspect-video rounded-xl overflow-hidden">
                      <iframe
                        src={getYouTubeEmbedUrl(attachedVideo.url)}
                        title="Attached Video Preview"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  ) : (
                    <video
                      src={attachedVideo.url}
                      controls
                      playsInline
                      className="max-h-64 w-full rounded-xl object-contain bg-black"
                    />
                  )}

                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-300 px-1">
                    <span className="flex items-center gap-1.5 font-bold truncate">
                      <Film size={13} className="text-indigo-400 shrink-0" />
                      {attachedVideo.fileName || "Video Attachment (Ready to Post)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachedVideo(null)}
                      className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-bold transition cursor-pointer"
                    >
                      <X size={13} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Video Link Embed Sub-Input */}
              {isVideoLinkModalOpen && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <Link2 size={15} className="text-indigo-600" />
                      <span>Paste Video Link (YouTube, Vimeo, or MP4)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsVideoLinkModalOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleApplyVideoLink}
                      disabled={!videoUrlInput.trim()}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer"
                    >
                      Attach
                    </button>
                  </div>
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

              {/* Hidden File Inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <input
                ref={videoFileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/ogg"
                onChange={handleVideoFileSelect}
                className="hidden"
              />

              {/* Actions Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition cursor-pointer"
                    title="Attach photo or announcement poster"
                  >
                    <Camera size={14} className="text-emerald-600" />
                    <span>Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => videoFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition cursor-pointer"
                    title="Upload video clip (MP4, WebM)"
                  >
                    <Video size={14} className="text-indigo-600" />
                    <span>Video Clip</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsVideoLinkModalOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition cursor-pointer"
                    title="Embed YouTube or Video Link"
                  >
                    <Link2 size={14} className="text-rose-600" />
                    <span>Video Link</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setIsComposerExpanded(false);
                      setPostContent("");
                      setPostTitle("");
                      setAttachedImage(null);
                      setAttachedVideo(null);
                      setIsVideoLinkModalOpen(false);
                      setNotice(null);
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleCreatePost}
                    disabled={isSubmitting || (!postContent.trim() && !attachedImage && !attachedVideo)}
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
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {[
            { id: "all", label: "All Posts" },
            { id: "HR Motivation", label: "💡 Motivation" },
            { id: "HR Reminder", label: "⏰ Reminders" },
            { id: "videos", label: "🎥 Videos" },
            { id: "Announcement", label: "Announcements" },
            { id: "Official Memo", label: "Memos" },
            { id: "pinned", label: "📌 Pinned" }
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer whitespace-nowrap ${
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
          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0 self-start sm:self-center"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : ""} />
        </button>
      </div>

      {/* ============================================================ */}
      {/* 2B. PINNED ANNOUNCEMENT EXECUTIVE SPOTLIGHT BANNER           */}
      {/* ============================================================ */}
      {primaryPinnedPost && activeFilter === "all" && (
        <div
          onClick={() => {
            const el = document.getElementById(`post_card_${primaryPinnedPost.id}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-white border-2 border-amber-400/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition cursor-pointer relative overflow-hidden group/pin"
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] tracking-tight uppercase shadow-xs">
              <Pin size={11} className="fill-slate-950 text-slate-950" />
              <span>📌 Pinned by Head Office HRMD</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {formatRelativeTime(primaryPinnedPost.createdAt)}
            </span>
          </div>

          <h4 className="text-sm font-black text-slate-900 group-hover/pin:text-amber-900 transition line-clamp-1">
            {primaryPinnedPost.title || "Important Official Announcement"}
          </h4>
          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
            {primaryPinnedPost.content}
          </p>

          <div className="mt-2.5 pt-2 border-t border-amber-300/40 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium truncate">
              By <strong className="text-slate-800">{primaryPinnedPost.authorName}</strong> • {primaryPinnedPost.authorCompany}
            </span>
            <span className="text-amber-800 font-bold group-hover/pin:translate-x-1 transition flex items-center gap-1 shrink-0">
              <span>Jump to Post</span>
              <ArrowRight size={12} />
            </span>
          </div>
        </div>
      )}

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
            <h4 className="text-sm font-bold text-slate-700">No posts in this category</h4>
            <p className="text-xs">Select &quot;All Posts&quot; to view company updates or share the first post.</p>
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

            const ytEmbedUrl = getYouTubeEmbedUrl(post.videoUrl);

            return (
              <article
                key={post.id}
                id={`post_card_${post.id}`}
                className={`bg-white rounded-2xl border transition shadow-xs overflow-hidden ${
                  post.pinned
                    ? "border-2 border-amber-400/90 shadow-md ring-2 ring-amber-300/30 bg-gradient-to-b from-amber-50/20 via-white to-white"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                {/* Pinned Ribbon */}
                {post.pinned && (
                  <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 border-b border-amber-300 text-slate-950 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-between shadow-xs">
                    <span className="flex items-center gap-1.5">
                      <Pin size={12} className="fill-slate-950 text-slate-950" />
                      <span>📌 PINNED ANNOUNCEMENT • HEAD OFFICE HRMD</span>
                    </span>
                    <span className="text-[9px] bg-slate-950/15 px-2 py-0.5 rounded-full font-extrabold tracking-wider">
                      OFFICIAL PRIORITY
                    </span>
                  </div>
                )}

                {/* Post Author Header */}
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
                        {post.pinned && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[9px] font-black text-amber-900 uppercase">
                            <Pin size={9} className="fill-amber-700 text-amber-700" />
                            Pinned
                          </span>
                        )}
                        {post.videoUrl && (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[9px] font-black text-indigo-700 uppercase">
                            <Video size={9} className="text-indigo-600" />
                            Video
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

                {/* Attached Video Display */}
                {post.videoUrl && (
                  <div className="mt-3 bg-black overflow-hidden flex items-center justify-center border-y border-slate-900">
                    {ytEmbedUrl ? (
                      <div className="w-full aspect-video">
                        <iframe
                          src={ytEmbedUrl}
                          title={post.title || "HR Video Post"}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <video
                        src={post.videoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full max-h-[480px] object-contain bg-black"
                      />
                    )}
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
                    <span className="font-semibold text-slate-600">
                      {likesArray.length === 0
                        ? "Be the first to acknowledge"
                        : likesArray.length === 1
                        ? hasLiked
                          ? "You acknowledged this"
                          : "1 person acknowledged"
                        : `${likesArray.length} acknowledgments`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-400 font-medium">
                    <button
                      type="button"
                      onClick={() => handleToggleComments(post.id)}
                      className="hover:underline cursor-pointer"
                    >
                      {commentsArray.length} {commentsArray.length === 1 ? "comment" : "comments"}
                    </button>
                  </div>
                </div>

                {/* Facebook Action Buttons: Like, Comment, Share */}
                <div className="px-2 py-1 flex items-center justify-around text-xs font-bold text-slate-600">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(post.id)}
                    className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
                      hasLiked
                        ? "text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/70"
                        : "hover:bg-slate-100/80 text-slate-600"
                    }`}
                  >
                    <ThumbsUp size={16} className={hasLiked ? "fill-emerald-600 text-emerald-600" : ""} />
                    <span>{hasLiked ? "Acknowledged" : "Acknowledge"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleComments(post.id)}
                    className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
                      isCommentsOpen ? "text-emerald-700 bg-slate-100" : "hover:bg-slate-100/80 text-slate-600"
                    }`}
                  >
                    <MessageCircle size={16} />
                    <span>Comment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${post.title ? post.title + "\n\n" : ""}${post.content || ""}`);
                      showToast("Post content copied to clipboard!");
                    }}
                    className="flex-1 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100/80 transition cursor-pointer text-slate-600"
                  >
                    <Share2 size={16} />
                    <span>Share</span>
                  </button>
                </div>

                {/* ========================================================== */}
                {/* 4. FACEBOOK-STYLE COMMENTS DRAWER                          */}
                {/* ========================================================== */}
                {isCommentsOpen && (
                  <div className="bg-slate-50/70 p-4 sm:p-5 pt-3 border-t border-slate-100 space-y-3">
                    {/* Comments List */}
                    {commentsArray.length > 0 && (
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {commentsArray.map((comm) => {
                          const commAuthor = currentEmail && comm.authorEmail === currentEmail;
                          const canDeleteComm = commAuthor || isHRMD;
                          const commInitials = comm.authorName
                            ? comm.authorName.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                            : "HR";

                          return (
                            <div key={comm.id} className="flex items-start gap-2.5 group">
                              <div className="w-8 h-8 rounded-full bg-slate-900 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                                {commInitials}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="bg-white rounded-2xl px-3.5 py-2 border border-slate-200/80 shadow-2xs inline-block max-w-full">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-xs text-slate-900">{comm.authorName}</span>
                                    <span className="text-[9px] text-slate-400 font-semibold">• {comm.authorRole || "Colleague"}</span>
                                  </div>
                                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed mt-0.5">
                                    {comm.content}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3 px-3 pt-0.5 text-[10px] text-slate-400">
                                  <span>{formatRelativeTime(comm.createdAt)}</span>
                                  {canDeleteComm && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(post.id, comm.id)}
                                      className="text-slate-400 hover:text-rose-600 font-bold cursor-pointer transition"
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
                    <div className="flex items-center gap-2 pt-1">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-emerald-400 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                        {userInitials}
                      </div>

                      <div className="flex-1 relative flex items-center">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ""}
                          onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmitComment(post.id);
                            }
                          }}
                          placeholder={`Write a comment as ${profileName.split(" ")[0]}...`}
                          className="w-full bg-white border border-slate-200 rounded-full pl-4 pr-10 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs font-medium"
                        />

                        <button
                          type="button"
                          disabled={submittingCommentPostId === post.id || !commentInputs[post.id]?.trim()}
                          onClick={() => handleSubmitComment(post.id)}
                          className="absolute right-2 p-1.5 text-emerald-600 hover:text-emerald-700 disabled:opacity-30 disabled:hover:text-emerald-600 transition cursor-pointer"
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
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-2 transition cursor-pointer"
            >
              <X size={24} />
            </button>
            <img
              src={previewImageUrl}
              alt="Preview"
              className="max-h-[85vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
