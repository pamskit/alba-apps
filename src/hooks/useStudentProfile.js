import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getRoleSession } from "@/utils/auth";

export function useStudentProfile({ initialFetch = true } = {}) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(initialFetch);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = getRoleSession("siswa");
      const nisSession = session?.nis ?? null;
      if (!nisSession) {
        setStudent(null);
        return;
      }

      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("siswa")
        .select("nis,nama_siswa,kelas,saldo,total_hutang")
        .eq("nis", nisSession)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setStudent(data ?? null);
    } catch (err) {
      console.error(err);
      setError(err);
      setStudent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialFetch) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchProfile();
  }, [fetchProfile, initialFetch]);

  return { student, loading, error, refresh: fetchProfile, setStudent };
}
