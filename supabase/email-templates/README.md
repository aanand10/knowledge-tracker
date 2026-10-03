# Email templates

Paste into Supabase: Authentication -> Emails -> Templates (requires custom SMTP).

| Template          | Subject                                 | File                |
| ----------------- | --------------------------------------- | ------------------- |
| Magic link or OTP | `Sign in to Recall`                     | magic-link.html     |
| Confirm sign up   | `Welcome to Recall: confirm your email` | confirm-signup.html |

Both include a one-time code (`{{ .Token }}`) that can be typed into the app's sign-in dialog.
