// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ocgpxkptvnmomfthkcgx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jZ3B4a3B0dm5tb21mdGhrY2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2NTUxNDMsImV4cCI6MjA1NzIzMTE0M30.6pRDr8KjOja7XzZbGOJHSqiCO1YgcI363X46CHsOReM";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);