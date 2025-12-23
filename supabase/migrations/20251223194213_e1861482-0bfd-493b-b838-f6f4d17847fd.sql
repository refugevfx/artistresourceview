-- Add is_approved column to profiles table (default false for new signups)
ALTER TABLE public.profiles 
ADD COLUMN is_approved boolean NOT NULL DEFAULT false;

-- Update existing users to be approved (so current users aren't locked out)
UPDATE public.profiles SET is_approved = true;