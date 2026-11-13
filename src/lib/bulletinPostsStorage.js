/**
 * bulletinPostsStorage.js
 * Dedicated Database Storage Service for Company Bulletin Board.
 * Features Facebook-style posts, image attachments, reactions (likes), and comments.
 * All persisted to the Supabase Cloud Database (user_settings key: 'company_bulletin_feed_master').
 */

import { supabase } from "./supabase.js";

const BULLETIN_FEED_KEY = "company_bulletin_feed_master";

// In-memory session cache for instant UI responsiveness
let memoryPostsCache = null;

// Initial starter announcement if feed is completely fresh
const INITIAL_STARTER_POSTS = [
  {
    id: "post_starter_official_welcome",
    authorName: "H R M D",
    authorEmail: "admin@hrhub.com",
    authorRole: "HR Administrator",
    authorCompany: "Simpal Group of Companies",
    category: "Official Memo",
    title: "Welcome to HrHub Enterprise Company Bulletin",
    content: "Welcome to the official company communication board! Here you can find enterprise-wide announcements, policy memorandums, employee milestones, and updates across all Simpal Group subsidiaries.\n\nFeel free to like, acknowledge, and leave comments below to engage with your colleagues across all branches.",
    imageUrl: null,
    likes: ["admin@hrhub.com"],
    comments: [
      {
        id: "comm_welcome_1",
        authorName: "Remark Joy Gaviola",
        authorEmail: "remarkjoymark@gmail.com",
        authorRole: "Team Member",
        authorCompany: "Lucky Betplay Corporation",
        content: "Noted and acknowledged! Looking forward to seamless communication across our branch locations.",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ],
    pinned: true,
    isOfficial: true,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

/**
 * Fetch all bulletin posts from Supabase database.
 */
export async function getBulletinPostsFromDb() {
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("settings_json")
      .eq("user_id", BULLETIN_FEED_KEY)
      .maybeSingle();

    if (!error && data?.settings_json?.posts && Array.isArray(data.settings_json.posts)) {
      memoryPostsCache = data.settings_json.posts;
      return { posts: memoryPostsCache, source: "database" };
    }
  } catch (err) {
    console.warn("Notice: Fetching bulletin posts from database fallback to memory:", err);
  }

  if (memoryPostsCache && Array.isArray(memoryPostsCache) && memoryPostsCache.length > 0) {
    return { posts: memoryPostsCache, source: "memory" };
  }

  // First-time fallback seed
  memoryPostsCache = INITIAL_STARTER_POSTS;
  // Background seed save to database
  saveFeedToDatabase(memoryPostsCache).catch(() => {});
  return { posts: memoryPostsCache, source: "seed" };
}

/**
 * Helper to persist full posts array to database
 */
async function saveFeedToDatabase(postsArray) {
  try {
    await supabase
      .from("user_settings")
      .upsert({
        user_id: BULLETIN_FEED_KEY,
        settings_json: { posts: postsArray, updatedAt: new Date().toISOString() },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
  } catch (err) {
    console.warn("Notice saving bulletin feed to database:", err);
  }
}

/**
 * Create a new bulletin post in the database.
 */
export async function createBulletinPostInDb(postData) {
  const currentFeedRes = await getBulletinPostsFromDb();
  const currentFeed = currentFeedRes.posts || [];

  const newPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    authorName: postData.authorName || "HR Admin",
    authorEmail: (postData.authorEmail || "").trim().toLowerCase(),
    authorRole: postData.authorRole || "Team Member",
    authorCompany: postData.authorCompany || "Simpal Group of Companies",
    category: postData.category || "Announcement",
    title: postData.title ? postData.title.trim() : "",
    content: postData.content ? postData.content.trim() : "",
    imageUrl: postData.imageUrl || null,
    likes: [],
    comments: [],
    pinned: Boolean(postData.pinned),
    isOfficial: Boolean(postData.isOfficial || postData.category === "Official Memo"),
    createdAt: new Date().toISOString()
  };

  // Pinned posts stay at the top; newest posts first
  const updatedFeed = [newPost, ...currentFeed];
  memoryPostsCache = updatedFeed;

  await saveFeedToDatabase(updatedFeed);

  // Also record in 'memos' table if title & content present
  try {
    await supabase.from("memos").insert({
      title: newPost.title || newPost.category,
      content: newPost.content,
      category: newPost.category,
      author_name: newPost.authorName
    });
  } catch {
    // Non-blocking schema fallback
  }

  return { success: true, post: newPost, allPosts: updatedFeed };
}

/**
 * Toggle Like / Reaction on a post
 */
export async function toggleLikeBulletinPostInDb(postId, userEmail) {
  if (!postId || !userEmail) return { success: false };
  const normalizedEmail = userEmail.trim().toLowerCase();

  const currentFeedRes = await getBulletinPostsFromDb();
  const currentFeed = currentFeedRes.posts || [];

  const updatedFeed = currentFeed.map((p) => {
    if (p.id === postId) {
      const existingLikes = Array.isArray(p.likes) ? p.likes : [];
      const hasLiked = existingLikes.some((e) => String(e).toLowerCase() === normalizedEmail);
      const newLikes = hasLiked
        ? existingLikes.filter((e) => String(e).toLowerCase() !== normalizedEmail)
        : [...existingLikes, normalizedEmail];
      return { ...p, likes: newLikes };
    }
    return p;
  });

  memoryPostsCache = updatedFeed;
  await saveFeedToDatabase(updatedFeed);

  const targetPost = updatedFeed.find((p) => p.id === postId);
  return { success: true, post: targetPost, allPosts: updatedFeed };
}

/**
 * Add a comment to a bulletin post
 */
export async function addCommentToBulletinPostInDb(postId, commentData) {
  if (!postId || !commentData.content?.trim()) return { success: false };

  const currentFeedRes = await getBulletinPostsFromDb();
  const currentFeed = currentFeedRes.posts || [];

  const newComment = {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    authorName: commentData.authorName || "Colleague",
    authorEmail: (commentData.authorEmail || "").trim().toLowerCase(),
    authorRole: commentData.authorRole || "Team Member",
    authorCompany: commentData.authorCompany || "Simpal Group of Companies",
    content: commentData.content.trim(),
    createdAt: new Date().toISOString()
  };

  const updatedFeed = currentFeed.map((p) => {
    if (p.id === postId) {
      const existingComments = Array.isArray(p.comments) ? p.comments : [];
      return { ...p, comments: [...existingComments, newComment] };
    }
    return p;
  });

  memoryPostsCache = updatedFeed;
  await saveFeedToDatabase(updatedFeed);

  const targetPost = updatedFeed.find((p) => p.id === postId);
  return { success: true, comment: newComment, post: targetPost, allPosts: updatedFeed };
}

/**
 * Delete a bulletin post (Author or HRMD)
 */
export async function deleteBulletinPostFromDb(postId) {
  if (!postId) return { success: false };

  const currentFeedRes = await getBulletinPostsFromDb();
  const currentFeed = currentFeedRes.posts || [];

  const updatedFeed = currentFeed.filter((p) => p.id !== postId);
  memoryPostsCache = updatedFeed;

  await saveFeedToDatabase(updatedFeed);
  return { success: true, allPosts: updatedFeed };
}

/**
 * Delete a comment from a bulletin post
 */
export async function deleteCommentFromBulletinPostInDb(postId, commentId) {
  if (!postId || !commentId) return { success: false };

  const currentFeedRes = await getBulletinPostsFromDb();
  const currentFeed = currentFeedRes.posts || [];

  const updatedFeed = currentFeed.map((p) => {
    if (p.id === postId) {
      const existingComments = Array.isArray(p.comments) ? p.comments : [];
      return { ...p, comments: existingComments.filter((c) => c.id !== commentId) };
    }
    return p;
  });

  memoryPostsCache = updatedFeed;
  await saveFeedToDatabase(updatedFeed);
  return { success: true, allPosts: updatedFeed };
}
