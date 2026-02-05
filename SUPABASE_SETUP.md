# Supabase Setup for Auth

## 1. Connect to Supabase

Create a Supabase project at [supabase.com](https://supabase.com) and add these to `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous (public) key from the same API settings page |

Copy `.env.example` to `.env.local` and paste your values.

## 2. Fix: "Credentials not found" after signup

**By default, Supabase requires users to confirm their email before they can sign in.** Signup creates the account, but login fails until the user clicks the confirmation link.

To allow immediate login after signup:

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Providers** → **Email**
4. Turn **off** "Confirm email"

![Confirm email toggle](https://supabase.com/docs/img/auth/email-confirm-toggle.png)

## 3. (Optional) Use email confirmation

If you keep "Confirm email" enabled:

- Users receive a confirmation email after signup
- They must click the link before they can log in
- Configure email templates under **Authentication** → **Email Templates**

The app sends users back to `/login` after they confirm their email.
