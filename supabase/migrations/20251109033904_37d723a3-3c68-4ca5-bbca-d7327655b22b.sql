-- Add favorited column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN favorited BOOLEAN NOT NULL DEFAULT false;