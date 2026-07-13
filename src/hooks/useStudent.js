import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getRoleSession } from "@/utils/auth";

const supabase = createClient();

export function useStudent({ initialFetch = true } = {}) {
  const [student, setStudent] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeNis, setActiveNis] = useState(null);
  const [loading, setLoading] = useState(initialFetch);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = getRoleSession("siswa");
      const nisSession = session?.nis ?? null;
      if (!nisSession) {
        setStudent(null);
        setActiveNis(null);
        setTransactions([]);
        return;
      }

      const { data: siswaData, error: siswaError } = await supabase
        .from("siswa")
        .select("nis,nama_siswa,kelas,total_hutang,saldo")
        .eq("nis", nisSession)
        .maybeSingle();

      if (siswaError) throw siswaError;
      const activeStudent = siswaData ?? null;
      if (!activeStudent) {
        setStudent(null);
        setActiveNis(null);
        setTransactions([]);
        return;
      }

      setActiveNis(activeStudent.nis);
      setStudent(activeStudent);

      const { data: transactionData, error: transactionError } = await supabase
        .from("transaksi")
        .select("id,transaction_type,order_status,payment_method,payment_status,amount_total,amount_paid,amount_due,created_at")
        .eq("nis_siswa", activeStudent.nis)
        .order("created_at", { ascending: false });

      if (transactionError) throw transactionError;

      setTransactions(transactionData ?? []);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialFetch) return;
    (async () => {
      await Promise.resolve();
      await fetch();
    })();
  }, [fetch, initialFetch]);

  return { student, transactions, activeNis, loading, error, refresh: fetch, setStudent };
}
