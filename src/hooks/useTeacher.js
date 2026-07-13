import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getRoleSession } from "@/utils/auth";

const supabase = createClient();

export function useTeacher({ initialFetch = true } = {}) {
  const [teacher, setTeacher] = useState(null);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeNip, setActiveNip] = useState(null);
  const [loading, setLoading] = useState(initialFetch);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = getRoleSession("guru");
      const nipSession = session?.nip ?? null;
      if (!nipSession) {
        setTeacher(null);
        setActiveNip(null);
        setOrders([]);
        setTransactions([]);
        return;
      }

      const { data: guruData, error: guruError } = await supabase
        .from("guru")
        .select("nip,nama_guru,bidang_studi,total_hutang,saldo")
        .eq("nip", nipSession)
        .maybeSingle();

      if (guruError) throw guruError;
      const activeTeacher = guruData ?? null;
      if (!activeTeacher) {
        setTeacher(null);
        setActiveNip(null);
        setOrders([]);
        return;
      }

      setActiveNip(activeTeacher.nip);
      setTeacher(activeTeacher);

      const [{ data: orderData, error: orderError }, { data: transactionData, error: transactionError }] = await Promise.all([
        supabase
          .from("order_guru")
          .select("id,metode_pembayaran,status_order,status_pembayaran,total_harga,created_at")
          .eq("nip_guru", activeTeacher.nip)
          .order("created_at", { ascending: false }),
        supabase
          .from("transaksi")
          .select("id,transaction_type,order_status,payment_method,payment_status,amount_total,amount_paid,amount_due,created_at")
          .eq("nip_guru", activeTeacher.nip)
          .order("created_at", { ascending: false }),
      ]);

      if (orderError) throw orderError;
      if (transactionError) throw transactionError;

      setOrders(orderData ?? []);
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

  return { teacher, orders, transactions, activeNip, loading, error, refresh: fetch, setTeacher };
}
