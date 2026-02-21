import { createClient } from '@supabase/supabase-js';

// 替换为你的 Supabase 项目 URL 和 anon 密钥
const supabase = createClient('https://ufupwqkutrdutmcsspfx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdXB3cWt1dHJkdXRtY3NzcGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTQxMjksImV4cCI6MjA4NjY3MDEyOX0._zpRY8EE4OPewTARIbFpR50FMaKnu0AEwXrglQjFLCc');

export { supabase };