import { useState, useRef, useEffect } from "react";
import {
  X, Send, Image, Smile, Reply, Trash2, Check, CheckCheck,
  ThumbsUp, Heart, Laugh, Flame, Sparkles, Download, Maximize2,
  Paperclip, CornerUpLeft, MoreVertical, Search, Phone, Video,
  Loader2
} from "lucide-react";
import { compressImageFile, uploadChatAttachment } from "../lib/chatService";

const EMOJI_REACTIONS = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "🙏", label: "Pray" },
  { emoji: "🔥", label: "Fire" }
];

export default function TeamChatMessengerModal({
  activeUser,
  currentUser,
  presenceStatus = "offline", // 'active' | 'away' | 'offline'
  isRecipientTyping = false,
  onTypingSignal,
  messages = [],
  onClose,
  onSendMessage,
  onReactMessage,
  onDeleteMessage
}) {
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageBlob, setSelectedImageBlob] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const myEmail = (currentUser?.email || "").toLowerCase();
  const recipientEmail = (activeUser?.email || "").toLowerCase();
  const recipientName = activeUser?.name || (activeUser?.email ? activeUser.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "Colleague");
  const recipientRole = activeUser?.role || "Team Member";
  const recipientCompany = activeUser?.company || "Simpal Group";
  const recipientInitials = recipientName.split(" ").filter(Boolean).map(p => p[0]).join("").slice(0, 2).toUpperCase() || "HR";

  // Handle typing debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (onTypingSignal && recipientEmail) {
      onTypingSignal(recipientEmail, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTypingSignal(recipientEmail, false);
      }, 2200);
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRecipientTyping, imagePreview]);

  // Handle image file selection with automatic compression
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPG, PNG, GIF, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 10MB.");
      return;
    }

    try {
      // Auto-compress image down to ~40KB - 80KB WebP
      const compressed = await compressImageFile(file, 1200, 0.75);
      setImagePreview(compressed.dataUrl);
      setSelectedImage(compressed.dataUrl);
      setSelectedImageBlob(compressed.blob);
    } catch (err) {
      console.warn("Compression fallback:", err);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
        setSelectedImage(reader.result);
        setSelectedImageBlob(file);
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    e.target.value = "";
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setSelectedImageBlob(null);
    setImagePreview(null);
  };

  // Submit message
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    if (onTypingSignal && recipientEmail) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTypingSignal(recipientEmail, false);
    }

    let finalImageUrl = selectedImage;

    // Upload compressed blob to Supabase Storage if available
    if (selectedImageBlob) {
      setIsUploadingImage(true);
      try {
        const uploadedUrl = await uploadChatAttachment(selectedImageBlob, myEmail);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      } catch (uploadErr) {
        console.warn("Storage upload notice (using compressed dataUrl):", uploadErr);
      } finally {
        setIsUploadingImage(false);
      }
    }

    onSendMessage({
      text: inputText.trim(),
      image: finalImageUrl || undefined,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        senderName: replyingTo.senderName,
        text: replyingTo.text || (replyingTo.image ? "📷 Photo" : ""),
        image: replyingTo.image || undefined
      } : undefined
    });

    setInputText("");
    setSelectedImage(null);
    setSelectedImageBlob(null);
    setImagePreview(null);
    setReplyingTo(null);
    setActiveReactionPickerId(null);
    if (inputRef.current) inputRef.current.focus();
  };

  // Instant Thumbs Up (Messenger style)
  const handleSendQuickThumbsUp = () => {
    if (onTypingSignal && recipientEmail) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTypingSignal(recipientEmail, false);
    }

    onSendMessage({
      text: "👍",
      replyTo: replyingTo ? {
        id: replyingTo.id,
        senderName: replyingTo.senderName,
        text: replyingTo.text || (replyingTo.image ? "📷 Photo" : "")
      } : undefined
    });
    setReplyingTo(null);
  };

  const statusDotClass =
    presenceStatus === "active"
      ? "bg-[#00c875]"
      : presenceStatus === "away"
      ? "bg-amber-400"
      : "bg-slate-500";

  const statusLabel =
    presenceStatus === "active"
      ? "Active now"
      : presenceStatus === "away"
      ? "Away (AFK)"
      : "Offline";

  return (
    <>
      <div className="fixed bottom-0 sm:bottom-4 left-0 sm:left-auto right-0 sm:right-6 z-50 w-full sm:max-w-[420px] max-h-[90vh] sm:max-h-none bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-200">
        {/* Messenger Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-3.5 px-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-emerald-400 font-extrabold text-xs flex items-center justify-center tracking-wider shadow-inner">
                {recipientInitials}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-slate-900 ${statusDotClass}`}
                title={`${recipientName} is ${statusLabel}`}
              />
            </div>
            <div className="min-w-0 text-left">
              <h4 className="text-sm font-black text-white truncate flex items-center gap-1.5">
                {recipientName}
              </h4>
              <p className="text-[10.5px] text-slate-300 truncate font-medium flex items-center gap-1.5">
                <span
                  className={
                    presenceStatus === "active"
                      ? "text-emerald-400 font-semibold"
                      : presenceStatus === "away"
                      ? "text-amber-300 font-semibold"
                      : "text-slate-400 font-normal"
                  }
                >
                  {statusLabel}
                </span>
                <span>·</span>
                <span className="text-slate-300">{recipientCompany}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition cursor-pointer"
              title="Close chat"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="p-3.5 bg-slate-50/80 h-80 overflow-y-auto space-y-3 custom-scrollbar flex flex-col relative">
          <div className="text-center my-1">
            <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200/80 px-3 py-1 rounded-full shadow-2xs">
              Direct Conversation with {recipientName}
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="my-auto text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center font-bold text-xl">
                💬
              </div>
              <p className="text-xs font-bold text-slate-700">No messages yet</p>
              <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto">
                Send a greeting or attach a document/photo to start your conversation with {recipientName}.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderEmail?.toLowerCase() === myEmail || (!msg.isIncoming && msg.senderEmail !== recipientEmail);
              const isHovered = hoveredMessageId === msg.id;
              const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

              return (
                <div
                  key={msg.id}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => {
                    setHoveredMessageId(null);
                    if (activeReactionPickerId === msg.id) setActiveReactionPickerId(null);
                  }}
                  className={`group relative flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  {/* Quoted Reply Reference */}
                  {msg.replyTo && (
                    <div
                      className={`mb-1 max-w-[78%] text-[10.5px] px-2.5 py-1 rounded-xl flex items-center gap-1.5 border ${
                        isMe
                          ? "bg-emerald-50 border-emerald-200 text-emerald-950 self-end mr-1"
                          : "bg-slate-200/70 border-slate-300 text-slate-700 self-start ml-1"
                      }`}
                    >
                      <CornerUpLeft size={11} className="shrink-0 text-slate-400" />
                      <span className="font-bold shrink-0">{msg.replyTo.senderName}:</span>
                      <span className="truncate">{msg.replyTo.text}</span>
                      {msg.replyTo.image && (
                        <img
                          src={msg.replyTo.image}
                          alt="preview"
                          className="w-5 h-5 rounded object-cover ml-1 shrink-0"
                        />
                      )}
                    </div>
                  )}

                  {/* Message Bubble + Action Buttons Row */}
                  <div className={`flex items-end gap-1.5 max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                    {/* Message Bubble */}
                    <div
                      className={`relative px-3.5 py-2.5 rounded-2xl text-xs shadow-2xs transition ${
                        isMe
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-xs"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs"
                      }`}
                    >
                      {/* Attached Image inside Bubble */}
                      {msg.image && (
                        <div className="mb-2 relative rounded-xl overflow-hidden border border-black/10 group/img">
                          <img
                            src={msg.image}
                            alt="Attached media"
                            onClick={() => setLightboxImage(msg.image)}
                            className="max-h-48 w-full object-cover cursor-pointer hover:scale-102 transition duration-200"
                          />
                          <button
                            type="button"
                            onClick={() => setLightboxImage(msg.image)}
                            title="Expand photo"
                            className="absolute bottom-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition cursor-pointer"
                          >
                            <Maximize2 size={13} />
                          </button>
                        </div>
                      )}

                      {/* Text Content */}
                      {msg.text && (
                        <p className={`leading-relaxed whitespace-pre-wrap break-words ${msg.text === "👍" ? "text-3xl py-0.5" : ""}`}>
                          {msg.text}
                        </p>
                      )}

                      {/* Reaction Badges on Bubble Bottom */}
                      {hasReactions && (
                        <div
                          className={`absolute -bottom-2.5 flex items-center gap-0.5 bg-white border border-slate-200 shadow-xs px-1.5 py-0.5 rounded-full text-[10px] ${
                            isMe ? "right-1" : "left-1"
                          }`}
                        >
                          {Object.entries(msg.reactions).map(([emoji, users]) => (
                            <span
                              key={emoji}
                              title={`${users.length} reaction(s)`}
                              onClick={() => onReactMessage(msg.id, emoji)}
                              className="cursor-pointer hover:scale-115 transition flex items-center gap-0.5"
                            >
                              <span>{emoji}</span>
                              {users.length > 1 && <span className="font-bold text-slate-600 text-[9px]">{users.length}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Hover Messenger Actions (React, Reply, Delete) */}
                    <div
                      className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150 relative ${
                        isHovered ? "opacity-100" : ""
                      }`}
                    >
                      {/* React Button */}
                      <button
                        type="button"
                        onClick={() => setActiveReactionPickerId(activeReactionPickerId === msg.id ? null : msg.id)}
                        title="React with Emoji"
                        className="p-1 rounded-full text-slate-400 hover:text-amber-500 hover:bg-slate-200/80 transition cursor-pointer"
                      >
                        <Smile size={14} />
                      </button>

                      {/* Reply Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(msg);
                          if (inputRef.current) inputRef.current.focus();
                        }}
                        title="Reply to this message"
                        className="p-1 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-slate-200/80 transition cursor-pointer"
                      >
                        <Reply size={14} />
                      </button>

                      {/* Delete Button (if sender is me) */}
                      {isMe && onDeleteMessage && (
                        <button
                          type="button"
                          onClick={() => onDeleteMessage(msg.id)}
                          title="Delete message"
                          className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-slate-200/80 transition cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                      {/* Emoji Reaction Floating Picker */}
                      {activeReactionPickerId === msg.id && (
                        <div className={`absolute bottom-full mb-1 z-30 flex items-center gap-1 p-1 bg-white rounded-full shadow-lg border border-slate-200 animate-in zoom-in-90 ${
                          isMe ? "right-0" : "left-0"
                        }`}>
                          {EMOJI_REACTIONS.map(({ emoji, label }) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                onReactMessage(msg.id, emoji);
                                setActiveReactionPickerId(null);
                              }}
                              title={label}
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-sm hover:scale-125 transition cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timestamp & Status */}
                  <div className={`flex items-center gap-1 text-[9px] text-slate-400 mt-1 px-1 ${isMe ? "self-end" : "self-start"}`}>
                    <span>{msg.time}</span>
                    {isMe && <CheckCheck size={12} className="text-emerald-600" />}
                  </div>
                </div>
              );
            })
          )}
          {/* Animated Messenger Typing Bubble */}
          {isRecipientTyping && (
            <div className="flex items-center gap-2 self-start animate-in fade-in slide-in-from-bottom-2 duration-150 my-1">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-emerald-400 font-extrabold text-[9px] flex items-center justify-center shrink-0 shadow-2xs">
                {recipientInitials}
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs px-3.5 py-2 shadow-2xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"></span>
                <span className="text-[10px] text-slate-500 font-medium ml-1">{recipientName} is typing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Replying Banner */}
        {replyingTo && (
          <div className="bg-emerald-50/90 border-t border-emerald-200 px-3 py-1.5 flex items-center justify-between text-xs text-emerald-950 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 min-w-0">
              <CornerUpLeft size={13} className="text-emerald-700 shrink-0" />
              <span className="truncate">
                Replying to <strong>{replyingTo.senderName}</strong>: {replyingTo.text || "Photo"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 rounded-full cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Selected Image Attachment Preview Bar */}
        {imagePreview && (
          <div className="bg-slate-100 border-t border-slate-200 p-2 px-3 flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2.5">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-300">
                <img src={imagePreview} alt="Upload preview" className="w-full h-full object-cover" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-800">Photo attached</p>
                <p className="text-[10px] text-slate-400">Ready to send with message</p>
              </div>
            </div>
            <button
              type="button"
              onClick={removeSelectedImage}
              className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-rose-600 transition cursor-pointer"
              title="Remove image"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-[10.5px]">
          {[
            "👋 Kumusta po?",
            "📋 Official Memo Follow-up",
            "📄 Sent Accomplishment Report",
            "✅ Noted & Approved"
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setInputText(prompt);
                if (onTypingSignal && recipientEmail) onTypingSignal(recipientEmail, true);
              }}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-medium transition cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input & Media Bar */}
        <form onSubmit={handleSubmit} className="p-2.5 px-3 bg-white flex items-center gap-2">
          {/* Image Attach Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach Picture / Photo"
            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition cursor-pointer shrink-0"
          >
            <Image size={18} />
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={`Message ${recipientName}...`}
            className="flex-1 bg-slate-100/90 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
          />

          {/* Dynamic Send / Quick Thumbs Up button */}
          {inputText.trim() || selectedImage ? (
            <button
              type="submit"
              disabled={isUploadingImage}
              className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white shadow-md shadow-emerald-600/20 transition cursor-pointer shrink-0"
              title="Send message"
            >
              {isUploadingImage ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSendQuickThumbsUp}
              className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-2xl transition cursor-pointer shrink-0"
              title="Send thumbs up"
            >
              <ThumbsUp size={18} />
            </button>
          )}
        </form>
      </div>

      {/* Lightbox Modal for Full Image Viewing */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition cursor-pointer z-10"
            >
              <X size={18} />
            </button>
            <img
              src={lightboxImage}
              alt="Full size preview"
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </>
  );
}
