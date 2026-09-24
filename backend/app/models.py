from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    false,
    text,
    true,
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("length(username) BETWEEN 3 AND 30", name="ck_users_username_len"),
        {"sqlite_autoincrement": True},
    )

    id = Column(Integer, primary_key=True)
    username = Column(String(30, collation="NOCASE"), unique=True, nullable=False, index=True)
    email = Column(String(255, collation="NOCASE"), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False, default="", server_default="")
    bio = Column(String(150), nullable=False, default="", server_default="")
    website = Column(String(255), nullable=False, default="", server_default="")
    avatar_url = Column(String(500), nullable=True)
    is_private = Column(Boolean, nullable=False, default=False, server_default=false())
    is_admin = Column(Boolean, nullable=False, default=False, server_default=false())
    created_at = Column(String(40), nullable=False)

    posts = relationship("Post", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    saves = relationship("Save", back_populates="user", cascade="all, delete-orphan")
    stories = relationship("Story", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")


class UserSettings(Base):
    __tablename__ = "user_settings"
    __table_args__ = (
        CheckConstraint(
            "language IN ('ko','en','ja','zh','es','fr')",
            name="ck_user_settings_language",
        ),
    )

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    show_activity = Column(Boolean, nullable=False, default=True, server_default=true())
    suggest_account = Column(Boolean, nullable=False, default=True, server_default=true())
    language = Column(String(10), nullable=False, default="ko", server_default="ko")
    notify_likes = Column(Boolean, nullable=False, default=True, server_default=true())
    notify_comments = Column(Boolean, nullable=False, default=True, server_default=true())
    notify_follows = Column(Boolean, nullable=False, default=True, server_default=true())
    notify_messages = Column(Boolean, nullable=False, default=True, server_default=true())
    notify_stories = Column(Boolean, nullable=False, default=True, server_default=true())

    user = relationship("User", back_populates="settings")


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = (
        Index("ix_posts_created_at", "created_at"),
        {"sqlite_autoincrement": True},
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    caption = Column(Text, nullable=False, default="", server_default="")
    location = Column(String(100), nullable=False, default="", server_default="")
    created_at = Column(String(40), nullable=False)

    user = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")
    saves = relationship("Save", back_populates="post", cascade="all, delete-orphan")
    hashtags = relationship("PostHashtag", back_populates="post", cascade="all, delete-orphan")
    images = relationship(
        "PostImage",
        back_populates="post",
        cascade="all, delete-orphan",
        order_by="PostImage.sort_order",
    )


class PostImage(Base):
    __tablename__ = "post_images"
    __table_args__ = (
        UniqueConstraint("post_id", "sort_order", name="uq_post_images_order"),
        CheckConstraint("sort_order >= 0 AND sort_order <= 9", name="ck_post_images_order"),
        {"sqlite_autoincrement": True},
    )

    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0, server_default=text("0"))

    post = relationship("Post", back_populates="images")


class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follows_pair"),
        CheckConstraint("follower_id != following_id", name="ck_follows_no_self"),
        {"sqlite_autoincrement": True},
    )

    id = Column(Integer, primary_key=True)
    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    following_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(String(40), nullable=False)

    follower = relationship("User", foreign_keys=[follower_id])
    following = relationship("User", foreign_keys=[following_id])


class Like(Base):
    __tablename__ = "likes"
    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_likes_user_post"),
        {"sqlite_autoincrement": True},
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(String(40), nullable=False)

    user = relationship("User", back_populates="likes")
    post = relationship("Post", back_populates="likes")


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = (
        Index("ix_comments_post_created", "post_id", "created_at"),
        CheckConstraint("length(content) BETWEEN 1 AND 2200", name="ck_comments_content"),
        {"sqlite_autoincrement": True},
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    content = Column(String(2200), nullable=False)
    created_at = Column(String(40), nullable=False)

    user = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")


class Save(Base):
    __tablename__ = "saves"
    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_saves_user_post"),
        Index("ix_saves_user_created", "user_id", "created_at"),
        {"sqlite_autoincrement": True},
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(String(40), nullable=False)

    user = relationship("User", back_populates="saves")
    post = relationship("Post", back_populates="saves")


class Story(Base):
    __tablename__ = "stories"
    __table_args__ = {"sqlite_autoincrement": True}

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    created_at = Column(String(40), nullable=False)
    expires_at = Column(String(40), nullable=False, index=True)

    user = relationship("User", back_populates="stories")


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint(
            "type IN ('like','comment','follow','message')",
            name="ck_notifications_type",
        ),
        CheckConstraint("user_id != actor_id", name="ck_notifications_no_self"),
        Index("ix_notifications_user_created", "user_id", "created_at"),
        {"sqlite_autoincrement": True},
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(20), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False, server_default=false())
    created_at = Column(String(40), nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_id])
    post = relationship("Post")


class Hashtag(Base):
    __tablename__ = "hashtags"
    __table_args__ = (
        CheckConstraint(
            "length(name) BETWEEN 1 AND 50 AND instr(name, '#') = 0",
            name="ck_hashtags_name",
        ),
        {"sqlite_autoincrement": True},
    )

    id = Column(Integer, primary_key=True)
    name = Column(String(50, collation="NOCASE"), unique=True, nullable=False)

    posts = relationship("PostHashtag", back_populates="hashtag", cascade="all, delete-orphan")


class PostHashtag(Base):
    __tablename__ = "post_hashtags"
    __table_args__ = (
        UniqueConstraint("post_id", "hashtag_id", name="uq_post_hashtags"),
        Index("ix_post_hashtags_hashtag_id", "hashtag_id"),
        {"sqlite_autoincrement": True},
    )

    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    hashtag_id = Column(Integer, ForeignKey("hashtags.id", ondelete="CASCADE"), nullable=False)

    post = relationship("Post", back_populates="hashtags")
    hashtag = relationship("Hashtag", back_populates="posts")


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        CheckConstraint("sender_id != receiver_id", name="ck_messages_no_self"),
        CheckConstraint(
            "length(content) > 0 OR post_id IS NOT NULL",
            name="ck_messages_body",
        ),
        Index("ix_messages_thread", "sender_id", "receiver_id", "created_at"),
        {"sqlite_autoincrement": True},
    )

    id = Column(Integer, primary_key=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(String(2200), nullable=False, default="", server_default="")
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="SET NULL"), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False, server_default=false())
    created_at = Column(String(40), nullable=False)

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    post = relationship("Post")
