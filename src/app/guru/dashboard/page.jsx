"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getAuthSession } from "@/utils/auth";
import Loading from "@/components/Loading";
import "./dashboard.css";

const supabase = createClient();
let hasTriggeredAutoTopup = false;

export default function DashboardGuruPage() {
   const [activeNip, setActiveNip] = useState(null);
   const [teacher, setTeacher] = useState(null);
   const [orders, setOrders] = useState([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      fetchData();
   }, []);

   async function fetchData() {
      setLoading(true);
      try {
         const session = getAuthSession();
         const nipSession = session?.role === "guru" ? session.nip : null;
         if (!nipSession) {
            setTeacher(null);
            setActiveNip(null);
            return;
         }

         if (!hasTriggeredAutoTopup) {
            hasTriggeredAutoTopup = true;
            await fetch("/api/guru/auto-topup", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({}),
            });
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
            return;
         }

         setActiveNip(activeTeacher.nip);
         setTeacher(activeTeacher);

         const { data: orderData, error: orderError } = await supabase
            .from("order_guru")
            .select("id,metode_pembayaran,status_order,status_pembayaran,total_harga,created_at")
            .eq("nip_guru", activeTeacher.nip)
            .order("created_at", { ascending: false });

         if (orderError) throw orderError;

         setOrders(orderData ?? []);
      } catch (error) {
         console.error(error);
      } finally {
         setLoading(false);
      }
   }

   const debtText = useMemo(() => {
      if (!teacher) return "";
      return teacher.total_hutang > 0
         ? `Rp ${Number(teacher.total_hutang).toLocaleString()}`
         : "Rp 0";
   }, [teacher]);

   const saldoText = useMemo(() => {
      if (!teacher) return "";
      return `Rp ${Number(teacher.saldo ?? 0).toLocaleString()}`;
   }, [teacher]);

   return (
      <div className="guru-dashboard">
         <div className="dashboard-overview">
            <div className="dashboard-card dashboard-card--profile">
               <div className="dashboard-card__heading">Profil Guru</div>
               {loading ? (
                  <Loading message="Memuat..." size="small" />
               ) : !teacher ? (
                  <div className="dashboard-card__empty">Guru tidak ditemukan.</div>
               ) : (
                  <div className="dashboard-card__content">
                     <div className="dashboard-card__field">
                        <span className="dashboard-card__label">Nama</span>
                        <span>{teacher.nama_guru}</span>
                     </div>
                     <div className="dashboard-card__field">
                        <span className="dashboard-card__label">NIP</span>
                        <span>{teacher.nip}</span>
                     </div>
                     <div className="dashboard-card__field">
                        <span className="dashboard-card__label">Bidang Studi</span>
                        <span>{teacher.bidang_studi}</span>
                     </div>
                  </div>
               )}
            </div>

            <div className="dashboard-card">
               <div className="dashboard-card__heading">Saldo</div>
               {loading ? (
                  <Loading message="Memuat..." size="small" />
               ) : !teacher ? (
                  <div className="dashboard-card__empty">-</div>
               ) : (
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2c3e50" }}>
                     {saldoText}
                  </div>
               )}
            </div>

            <div className="dashboard-card">
               <div className="dashboard-card__heading">Hutang</div>
               {loading ? (
                  <Loading message="Memuat..." size="small" />
               ) : !teacher ? (
                  <div className="dashboard-card__empty">-</div>
               ) : (
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: teacher.total_hutang > 0 ? "#e74c3c" : "#27ae60" }}>
                     {debtText}
                  </div>
               )}
            </div>
         </div>

         <div className="dashboard-card">
            <div className="dashboard-card__heading">Pesanan Terbaru</div>
            {loading ? (
               <Loading message="Memuat..." size="small" />
            ) : orders.length === 0 ? (
               <div className="dashboard-card__empty">Tidak ada pesanan.</div>
            ) : (
               <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                     <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                        <th style={{ textAlign: "left", padding: "0.5rem", fontSize: "0.85rem", color: "#666" }}>ID</th>
                        <th style={{ textAlign: "left", padding: "0.5rem", fontSize: "0.85rem", color: "#666" }}>Total</th>
                        <th style={{ textAlign: "left", padding: "0.5rem", fontSize: "0.85rem", color: "#666" }}>Status Order</th>
                        <th style={{ textAlign: "left", padding: "0.5rem", fontSize: "0.85rem", color: "#666" }}>Status Bayar</th>
                        <th style={{ textAlign: "left", padding: "0.5rem", fontSize: "0.85rem", color: "#666" }}>Tanggal</th>
                     </tr>
                  </thead>
                  <tbody>
                     {orders.slice(0, 5).map((order) => (
                        <tr key={order.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                           <td style={{ padding: "0.5rem", fontSize: "0.9rem" }}>{order.id.substring(0, 10)}</td>
                           <td style={{ padding: "0.5rem", fontSize: "0.9rem" }}>Rp {Number(order.total_harga).toLocaleString()}</td>
                           <td style={{ padding: "0.5rem", fontSize: "0.9rem" }}>
                              <span className={`status-badge ${order.status_order === "Dikonfirmasi" ? "status-badge--positive" : ""}`}>
                                 {order.status_order}
                              </span>
                           </td>
                           <td style={{ padding: "0.5rem", fontSize: "0.9rem" }}>
                              <span className={`status-badge ${order.status_pembayaran === "Lunas" ? "status-badge--positive" : "status-badge--negative"}`}>
                                 {order.status_pembayaran}
                              </span>
                           </td>
                           <td style={{ padding: "0.5rem", fontSize: "0.9rem" }}>
                              {new Date(order.created_at).toLocaleDateString("id-ID")}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            )}
         </div>
      </div>
   );
}
