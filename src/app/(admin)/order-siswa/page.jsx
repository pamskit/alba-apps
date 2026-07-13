"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase";
import Loading from "@/components/Loading";
import "./order-siswa.css";

const supabase = createClient();

export default function OrderSiswaPage() {
   const [orders, setOrders] = useState([]);
   const [selectedOrderId, setSelectedOrderId] = useState(null);
   const [orderItems, setOrderItems] = useState([]);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState(false);
   const [message, setMessage] = useState("");
   const [errorMessage, setErrorMessage] = useState("");

   useEffect(() => {
      fetchOrders();
   }, []);

   async function fetchOrders() {
      setLoading(true);
      setErrorMessage("");
      try {
         const { data, error } = await supabase
            .from("transaksi")
            .select(`id,created_at,amount_total,payment_method,order_status,payment_status,note,nis_siswa,siswa(nis,nama_siswa,kelas,saldo,total_hutang)`)
            .eq("transaction_type", "order")
            .eq("customer_type", "siswa")
            .order("created_at", { ascending: false });

         if (error) throw error;
         const orderList = (data ?? []).map(order => ({
            ...order,
            id: order.id,
            total_harga: order.amount_total,
            metode_pembayaran: order.payment_method,
            status_order: order.order_status,
            status_pembayaran: order.payment_status,
            keterangan: order.note
         }));
         setOrders(orderList);
      } catch (error) {
         console.error(error);
         setErrorMessage("Gagal memuat order siswa.");
      } finally {
         setLoading(false);
      }
   }

   async function fetchOrderItems(orderId) {
      setActionLoading(true);
      setErrorMessage("");
      try {
         const { data, error } = await supabase
            .from("detail_transaksi")
            .select("id,produk_id,jumlah,harga_satuan,produk(nama_produk)")
            .eq("transaksi_id", orderId);

         if (error) throw error;
         setOrderItems(data ?? []);
      } catch (error) {
         console.error(error);
         setErrorMessage("Gagal memuat detail order.");
      } finally {
         setActionLoading(false);
      }
   }

   const selectedOrder = useMemo(
      () => orders.find((order) => order.id === selectedOrderId) ?? null,
      [orders, selectedOrderId]
   );

   const pendingOrders = useMemo(
      () => orders.filter((order) => order.status_order === "Menunggu"),
      [orders]
   );

   const completedOrders = useMemo(
      () => orders.filter((order) => order.status_order !== "Menunggu"),
      [orders]
   );

   const orderStats = useMemo(() => {
      return orders.reduce(
         (acc, order) => {
            acc.total += 1;
            if (order.status_order === "Menunggu") acc.pending += 1;
            if (order.status_order === "Dikonfirmasi") acc.confirmed += 1;
            if (order.status_order === "Ditolak") acc.rejected += 1;
            return acc;
         },
         { total: 0, pending: 0, confirmed: 0, rejected: 0 }
      );
   }, [orders]);

   function getStatusClass(status) {
      switch (status) {
         case "Menunggu":
            return "order-card__badge order-card__badge--pending";
         case "Dikonfirmasi":
            return "order-card__badge order-card__badge--confirmed";
         case "Ditolak":
            return "order-card__badge order-card__badge--rejected";
         default:
            return "order-card__badge";
      }
   }

   function getPaymentClass(method) {
      return method === "Saldo" ? "order-card__chip order-card__chip--saldo" : "order-card__chip order-card__chip--hutang";
   }

   function handleSelectOrder(orderId) {
      setSelectedOrderId(orderId);
      setOrderItems([]);
      void fetchOrderItems(orderId);
   }

   function closeOrderModal() {
      setSelectedOrderId(null);
      setOrderItems([]);
   }

   async function updateOrderStatus(order, updates, notification) {
      setActionLoading(true);
      setErrorMessage("");
      try {
         const { error: orderError } = await supabase
            .from("transaksi")
            .update(updates)
            .eq("id", order.id);
         if (orderError) throw orderError;

         setMessage(notification);
         await fetchOrders();
         if (selectedOrderId === order.id) {
            await fetchOrderItems(order.id);
         }
      } catch (error) {
         console.error(error);
         setErrorMessage("Gagal memperbarui status order.");
      } finally {
         setActionLoading(false);
      }
   }

   async function handleConfirm(order) {
      if (!order?.siswa) {
         setErrorMessage("Data siswa tidak tersedia untuk order ini.");
         return;
      }

      const currentHutang = Number(order.siswa.total_hutang ?? 0);
      const totalHarga = Number(order.total_harga ?? 0);
      const updates = { order_status: "Dikonfirmasi" };

      if (order.metode_pembayaran === "Saldo") {
         setActionLoading(true);
         try {
            const operations = [];
            operations.push(supabase.from("transaksi").update({ ...updates, payment_status: "Lunas" }).eq("id", order.id));
            operations.push(
               supabase
                  .from("order_siswa")
                  .update({ status_order: "Dikonfirmasi", status_pembayaran: "Lunas" })
                  .eq("id", order.id)
            );

            const results = await Promise.all(operations);
            for (const result of results) {
               if (result.error) throw result.error;
            }

            setMessage("Order saldo berhasil dikonfirmasi.");
            await fetchOrders();
            if (selectedOrderId === order.id) await fetchOrderItems(order.id);
         } catch (error) {
            console.error(error);
            setErrorMessage("Gagal mengonfirmasi order dengan pembayaran saldo.");
         } finally {
            setActionLoading(false);
         }
         return;
      }

      if (order.metode_pembayaran === "Hutang") {
         const newHutang = currentHutang + totalHarga;
         setActionLoading(true);
         try {
            const operations = [];
            operations.push(supabase.from("siswa").update({ total_hutang: newHutang }).eq("nis", order.siswa.nis));
            operations.push(supabase.from("transaksi").update({ ...updates, payment_status: "Belum Lunas" }).eq("id", order.id));
            operations.push(
               supabase
                  .from("order_siswa")
                  .update({ status_order: "Dikonfirmasi", status_pembayaran: "Belum Lunas" })
                  .eq("id", order.id)
            );

            // Log hutang confirmation in saldo_log
            operations.push(
               supabase.from("saldo_log").insert({
                  customer_type: "siswa",
                  nis_siswa: order.siswa.nis,
                  transaksi_id: order.id,
                  log_type: "Hutang_Payment",
                  amount: totalHarga,
                  balance_before: currentHutang,
                  balance_after: newHutang,
                  payment_method: "Hutang",
                  note: `Order confirmed: ${order.id}`,
               })
            );

            const results = await Promise.all(operations);
            for (const result of results) {
               if (result.error) throw result.error;
            }

            setMessage("Order hutang berhasil dikonfirmasi, hutang siswa diperbarui, dan riwayat tercatat.");
            await fetchOrders();
            if (selectedOrderId === order.id) await fetchOrderItems(order.id);
         } catch (error) {
            console.error(error);
            setErrorMessage("Gagal mengonfirmasi order hutang.");
         } finally {
            setActionLoading(false);
         }
         return;
      }

      if (order.metode_pembayaran === "Tunai") {
         setActionLoading(true);
         try {
            const operations = [];
            operations.push(supabase.from("transaksi").update({ ...updates, payment_status: "Lunas" }).eq("id", order.id));
            operations.push(
               supabase
                  .from("order_siswa")
                  .update({ status_order: "Dikonfirmasi", status_pembayaran: "Lunas" })
                  .eq("id", order.id)
            );

            const results = await Promise.all(operations);
            for (const result of results) {
               if (result.error) throw result.error;
            }

            setMessage("Order tunai berhasil dikonfirmasi dan riwayat tercatat.");
            await fetchOrders();
            if (selectedOrderId === order.id) await fetchOrderItems(order.id);
         } catch (error) {
            console.error(error);
            setErrorMessage("Gagal mengonfirmasi order tunai.");
         } finally {
            setActionLoading(false);
         }
         return;
      }

      await updateOrderStatus(order, { ...updates, status_pembayaran: order.status_pembayaran }, "Order berhasil dikonfirmasi.");
   }

   async function handleReject(order) {
      if (!order?.siswa) {
         setErrorMessage("Data siswa tidak tersedia untuk order ini.");
         return;
      }

      setActionLoading(true);
      setErrorMessage("");
      try {
         const totalHarga = Number(order.total_harga ?? 0);
         const shouldRefundSaldo = order.metode_pembayaran === "Saldo" && order.payment_status === "Lunas";
         const shouldReduceHutang = order.order_status === "Dikonfirmasi" && order.metode_pembayaran === "Hutang" && order.payment_status === "Belum Lunas";
         const isHutangPending = order.metode_pembayaran === "Hutang" && order.order_status === "Menunggu";

         const updates = {
            order_status: "Ditolak",
         };

         const operations = [];

         if (shouldRefundSaldo) {
            const newSaldo = Number(order.siswa.saldo ?? 0) + totalHarga;
            operations.push(supabase.from("siswa").update({ saldo: newSaldo }).eq("nis", order.siswa.nis));

            // Create saldo_log entry for refund
            operations.push(
               supabase.from("saldo_log").insert({
                  customer_type: "siswa",
                  nis_siswa: order.siswa.nis,
                  transaksi_id: order.id,
                  log_type: "Refund",
                  amount: totalHarga,
                  balance_before: Number(order.siswa.saldo ?? 0),
                  balance_after: newSaldo,
                  payment_method: "Saldo",
                  note: `Refund order ditolak ${order.id}`,
               })
            );
         }

         if (shouldReduceHutang) {
            const newHutang = Math.max(0, Number(order.siswa.total_hutang ?? 0) - totalHarga);
            operations.push(supabase.from("siswa").update({ total_hutang: newHutang }).eq("nis", order.siswa.nis));
         }

         operations.push(supabase.from("transaksi").update(updates).eq("id", order.id));

         operations.push(
            supabase
               .from("order_siswa")
               .update({ status_order: "Ditolak" })
               .eq("id", order.id)
         );

         if (operations.length > 0) {
            const results = await Promise.all(operations);
            // Check for errors
            for (const result of results) {
               if (result.error) throw result.error;
            }
         }

         setMessage(shouldRefundSaldo ? "Order ditolak dan saldo siswa dikembalikan." : isHutangPending ? "Order hutang ditolak." : "Order ditolak.");
         await fetchOrders();
         if (selectedOrderId === order.id) {
            await fetchOrderItems(order.id);
         }
      } catch (error) {
         console.error("handleReject error:", error);
         setErrorMessage(error?.message || "Gagal menolak order.");
      } finally {
         setActionLoading(false);
      }
   }

   return (
      <div className="order-siswa-page">
         <div className="page-header">
            <h1>Order Siswa</h1>
            <p>Kelola order self-service dari siswa dan konfirmasi status pembayaran atau hutang.</p>
         </div>

         {loading ? (
            <Loading message="Memuat order siswa..." />
         ) : (
            <>
               {errorMessage && <div className="page-message page-message--error">{errorMessage}</div>}
               {message && <div className="page-message page-message--success">{message}</div>}

               <div className="order-siswa-summary">
                  <div className="summary-card summary-card--accent">
                     <span className="summary-card__label">Total Order</span>
                     <strong className="summary-card__value">{orderStats.total}</strong>
                     <span className="summary-card__caption">Semua order siswa</span>
                  </div>
                  <div className="summary-card summary-card--warning">
                     <span className="summary-card__label">Menunggu</span>
                     <strong className="summary-card__value">{orderStats.pending}</strong>
                     <span className="summary-card__caption">Perlu konfirmasi</span>
                  </div>
                  <div className="summary-card summary-card--success">
                     <span className="summary-card__label">Dikonfirmasi</span>
                     <strong className="summary-card__value">{orderStats.confirmed}</strong>
                     <span className="summary-card__caption">Sudah diproses</span>
                  </div>
                  <div className="summary-card summary-card--danger">
                     <span className="summary-card__label">Ditolak</span>
                     <strong className="summary-card__value">{orderStats.rejected}</strong>
                     <span className="summary-card__caption">Tidak disetujui</span>
                  </div>
               </div>

               <section className="order-siswa-list-panel">
                  <div className="panel-title">Daftar Order</div>

                  <div className="order-group-card">
                     <div className="order-group-card__header">
                        <div>
                           <h3>Menunggu Konfirmasi</h3>
                           <p>Order yang perlu diproses admin.</p>
                        </div>
                        <span>{pendingOrders.length}</span>
                     </div>
                     <div className="order-list">
                        {pendingOrders.length === 0 ? (
                           <div className="order-card-empty">Tidak ada order yang menunggu konfirmasi.</div>
                        ) : (
                           pendingOrders.map((order) => (
                              <div
                                 key={order.id}
                                 className={selectedOrderId === order.id ? "order-card order-card--selected" : "order-card"}
                                 onClick={() => handleSelectOrder(order.id)}
                              >
                                 <div className="order-card__top">
                                    <div>
                                       <div className="order-card__name">{order.siswa?.nama_siswa ?? "-"}</div>
                                       <div className="order-card__nis">NIS {order.siswa?.nis ?? "-"} · {order.siswa?.kelas ?? "-"}</div>
                                    </div>
                                    <span className={getStatusClass(order.status_order)}>{order.status_order}</span>
                                 </div>
                                 <div className="order-card__amount">Rp {Number(order.total_harga ?? 0).toLocaleString()}</div>
                                 <div className="order-card__meta">
                                    <span>{new Date(order.created_at).toLocaleString("id-ID")}</span>
                                    <span className={getPaymentClass(order.metode_pembayaran)}>{order.metode_pembayaran}</span>
                                 </div>
                                 <div className="order-card__status">Status bayar: {order.status_pembayaran}</div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>

                  <div className="order-group-card order-group-card--done">
                     <div className="order-group-card__header order-group-card__header--done">
                        <div>
                           <h3>Sudah Selesai</h3>
                           <p>Order yang sudah dikonfirmasi atau ditolak.</p>
                        </div>
                        <span>{completedOrders.length}</span>
                     </div>
                     <div className="order-list">
                        {completedOrders.length === 0 ? (
                           <div className="order-card-empty">Belum ada order yang selesai.</div>
                        ) : (
                           completedOrders.map((order) => (
                              <div
                                 key={order.id}
                                 className={selectedOrderId === order.id ? "order-card order-card--selected" : "order-card"}
                                 onClick={() => handleSelectOrder(order.id)}
                              >
                                 <div className="order-card__top">
                                    <div>
                                       <div className="order-card__name">{order.siswa?.nama_siswa ?? "-"}</div>
                                       <div className="order-card__nis">NIS {order.siswa?.nis ?? "-"} · {order.siswa?.kelas ?? "-"}</div>
                                    </div>
                                    <span className={getStatusClass(order.status_order)}>{order.status_order}</span>
                                 </div>
                                 <div className="order-card__amount">Rp {Number(order.total_harga ?? 0).toLocaleString()}</div>
                                 <div className="order-card__meta">
                                    <span>{new Date(order.created_at).toLocaleString("id-ID")}</span>
                                    <span className={getPaymentClass(order.metode_pembayaran)}>{order.metode_pembayaran}</span>
                                 </div>
                                 <div className="order-card__status">Status bayar: {order.status_pembayaran}</div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>
               </section>

               {selectedOrder && (
                  <div className="order-siswa-modal-overlay" onClick={closeOrderModal}>
                     <div className="order-siswa-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-header">
                           <div>
                              <div className="modal-title">Detail Order</div>
                              <div className="modal-subtitle">
                                 {selectedOrder.siswa?.nama_siswa ?? "-"} • NIS {selectedOrder.siswa?.nis ?? "-"}
                              </div>
                           </div>
                           <button type="button" className="modal-close" onClick={closeOrderModal} aria-label="Tutup detail order">
                              ×
                           </button>
                        </div>

                        <div className="detail-block">
                           <div className="detail-grid">
                              <div className="detail-item">
                                 <div className="detail-label">NIS</div>
                                 <div className="detail-value">{selectedOrder.siswa?.nis ?? "-"}</div>
                              </div>
                              <div className="detail-item">
                                 <div className="detail-label">Nama</div>
                                 <div className="detail-value">{selectedOrder.siswa?.nama_siswa ?? "-"}</div>
                              </div>
                              <div className="detail-item">
                                 <div className="detail-label">Kelas</div>
                                 <div className="detail-value">{selectedOrder.siswa?.kelas ?? "-"}</div>
                              </div>
                              <div className="detail-item">
                                 <div className="detail-label">Metode</div>
                                 <div className="detail-value">{selectedOrder.metode_pembayaran}</div>
                              </div>
                              <div className="detail-item">
                                 <div className="detail-label">Status Order</div>
                                 <div className="detail-value">{selectedOrder.status_order}</div>
                              </div>
                              <div className="detail-item">
                                 <div className="detail-label">Status Bayar</div>
                                 <div className="detail-value">{selectedOrder.status_pembayaran}</div>
                              </div>
                           </div>
                           <div className="detail-total">
                              <span className="detail-label">Total Harga</span>
                              <strong>Rp {Number(selectedOrder.total_harga ?? 0).toLocaleString()}</strong>
                           </div>
                        </div>

                        <div className="detail-block">
                           <div className="detail-label">Catatan</div>
                           <div className="detail-note">{selectedOrder.keterangan || "Tidak ada catatan."}</div>
                        </div>

                        <div className="detail-block detail-block--items">
                           <div className="detail-title">Items</div>
                           <div className="order-items-wrap">
                              {actionLoading ? (
                                 <Loading message="Memuat item order..." size="small" />
                              ) : orderItems.length === 0 ? (
                                 <div className="order-items-empty">Tidak ada item dalam order ini.</div>
                              ) : (
                                 <table className="order-items-table">
                                    <thead>
                                       <tr>
                                          <th>Produk</th>
                                          <th>Jumlah</th>
                                          <th>Harga Satuan</th>
                                          <th>Subtotal</th>
                                       </tr>
                                    </thead>
                                    <tbody>
                                       {orderItems.map((item) => (
                                          <tr key={item.id}>
                                             <td>{item.produk?.nama_produk ?? `Produk ${item.produk_id}`}</td>
                                             <td>{item.jumlah}</td>
                                             <td>Rp {Number(item.harga_satuan ?? 0).toLocaleString()}</td>
                                             <td>Rp {Number((item.jumlah || 0) * (item.harga_satuan || 0)).toLocaleString()}</td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              )}
                           </div>
                        </div>

                        {selectedOrder.status_order === "Menunggu" && (
                           <div className="order-actions">
                              <button className="btn btn--primary" onClick={() => void handleConfirm(selectedOrder)} disabled={actionLoading}>
                                 {actionLoading ? "Memproses..." : "Konfirmasi"}
                              </button>
                              <button className="btn btn--secondary" onClick={() => void handleReject(selectedOrder)} disabled={actionLoading}>
                                 {actionLoading ? "Memproses..." : "Tolak"}
                              </button>
                           </div>
                        )}
                     </div>
                  </div>
               )}
            </>
         )}
      </div>
   );
}
