"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";

const supabase = createClient();

export default function AdminDashboardPage() {
   const [productCount, setProductCount] = useState(0);
   const [studentCount, setStudentCount] = useState(0);
   const [txnCountToday, setTxnCountToday] = useState(0);
   const [revenueToday, setRevenueToday] = useState(0);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      const loadMetrics = async () => {
         setLoading(true);
         try {
            const { data: produk } = await supabase.from("produk").select("id");
            const { data: siswa } = await supabase.from("siswa").select("nis");

            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const end = now.toISOString();

            const { data: txns } = await supabase
               .from("transaksi")
               .select("id,total_bayar,metode_pembayaran, status_pembayaran, created_at")
               .gte("created_at", startOfDay)
               .lte("created_at", end);

            setProductCount(produk?.length ?? 0);
            setStudentCount(siswa?.length ?? 0);
            setTxnCountToday(txns?.length ?? 0);
            setRevenueToday((txns ?? []).reduce((s, t) => s + Number(t.total_bayar || 0), 0));
         } catch (err) {
            console.error(err);
         } finally {
            setLoading(false);
         }
      };

      void loadMetrics();
   }, []);

   return (
      <div className="admin-dashboard">
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1>Dashboard Admin</h1>

         </div>

         {loading ? (
            <div>Memuat metrik...</div>
         ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 20 }}>
               <div className="metric-card">
                  <div className="metric-label">Produk</div>
                  <div className="metric-value">{productCount}</div>
               </div>
               <div className="metric-card">
                  <div className="metric-label">Siswa</div>
                  <div className="metric-value">{studentCount}</div>
               </div>
               <div className="metric-card">
                  <div className="metric-label">Transaksi Hari Ini</div>
                  <div className="metric-value">{txnCountToday}</div>
               </div>
               <div className="metric-card">
                  <div className="metric-label">Pemasukan Hari Ini</div>
                  <div className="metric-value">Rp {Number(revenueToday).toLocaleString()}</div>
               </div>
            </div>
         )}
      </div>
   );
}
