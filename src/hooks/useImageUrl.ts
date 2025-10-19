import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const DEFAULT_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET_CONTESTANT_IMAGES || 'contestant-images';

function parsePath(input: string): { bucket: string; path: string } | null {
  if (!input) return null;
  if (/^https?:\/\//i.test(input)) return null;
  const m = input.match(/^([^/]+)\/(.+)$/);
  if (m) return { bucket: m[1], path: m[2] };
  return { bucket: DEFAULT_BUCKET, path: input };
}

export function useImageUrl(urlOrPath?: string | null, expiresInSec = 60 * 60 * 8) {
  const [resolved, setResolved] = useState<string | null>(null);

  const direct = useMemo(() => {
    if (!urlOrPath) return null;
    if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
    if (/^data:/i.test(urlOrPath)) return urlOrPath; // data URL をそのまま返す
    return null;
  }, [urlOrPath]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!urlOrPath) { setResolved(null); return; }
      if (direct) { setResolved(direct); return; }

      const parsed = parsePath(urlOrPath);
      if (!parsed) { setResolved(null); return; }

      // Try signed URL first (supports private buckets)
      try {
        const { data, error } = await supabase
          .storage
          .from(parsed.bucket)
          .createSignedUrl(parsed.path, expiresInSec);
        if (!cancelled && data?.signedUrl) {
          setResolved(data.signedUrl);
          return;
        }
        if (error) throw error;
      } catch {
        // Fallback to public URL
        try {
          const { data } = supabase.storage.from(parsed.bucket).getPublicUrl(parsed.path);
          if (!cancelled) setResolved(data.publicUrl || null);
        } catch {
          if (!cancelled) setResolved(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [urlOrPath, direct, expiresInSec]);

  return resolved;
}
