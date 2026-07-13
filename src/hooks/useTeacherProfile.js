import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getRoleSession } from "@/utils/auth";

export function useTeacherProfile({ initialFetch = true } = {}) {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(initialFetch);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = getRoleSession("guru");
      const nipSession = session?.nip ?? null;
      if (!nipSession) {
        setTeacher(null);
        return;
      }

      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("guru")
        .select("nip,nama_guru,bidang_studi,saldo,total_hutang")
        .eq("nip", nipSession)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setTeacher(data ?? null);
    } catch (err) {
      console.error(err);
      setError(err);
      setTeacher(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialFetch) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchProfile();
  }, [fetchProfile, initialFetch]);

  return { teacher, loading, error, refresh: fetchProfile, setTeacher };
}
