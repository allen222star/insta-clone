from pydantic import BaseModel, EmailStr, Field

LANGS = {"ko", "en", "ja", "zh", "es", "fr"}


class SignupIn(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(default="", max_length=100)


class LoginIn(BaseModel):
    username: str
    password: str


class CommentIn(BaseModel):
    content: str = Field(min_length=1, max_length=2200)


class PostEditIn(BaseModel):
    caption: str | None = Field(default=None, max_length=4000)
    location: str | None = Field(default=None, max_length=100)


class MessageIn(BaseModel):
    content: str = Field(default="", max_length=2200)
    post_id: int | None = None


class PasswordIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6, max_length=128)


class NotificationPrefs(BaseModel):
    likes: bool | None = None
    comments: bool | None = None
    follows: bool | None = None
    messages: bool | None = None
    stories: bool | None = None


class SettingsIn(BaseModel):
    is_private: bool | None = None
    show_activity: bool | None = None
    suggest_account: bool | None = None
    language: str | None = Field(default=None, max_length=10)
    notifications: NotificationPrefs | None = None
