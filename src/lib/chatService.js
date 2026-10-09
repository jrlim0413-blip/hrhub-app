import { supabase } from "./supabase";

const LOCAL_CHATS_STORAGE_KEY = "hrhub_direct_chats_db_v1";
const LOCAL_READ_RECEIPTS_KEY = "hrhub_chat_read_receipts_v1";

/**
 * Generate a deterministic conversation key for 2 user emails
 */
export function getChatThreadKey(email1, email2) {
  if (!email1 || !email2) return "chat_general";
  const sorted = [email1.toLowerCase().trim(), email2.toLowerCase().trim()].sort();
  return `thread_${sorted[0]}_${sorted[1]}`;
}

/**
 * Format timestamp Messenger-style (e.g., 'Just now', '5m', '2h', 'Yesterday')
 */
export function formatMessengerTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 45) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Read receipts map: { [threadKey]: lastReadTimestamp }
 */
export function getStoredReadReceipts() {
  try {
    const raw = localStorage.getItem(LOCAL_READ_RECEIPTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function markThreadAsRead(myEmail, otherEmail) {
  if (!myEmail || !otherEmail) return;
  const key = getChatThreadKey(myEmail, otherEmail);
  const receipts = getStoredReadReceipts();
  receipts[key] = Date.now();
  try {
    localStorage.setItem(LOCAL_READ_RECEIPTS_KEY, JSON.stringify(receipts));
  } catch {}
  return receipts;
}

/**
 * Get all cached conversations from localStorage
 */
export function getStoredChatMap() {
  try {
    const raw = localStorage.getItem(LOCAL_CHATS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Fetch all conversations for the current user from Supabase and update local cache
 */
export async function fetchAllUserThreads(myEmail) {
  const localMap = getStoredChatMap();
  if (!myEmail) return localMap;

  const cleanEmail = myEmail.toLowerCase().trim();

  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .or(`sender_email.ilike.${cleanEmail},receiver_email.ilike.${cleanEmail}`)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Supabase all threads query note:", error.message);
      return localMap;
    }

    if (data && Array.isArray(data)) {
      const newMap = { ...localMap };
      data.forEach((row) => {
        const sEmail = row.sender_email?.toLowerCase();
        const rEmail = row.receiver_email?.toLowerCase();
        const threadKey = getChatThreadKey(sEmail, rEmail);

        if (!newMap[threadKey]) newMap[threadKey] = [];

        // Check if message already in thread
        const exists = newMap[threadKey].some((m) => m.id === row.id);
        const formatted = {
          id: row.id,
          senderEmail: sEmail,
          senderName: row.sender_name || "Team Member",
          receiverEmail: rEmail,
          text: row.content || "",
          image: row.image_url || undefined,
          replyTo: row.reply_to || undefined,
          reactions: row.reactions || {},
          time: new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          timestamp: new Date(row.created_at).getTime(),
          isIncoming: sEmail !== cleanEmail
        };

        if (exists) {
          newMap[threadKey] = newMap[threadKey].map((m) => (m.id === row.id ? formatted : m));
        } else {
          newMap[threadKey].push(formatted);
        }
      });

      saveStoredChatMap(newMap);
      return newMap;
    }
  } catch (err) {
    console.warn("Error fetching all user threads:", err);
  }

  return localMap;
}

/**
 * Save conversations map to localStorage
 */
export function saveStoredChatMap(map) {
  try {
    localStorage.setItem(LOCAL_CHATS_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * Fetch messages from Supabase chat_messages table with local cache fallback
 */
export async function fetchConversationMessages(myEmail, recipientEmail) {
  const threadKey = getChatThreadKey(myEmail, recipientEmail);
  const localMap = getStoredChatMap();
  const cachedMessages = localMap[threadKey] || [];

  if (!myEmail || !recipientEmail) {
    return cachedMessages;
  }

  const cleanMyEmail = myEmail.toLowerCase().trim();
  const cleanRecipientEmail = recipientEmail.toLowerCase().trim();

  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .or(
        `and(sender_email.ilike.${cleanMyEmail},receiver_email.ilike.${cleanRecipientEmail}),and(sender_email.ilike.${cleanRecipientEmail},receiver_email.ilike.${cleanMyEmail})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Supabase chat_messages query note:", error.message);
      return cachedMessages;
    }

    if (data && Array.isArray(data)) {
      const formatted = data.map((row) => ({
        id: row.id,
        senderEmail: row.sender_email?.toLowerCase(),
        senderName: row.sender_name || "Team Member",
        receiverEmail: row.receiver_email?.toLowerCase(),
        text: row.content || "",
        image: row.image_url || undefined,
        replyTo: row.reply_to || undefined,
        reactions: row.reactions || {},
        time: new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: new Date(row.created_at).getTime(),
        isIncoming: row.sender_email?.toLowerCase() !== cleanMyEmail
      }));

      // Update local cache
      localMap[threadKey] = formatted;
      saveStoredChatMap(localMap);
      return formatted;
    }
  } catch (err) {
    console.warn("Error fetching conversation messages:", err);
  }

  return cachedMessages;
}

/**
 * Send a message to Supabase chat_messages table and cache locally
 */
export async function sendChatMessage({
  senderEmail,
  senderName,
  receiverEmail,
  text,
  image,
  replyTo
}) {
  const cleanSender = (senderEmail || "admin@hrhub.com").toLowerCase().trim();
  const cleanReceiver = (receiverEmail || "").toLowerCase().trim();
  const threadKey = getChatThreadKey(cleanSender, cleanReceiver);

  const localMsgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date();

  const newLocalMessage = {
    id: localMsgId,
    senderEmail: cleanSender,
    senderName: senderName || "Team Member",
    receiverEmail: cleanReceiver,
    text: text || "",
    image: image || undefined,
    replyTo: replyTo || undefined,
    reactions: {},
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    timestamp: now.getTime(),
    isIncoming: false
  };

  // 1. Optimistic update in localStorage
  const localMap = getStoredChatMap();
  localMap[threadKey] = [...(localMap[threadKey] || []), newLocalMessage];
  saveStoredChatMap(localMap);

  // 2. Persist to Supabase chat_messages
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert([
        {
          id: localMsgId,
          sender_email: cleanSender,
          sender_name: senderName || "Team Member",
          receiver_email: cleanReceiver,
          content: text || "",
          image_url: image || null,
          reply_to: replyTo || null,
          reactions: {},
          created_at: now.toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.warn("Supabase chat_messages insert fallback:", error.message);
    } else if (data) {
      return {
        ...newLocalMessage,
        id: data.id || localMsgId
      };
    }
  } catch (err) {
    console.warn("Error inserting chat message to Supabase:", err);
  }

  return newLocalMessage;
}

/**
 * React or toggle emoji reaction on a chat message
 */
export async function reactChatMessage({
  messageId,
  emoji,
  userEmail,
  threadKey,
  currentMessages
}) {
  const cleanUserEmail = (userEmail || "admin@hrhub.com").toLowerCase().trim();
  const localMap = getStoredChatMap();
  const thread = currentMessages || localMap[threadKey] || [];

  let targetMsg = null;
  const updatedThread = thread.map((msg) => {
    if (msg.id !== messageId) return msg;

    const currentReactions = { ...(msg.reactions || {}) };
    const usersForEmoji = new Set(currentReactions[emoji] || []);

    if (usersForEmoji.has(cleanUserEmail)) {
      usersForEmoji.delete(cleanUserEmail);
      if (usersForEmoji.size === 0) {
        delete currentReactions[emoji];
      } else {
        currentReactions[emoji] = Array.from(usersForEmoji);
      }
    } else {
      usersForEmoji.add(cleanUserEmail);
      currentReactions[emoji] = Array.from(usersForEmoji);
    }

    targetMsg = { ...msg, reactions: currentReactions };
    return targetMsg;
  });

  localMap[threadKey] = updatedThread;
  saveStoredChatMap(localMap);

  // Persist reactions to Supabase
  if (targetMsg) {
    try {
      await supabase
        .from("chat_messages")
        .update({ reactions: targetMsg.reactions })
        .eq("id", messageId);
    } catch (err) {
      console.warn("Supabase reaction update notice:", err);
    }
  }

  return updatedThread;
}

/**
 * Delete a chat message from database and local storage
 */
export async function deleteChatMessage({
  messageId,
  threadKey,
  currentMessages
}) {
  const localMap = getStoredChatMap();
  const thread = currentMessages || localMap[threadKey] || [];
  const updatedThread = thread.filter((msg) => msg.id !== messageId);

  localMap[threadKey] = updatedThread;
  saveStoredChatMap(localMap);

  try {
    await supabase.from("chat_messages").delete().eq("id", messageId);
  } catch (err) {
    console.warn("Supabase message delete notice:", err);
  }

  return updatedThread;
}

/**
 * Compress an image file using browser Canvas (downscales to max 1200px, 75% quality WebP)
 * Drops file size from 4MB to ~40KB - 80KB!
 */
export async function compressImageFile(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/")) {
      resolve({ file, dataUrl: null, blob: null });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = "image/webp";
        let dataUrl = "";
        try {
          dataUrl = canvas.toDataURL(mimeType, quality);
        } catch {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        canvas.toBlob(
          (blob) => {
            resolve({
              blob: blob || file,
              dataUrl,
              originalSize: file.size,
              compressedSize: blob ? blob.size : dataUrl.length
            });
          },
          mimeType,
          quality
        );
      };
      img.onerror = () => resolve({ file, dataUrl: e.target.result, blob: file });
      img.src = e.target.result;
    };
    reader.onerror = () => resolve({ file, dataUrl: null, blob: file });
    reader.readAsDataURL(file);
  });
}

/**
 * Upload image to Supabase Storage bucket 'chat-attachments'
 * Returns the short public URL (~80 chars) if uploaded, or returns null to use compressed dataUrl
 */
export async function uploadChatAttachment(blobOrFile, senderEmail) {
  if (!blobOrFile) return null;

  try {
    const cleanSender = (senderEmail || "user").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const filename = `${cleanSender}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.webp`;
    const filePath = `chats/${filename}`;

    const { data, error } = await supabase.storage
      .from("chat-attachments")
      .upload(filePath, blobOrFile, {
        contentType: blobOrFile.type || "image/webp",
        upsert: true
      });

    if (error) {
      console.warn("Supabase Storage bucket notice:", error.message);
      return null;
    }

    if (data) {
      const { data: publicData } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(filePath);

      if (publicData?.publicUrl) {
        return publicData.publicUrl;
      }
    }
  } catch (err) {
    console.warn("Storage upload exception:", err);
  }

  return null;
}

