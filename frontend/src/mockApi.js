import { store } from "./mockData";

function wait(data) {
  return new Promise((resolve) => setTimeout(() => resolve({ data }), 40));
}

function fail(detail, status = 400) {
  const err = new Error(detail);
  err.response = { data: { detail }, status };
  throw err;
}

function meId() {
  const t = localStorage.getItem("ig_token") || "";
  if (t.startsWith("mock.")) return Number(t.slice(5)) || 0;
  return 0;
}

function userRow(id) {
  return store.users.find((u) => u.id === id);
}

function brief(u) {
  return { id: u.id, username: u.username, avatar_url: u.avatar_url, full_name: u.full_name };
}

function counts(id) {
  return {
    posts_count: store.posts.filter((p) => p.user_id === id).length,
    followers_count: store.follows.filter(([, b]) => b === id).length,
    following_count: store.follows.filter(([a]) => a === id).length,
  };
}

function publicUser(u, me) {
  return {
    id: u.id,
    username: u.username,
    full_name: u.full_name,
    bio: u.bio,
    website: u.website,
    avatar_url: u.avatar_url,
    is_private: !!u.is_private,
    is_me: me === u.id,
    is_following: store.follows.some(([a, b]) => a === me && b === u.id),
    ...counts(u.id),
  };
}

function meUser(u) {
  return { ...publicUser(u, u.id), email: u.email, is_admin: !!u.is_admin, created_at: u.created_at };
}

function postCard(p, me) {
  const u = userRow(p.user_id);
  const images = p.images?.length ? p.images : [p.image_url];
  return {
    id: p.id,
    image_url: images[0],
    images,
    caption: p.caption,
    location: p.location || "",
    created_at: p.created_at,
    like_count: store.likes.filter(([, pid]) => pid === p.id).length,
    comment_count: store.comments.filter((c) => c.post_id === p.id).length,
    liked_by_me: store.likes.some(([uid, pid]) => uid === me && pid === p.id),
    saved_by_me: store.saves.some(([uid, pid]) => uid === me && pid === p.id),
    user: brief(u),
  };
}

function page(items, limit, offset) {
  const slice = items.slice(offset, offset + limit);
  return { items: slice, limit, offset, has_more: offset + limit < items.length };
}

function fileUrl(file) {
  if (!file || typeof file === "string") return file || "";
  return URL.createObjectURL(file);
}

export const mockAuth = {
  async login({ username, password }) {
    const ident = String(username || "").trim().toLowerCase();
    const u = store.users.find((x) => x.username === ident || x.email === ident);
    if (!u || u.password !== password) fail("사용자 이름 또는 비밀번호가 올바르지 않습니다.", 401);
    return wait({ access_token: `mock.${u.id}`, token_type: "bearer", user: meUser(u) });
  },
  async signup({ email, username, password, full_name }) {
    const name = String(username || "").trim().toLowerCase();
    if (store.users.some((u) => u.username === name)) fail("이미 사용 중인 사용자 이름입니다.", 409);
    const u = {
      id: store.nextIds.user++,
      username: name,
      email: String(email || "").toLowerCase(),
      password,
      full_name: full_name || "",
      bio: "",
      website: "",
      avatar_url: "",
    };
    store.users.push(u);
    return wait({ access_token: `mock.${u.id}`, token_type: "bearer", user: meUser(u) });
  },
  async me() {
    const u = userRow(meId());
    if (!u) fail("로그인이 필요합니다.", 401);
    return wait(meUser(u));
  },
  async changePassword({ old_password, new_password }) {
    const u = userRow(meId());
    if (!u) fail("로그인이 필요합니다.", 401);
    if (u.password !== old_password) fail("이전 비밀번호가 올바르지 않습니다.", 400);
    if (String(new_password || "").length < 6) fail("비밀번호는 6자 이상이어야 합니다.", 400);
    u.password = new_password;
    return wait({ ok: true });
  },
};

export const mockUsers = {
  async get(username) {
    const u = store.users.find((x) => x.username === String(username).toLowerCase());
    if (!u) fail("사용자를 찾을 수 없습니다.", 404);
    return wait(publicUser(u, meId()));
  },
  async updateMe(form) {
    const u = userRow(meId());
    const full = form.get?.("full_name");
    const bio = form.get?.("bio");
    const website = form.get?.("website");
    const avatar = form.get?.("avatar");
    if (full != null) u.full_name = full;
    if (bio != null) u.bio = bio;
    if (website != null) u.website = website;
    if (avatar && avatar.name) u.avatar_url = fileUrl(avatar);
    const priv = form.get?.("is_private");
    if (priv != null && priv !== "") u.is_private = String(priv) === "true" || priv === "1" || priv === "on";
    return wait(meUser(u));
  },
  async posts(username, params = {}) {
    const u = store.users.find((x) => x.username === String(username).toLowerCase());
    if (!u) fail("사용자를 찾을 수 없습니다.", 404);
    const me = meId();
    const limit = Number(params.limit || 12);
    const offset = Number(params.offset || 0);
    if (u.is_private && me !== u.id && !store.follows.some(([a, b]) => a === me && b === u.id)) {
      return wait(page([], limit, offset));
    }
    const list = store.posts.filter((p) => p.user_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return wait(page(list.map((p) => postCard(p, me)), limit, offset));
  },
  async follow(username) {
    const u = store.users.find((x) => x.username === String(username).toLowerCase());
    const me = meId();
    if (u.id === me) fail("자기 자신은 팔로우할 수 없습니다.", 409);
    if (!store.follows.some(([a, b]) => a === me && b === u.id)) {
      store.follows.push([me, u.id]);
      store.notifications.unshift({
        id: store.nextIds.notif++,
        user_id: u.id,
        actor_id: me,
        type: "follow",
        post_id: null,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }
    return wait(publicUser(u, me));
  },
  async unfollow(username) {
    const u = store.users.find((x) => x.username === String(username).toLowerCase());
    const me = meId();
    store.follows = store.follows.filter(([a, b]) => !(a === me && b === u.id));
    return wait(publicUser(u, me));
  },
  async suggested(limit = 5) {
    const me = meId();
    const following = new Set(store.follows.filter(([a]) => a === me).map(([, b]) => b));
    const list = store.users.filter((u) => u.id !== me && !following.has(u.id)).slice(0, limit);
    return wait(list.map((u) => publicUser(u, me)));
  },
  async search(q) {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return wait({ items: [], limit: 20, offset: 0, has_more: false });
    const list = store.users.filter(
      (u) => u.username.includes(query) || u.full_name.toLowerCase().includes(query)
    );
    return wait({ items: list.map((u) => publicUser(u, meId())), limit: 20, offset: 0, has_more: false });
  },
  async followers(username) {
    const u = store.users.find((x) => x.username === String(username).toLowerCase());
    const ids = store.follows.filter(([, b]) => b === u.id).map(([a]) => a);
    return wait({ items: ids.map((id) => publicUser(userRow(id), meId())), limit: 20, offset: 0, has_more: false });
  },
  async following(username) {
    const u = store.users.find((x) => x.username === String(username).toLowerCase());
    const ids = store.follows.filter(([a]) => a === u.id).map(([, b]) => b);
    return wait({ items: ids.map((id) => publicUser(userRow(id), meId())), limit: 20, offset: 0, has_more: false });
  },
  async saved() {
    const me = meId();
    const ids = store.saves.filter(([uid]) => uid === me).map(([, pid]) => pid);
    const list = ids.map((id) => store.posts.find((p) => p.id === id)).filter(Boolean);
    return wait({ items: list.map((p) => postCard(p, me)), limit: 12, offset: 0, has_more: false });
  },
};

export const mockPosts = {
  async feed(params = {}) {
    const me = meId();
    const following = new Set(store.follows.filter(([a]) => a === me).map(([, b]) => b));
    following.add(me);
    let list = store.posts.filter((p) => following.has(p.user_id));
    const fallback = list.length === 0;
    if (fallback) list = [...store.posts];
    list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const limit = Number(params.limit || 12);
    const offset = Number(params.offset || 0);
    return wait({ ...page(list.map((p) => postCard(p, me)), limit, offset), fallback });
  },
  async explore(params = {}) {
    const list = [...store.posts].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const limit = Number(params.limit || 12);
    const offset = Number(params.offset || 0);
    return wait(page(list.map((p) => postCard(p, meId())), limit, offset));
  },
  async get(id) {
    const p = store.posts.find((x) => x.id === Number(id));
    if (!p) fail("게시물을 찾을 수 없습니다.", 404);
    return wait(postCard(p, meId()));
  },
  async create(form) {
    const files = form.getAll?.("images")?.filter((f) => f && f.name) || [];
    const one = form.get("image");
    if (one && one.name) files.unshift(one);
    const images = files.slice(0, 10).map(fileUrl);
    if (!images.length) fail("이미지가 필요합니다.", 400);
    const p = {
      id: store.nextIds.post++,
      user_id: meId(),
      images,
      caption: form.get("caption") || "",
      location: form.get("location") || "",
      created_at: new Date().toISOString(),
    };
    store.posts.unshift(p);
    return wait(postCard(p, meId()));
  },
  async remove(id) {
    store.posts = store.posts.filter((p) => p.id !== Number(id));
    return wait(null);
  },
  async like(id) {
    const me = meId();
    const pid = Number(id);
    if (!store.likes.some(([a, b]) => a === me && b === pid)) store.likes.push([me, pid]);
    return wait({ liked: true, like_count: store.likes.filter(([, b]) => b === pid).length });
  },
  async unlike(id) {
    const me = meId();
    const pid = Number(id);
    store.likes = store.likes.filter(([a, b]) => !(a === me && b === pid));
    return wait({ liked: false, like_count: store.likes.filter(([, b]) => b === pid).length });
  },
  async save(id) {
    const me = meId();
    const pid = Number(id);
    if (!store.saves.some(([a, b]) => a === me && b === pid)) store.saves.push([me, pid]);
    return wait({ saved: true });
  },
  async unsave(id) {
    store.saves = store.saves.filter(([a, b]) => !(a === meId() && b === Number(id)));
    return wait({ saved: false });
  },
  async comments(id) {
    const list = store.comments
      .filter((c) => c.post_id === Number(id))
      .map((c) => ({ id: c.id, content: c.content, created_at: c.created_at, user: brief(userRow(c.user_id)) }));
    return wait({ items: list, limit: 50, offset: 0, has_more: false });
  },
  async addComment(id, content) {
    const c = {
      id: store.nextIds.comment++,
      post_id: Number(id),
      user_id: meId(),
      content,
      created_at: new Date().toISOString(),
    };
    store.comments.push(c);
    return wait({ id: c.id, content, created_at: c.created_at, user: brief(userRow(meId())) });
  },
  async deleteComment(id) {
    store.comments = store.comments.filter((c) => c.id !== Number(id));
    return wait(null);
  },
  async byTag(name, params = {}) {
    const tag = `#${String(name).toLowerCase()}`;
    const list = store.posts.filter((p) => p.caption.toLowerCase().includes(tag));
    const limit = Number(params.limit || 12);
    const offset = Number(params.offset || 0);
    return wait(page(list.map((p) => postCard(p, meId())), limit, offset));
  },
  async edit(id, data) {
    const p = store.posts.find((x) => x.id === Number(id));
    if (!p) fail("게시물을 찾을 수 없습니다.", 404);
    p.caption = data.caption ?? p.caption;
    p.location = data.location ?? p.location;
    return wait(postCard(p, meId()));
  },
  async likes(id) {
    const ids = store.likes.filter(([, pid]) => pid === Number(id)).map(([uid]) => uid);
    return wait({ items: ids.map((uid) => publicUser(userRow(uid), meId())) });
  },
  async hashtags(q) {
    const query = String(q || "").replace(/^#/, "").toLowerCase();
    if (!query) return wait({ items: [] });
    const counts = {};
    for (const p of store.posts) {
      for (const m of p.caption.match(/#[\p{L}\p{N}_]+/gu) || []) {
        const name = m.slice(1).toLowerCase();
        if (name.includes(query)) counts[name] = (counts[name] || 0) + 1;
      }
    }
    return wait({ items: Object.entries(counts).map(([name, posts_count]) => ({ name, posts_count })) });
  },
};

export const mockStories = {
  async list() {
    const me = meId();
    const following = new Set(store.follows.filter(([a]) => a === me).map(([, b]) => b));
    following.add(me);
    const now = new Date().toISOString();
    const grouped = {};
    const visible = store.stories.filter((x) => x.expires_at > now && (!me || following.has(x.user_id)));
    for (const s of visible) {
      grouped[s.user_id] ??= [];
      grouped[s.user_id].push(s);
    }
    const result = Object.entries(grouped).map(([uid, items]) => ({
      user: brief(userRow(Number(uid))),
      items: items.map((s) => ({ id: s.id, image_url: s.image_url, created_at: s.created_at, expires_at: s.expires_at })),
      latest_at: items[items.length - 1].created_at,
    }));
    const mine = result.filter((g) => g.user.id === me);
    const others = result.filter((g) => g.user.id !== me);
    return wait([...mine, ...others]);
  },
  async create(form) {
    const image = form.get("image");
    const s = {
      id: store.nextIds.story++,
      user_id: meId(),
      image_url: fileUrl(image),
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    };
    store.stories.push(s);
    return wait({ id: s.id, image_url: s.image_url, created_at: s.created_at, expires_at: s.expires_at });
  },
  async remove(id) {
    store.stories = store.stories.filter((s) => s.id !== Number(id));
    return wait(null);
  },
};

export const mockNotifs = {
  async list() {
    const me = meId();
    const list = store.notifications
      .filter((n) => n.user_id === me)
      .map((n) => ({
        id: n.id,
        type: n.type,
        is_read: n.is_read,
        created_at: n.created_at,
        actor: brief(userRow(n.actor_id)),
        post: n.post_id ? { id: n.post_id, image_url: store.posts.find((p) => p.id === n.post_id)?.images[0] } : null,
      }));
    return wait(list);
  },
  async read() {
    const me = meId();
    store.notifications.forEach((n) => {
      if (n.user_id === me) n.is_read = true;
    });
    return wait({ ok: true });
  },
  async unread() {
    const me = meId();
    return wait({ count: store.notifications.filter((n) => n.user_id === me && !n.is_read).length });
  },
};

export const mockMsgs = {
  async conversations() {
    const me = meId();
    const map = new Map();
    for (const m of [...store.messages].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
      const other = m.sender_id === me ? m.receiver_id : m.sender_id;
      if (m.sender_id !== me && m.receiver_id !== me) continue;
      if (map.has(other)) continue;
      map.set(other, {
        user: brief(userRow(other)),
        last_message: m.content || "게시물을 보냈습니다",
        last_at: m.created_at,
        unread_count: store.messages.filter((x) => x.sender_id === other && x.receiver_id === me && !x.is_read).length,
      });
    }
    return wait([...map.values()]);
  },
  async unread() {
    const me = meId();
    return wait({ count: store.messages.filter((m) => m.receiver_id === me && !m.is_read).length });
  },
  async thread(username) {
    const other = store.users.find((u) => u.username === String(username).toLowerCase());
    const me = meId();
    const items = store.messages
      .filter(
        (m) =>
          (m.sender_id === me && m.receiver_id === other.id) ||
          (m.sender_id === other.id && m.receiver_id === me)
      )
      .map((m) => ({
        id: m.id,
        sender_id: m.sender_id,
        receiver_id: m.receiver_id,
        content: m.content,
        is_read: m.is_read,
        created_at: m.created_at,
        post: m.post_id
          ? { id: m.post_id, image_url: store.posts.find((p) => p.id === m.post_id)?.images[0] }
          : null,
      }));
    store.messages.forEach((m) => {
      if (m.sender_id === other.id && m.receiver_id === me) m.is_read = true;
    });
    return wait({ items, limit: 50, offset: 0, has_more: false });
  },
  async send(username, payload) {
    const body = typeof payload === "string" ? { content: payload } : payload;
    const other = store.users.find((u) => u.username === String(username).toLowerCase());
    const m = {
      id: store.nextIds.message++,
      sender_id: meId(),
      receiver_id: other.id,
      content: body.content || "",
      post_id: body.post_id || null,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    store.messages.push(m);
    return wait({
      id: m.id,
      sender_id: m.sender_id,
      receiver_id: m.receiver_id,
      content: m.content,
      is_read: false,
      created_at: m.created_at,
      post: m.post_id ? { id: m.post_id, image_url: store.posts.find((p) => p.id === m.post_id)?.images[0] } : null,
    });
  },
};

const SETTINGS_DEFAULTS = {
  is_private: false,
  show_activity: true,
  suggest_account: true,
  language: "ko",
  notifications: {
    likes: true,
    comments: true,
    follows: true,
    messages: true,
    stories: true,
  },
};

function settingsKey() {
  return `ig_settings_${meId()}`;
}

function readSettings() {
  const u = userRow(meId());
  let extra = {};
  try {
    extra = JSON.parse(localStorage.getItem(settingsKey()) || "{}");
  } catch {
    extra = {};
  }
  return {
    ...SETTINGS_DEFAULTS,
    ...extra,
    is_private: extra.is_private ?? !!u?.is_private,
    notifications: { ...SETTINGS_DEFAULTS.notifications, ...(extra.notifications || {}) },
  };
}

export const mockSettings = {
  async get() {
    if (!meId()) fail("로그인이 필요합니다.", 401);
    return wait(readSettings());
  },
  async patch(body) {
    const u = userRow(meId());
    if (!u) fail("로그인이 필요합니다.", 401);
    const cur = readSettings();
    const next = {
      ...cur,
      ...body,
      notifications: { ...cur.notifications, ...(body.notifications || {}) },
    };
    if (body.is_private != null) u.is_private = !!body.is_private;
    localStorage.setItem(settingsKey(), JSON.stringify(next));
    return wait(next);
  },
};

