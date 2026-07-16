"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getRoleSession } from "@/utils/auth";
import Loading from "@/components/Loading";
import "./beli-produk.css";

const supabase = createClient();

export default function BeliProdukGuruPage() {
   const [teacher, setTeacher] = useState(null);
   const [products, setProducts] = useState([]);
   const [cartItems, setCartItems] = useState([]);
   const [orders, setOrders] = useState([]);
   const [searchQuery, setSearchQuery] = useState("");
   const [paymentMethod, setPaymentMethod] = useState("Saldo");
   const [loading, setLoading] = useState(true);
   const [submitting, setSubmitting] = useState(false);
   const [message, setMessage] = useState("");
   const [errorMessage, setErrorMessage] = useState("");

   useEffect(() => {
      async function loadPage() {
         setLoading(true);
         setErrorMessage("");
         try {
            const session = getRoleSession("guru");
            const nipSession = session?.nip ?? null;
            if (!nipSession) {
               setTeacher(null);
               setProducts([]);
               setOrders([]);
               return;
            }

            const [{ data: guruData, error: guruError }, { data: produkData, error: produkError }, { data: ordersData, error: ordersError }, { data: transaksiData, error: transaksiError }] = await Promise.all([
               supabase
                  .from("guru")
                  .select("nip,nama_guru,saldo,total_hutang")
                  .eq("nip", nipSession)
                  .maybeSingle(),
               supabase.from("produk").select("*").order("nama_produk", { ascending: true }),
               supabase
                  .from("order_guru")
                  .select("id,created_at,total_harga,metode_pembayaran,status_order,status_pembayaran")
                  .eq("nip_guru", nipSession)
                  .order("created_at", { ascending: false }),
               supabase
                  .from("transaksi")
                  .select("id,created_at,amount_total,payment_method,payment_status")
                  .eq("nip_guru", nipSession)
                  .neq("transaction_type", "order")
                  .order("created_at", { ascending: false }),
            ]);

            if (guruError) throw guruError;
            if (produkError) throw produkError;
            if (ordersError) throw ordersError;
            if (transaksiError) throw transaksiError;

            setTeacher(guruData ?? null);
            setProducts(produkData ?? []);

            // Combine order_guru and transaksi, then sort by date (limit to 10 total)
            const combined = [
               ...(ordersData ?? []).map((o) => ({ ...o, source: "order" })),
               ...(transaksiData ?? []).map((t) => ({ ...t, total_harga: t.amount_total, source: "kasir" })),
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

            setOrders(combined);
         } catch (error) {
            console.error(error);
            setErrorMessage("Gagal memuat halaman Beli Produk.");
         } finally {
            setLoading(false);
         }
      }

      loadPage();
   }, []);

   const filteredProducts = useMemo(() => {
      if (!searchQuery.trim()) return products;
      const q = searchQuery.toLowerCase();
      return products.filter((product) => {
         return (
            product.nama_produk.toLowerCase().includes(q) ||
            String(product.harga_jual ?? product.harga_beli ?? "").includes(q) ||
            String(product.stok).includes(q)
         );
      });
   }, [products, searchQuery]);

   const cartTotal = useMemo(() => {
      return cartItems.reduce((sum, item) => sum + Number(item.harga_jual ?? item.harga_beli ?? item.harga ?? 0) * item.quantity, 0);
   }, [cartItems]);

   function addToCart(product) {
      const existingItem = cartItems.find((item) => item.id === product.id);
      if (existingItem) {
         setCartItems(cartItems.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)));
      } else {
         setCartItems([...cartItems, { ...product, quantity: 1 }]);
      }
   }

   function removeFromCart(productId) {
      setCartItems(cartItems.filter((item) => item.id !== productId));
   }

   function updateQuantity(productId, quantity) {
      if (quantity <= 0) {
         removeFromCart(productId);
      } else {
         setCartItems(cartItems.map((item) => (item.id === productId ? { ...item, quantity } : item)));
      }
   }

   async function handleSubmitOrder() {
      if (cartItems.length === 0) {
         setErrorMessage("Keranjang kosong!");
         return;
      }

      setSubmitting(true);
      setMessage("");
      setErrorMessage("");

      try {
         const session = getRoleSession("guru");
         const nipSession = session?.nip ?? null;
         if (!nipSession) throw new Error("Session tidak valid");

         if (paymentMethod === "Saldo") {
            const currentSaldo = Number(teacher?.saldo ?? 0);
            if (currentSaldo < cartTotal) {
               throw new Error("Saldo tidak cukup untuk melakukan pembayaran.");
            }
         }

         const orderId = `order_guru_${Date.now()}`;

         const { error: orderError } = await supabase.from("order_guru").insert({
            id: orderId,
            nip_guru: nipSession,
            total_harga: cartTotal,
            metode_pembayaran: paymentMethod,
            status_order: "Menunggu",
            status_pembayaran: paymentMethod === "Saldo" ? "Lunas" : "Belum Lunas",
            keterangan:
               paymentMethod === "Saldo"
                  ? "Menunggu konfirmasi admin untuk pembayaran saldo"
                  : paymentMethod === "Tunai"
                     ? "Menunggu konfirmasi admin untuk pembayaran tunai"
                     : "Menunggu konfirmasi admin untuk hutang",
         });

         if (orderError) throw orderError;

         const detailOrders = cartItems.map((item) => ({
            order_id: orderId,
            produk_id: item.id,
            jumlah: item.quantity,
            harga_satuan: Number(item.harga_jual ?? item.harga_beli ?? item.harga ?? 0),
         }));

         const { error: detailError } = await supabase.from("detail_order_guru").insert(detailOrders);

         if (detailError) throw detailError;

         const transactionId = orderId;
         const paymentStatus = paymentMethod === "Saldo" ? "Lunas" : "Belum Lunas";
         const amountPaid = paymentMethod === "Saldo" ? cartTotal : 0;
         const amountDue = paymentMethod === "Saldo" ? 0 : cartTotal;

         const { error: trxError } = await supabase.from("transaksi").insert({
            id: transactionId,
            customer_type: "guru",
            nip_guru: nipSession,
            transaction_type: "order",
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            amount_total: cartTotal,
            amount_paid: amountPaid,
            amount_due: amountDue,
            note: `Order ${orderId}`,
            order_status: "Menunggu",
         });
         if (trxError) throw trxError;

         const detailTransactionPayload = cartItems.map((item) => {
            const hargaSatuan = Number(item.harga_jual ?? item.harga_beli ?? item.harga ?? 0);
            return {
               transaksi_id: transactionId,
               produk_id: item.id,
               jumlah: item.quantity,
               harga_satuan: hargaSatuan,
               sub_total: item.quantity * hargaSatuan,
            };
         });

         const { error: detailTransError } = await supabase.from("detail_transaksi").insert(detailTransactionPayload);
         if (detailTransError) throw detailTransError;

         if (paymentMethod === "Saldo") {
            const currentSaldo = Number(teacher?.saldo ?? 0);
            const newSaldo = currentSaldo - cartTotal;
            const { error: updateError } = await supabase
               .from("guru")
               .update({ saldo: newSaldo })
               .eq("nip", nipSession);

            if (updateError) throw updateError;

            // Create saldo history entry in legacy table for backward compatibility
            const { error: logError } = await supabase.from("saldo_log").insert({
               customer_type: "guru",
               nip_guru: nipSession,
               transaksi_id: transactionId,
               log_type: "Order_Saldo",
               amount: -cartTotal,
               balance_before: currentSaldo,
               balance_after: newSaldo,
               payment_method: "Saldo",
               note: `Pembelian produk order ${orderId}`,
            });
            if (logError) {
               console.error("Warning: Could not record saldo_log entry:", logError);
            }

            setTeacher((current) => (current ? { ...current, saldo: newSaldo } : current));
         }

         setMessage(
            paymentMethod === "Saldo"
               ? "Pesanan berhasil dibuat dan saldo Anda langsung dipotong."
               : paymentMethod === "Tunai"
                  ? "Pesanan berhasil dibuat. Silakan lakukan pembayaran tunai kepada admin."
                  : "Pesanan berhasil dibuat!"
         );
         setCartItems([]);
         setOrders((current) => [
            {
               id: orderId,
               created_at: new Date().toISOString(),
               total_harga: cartTotal,
               metode_pembayaran: paymentMethod,
               status_order: "Menunggu",
               status_pembayaran: paymentMethod === "Saldo" ? "Lunas" : "Belum Lunas",
               keterangan:
                  paymentMethod === "Saldo"
                     ? "Pembelian produk menggunakan saldo"
                     : paymentMethod === "Tunai"
                        ? "Pembelian produk dengan pembayaran tunai"
                        : "Menunggu konfirmasi admin untuk hutang",
               source: "order",
            },
            ...current,
         ]);
         setTimeout(() => setMessage(""), 3000);
      } catch (error) {
         console.error(error);
         setErrorMessage(error.message || "Gagal membuat pesanan.");
      } finally {
         setSubmitting(false);
      }
   }

   if (loading) {
      return <Loading message="Memuat produk..." size="large" />;
   }

   return (
      <div className="guru-beli-produk">
         {message && <div className="page-message page-message--success">{message}</div>}
         {errorMessage && <div className="page-message page-message--error">{errorMessage}</div>}

         <div className="beli-produk-section">
            <div>
               <input
                  type="text"
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="beli-produk-search"
               />
               <div className="beli-produk-products">
                  {filteredProducts.map((product) => {
                     const cartItem = cartItems.find((item) => item.id === product.id);
                     return (
                        <div key={product.id} className="product-card">
                           <div className="product-card__name">{product.nama_produk}</div>
                           <div className="product-card__info">
                              <div className="product-card__price">Rp {Number(product.harga_jual ?? product.harga_beli ?? 0).toLocaleString()}</div>
                              <div className="product-card__stok">Stok: {product.stok}</div>
                           </div>
                           <div className="product-card__actions">
                              <input
                                 type="number"
                                 min="1"
                                 value={cartItem?.quantity || 1}
                                 onChange={(e) => {
                                    const qty = parseInt(e.target.value) || 1;
                                    if (cartItem) {
                                       updateQuantity(product.id, qty);
                                    }
                                 }}
                                 className="product-card__input"
                              />
                              <button
                                 onClick={() => addToCart(product)}
                                 className="btn btn--primary product-card__add"
                              >
                                 {cartItem ? "+" : "Tambah"}
                              </button>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>

            <div className="beli-produk-cart">
               <div className="beli-produk-cart__title">Keranjang</div>

               {cartItems.length === 0 ? (
                  <div className="beli-produk-empty">Keranjang kosong</div>
               ) : (
                  <>
                     <div className="cart-items">
                        {cartItems.map((item) => (
                           <div key={item.id} className="cart-item">
                              <div>
                                 <div className="cart-item__name">{item.nama_produk}</div>
                                 <div className="cart-item__qty">
                                    Rp {Number(item.harga_jual ?? item.harga_beli ?? item.harga ?? 0).toLocaleString()} x {item.quantity}
                                 </div>
                              </div>
                              <div className="cart-item__remove" onClick={() => removeFromCart(item.id)}>
                                 ✕
                              </div>
                           </div>
                        ))}
                     </div>

                     <div className="cart-summary">
                        <div className="cart-summary__item">
                           <span>Subtotal</span>
                           <span>Rp {Number(cartTotal).toLocaleString("id-ID")}</span>
                        </div>
                        <div className="cart-summary__total">
                           <span>Total</span>
                           <span>Rp {Number(cartTotal).toLocaleString("id-ID")}</span>
                        </div>
                     </div>

                     <div className="payment-method">
                        <label className="payment-method__label">Metode Pembayaran</label>
                        <select
                           value={paymentMethod}
                           onChange={(e) => setPaymentMethod(e.target.value)}
                           className="payment-method__select"
                        >
                           <option value="Saldo">Saldo</option>
                           <option value="Tunai">Tunai</option>
                           <option value="Hutang">Hutang</option>
                        </select>
                     </div>

                     <button onClick={handleSubmitOrder} disabled={submitting} className="btn btn--primary beli-produk-cart__submit">
                        {submitting ? "Memproses..." : "Pesan Sekarang"}
                     </button>
                  </>
               )}
            </div>
         </div>

         <div className="orders-section">
            <div className="orders-section__title">Riwayat Transaksi</div>
            {orders.length === 0 ? (
               <div className="beli-produk-empty">Tidak ada transaksi.</div>
            ) : (
               <div className="orders-table-wrap">
                  <table className="orders-table">
                     <thead>
                        <tr>
                           <th>Tanggal</th>
                           <th>Jenis</th>
                           <th>Metode</th>
                           <th>Status</th>
                           <th>Nominal</th>
                        </tr>
                     </thead>
                     <tbody>
                        {orders.map((order) => (
                           <tr key={`${order.source}-${order.id}`}>
                              <td>{new Date(order.created_at).toLocaleDateString("id-ID")}</td>
                              <td>
                                 <span className={`source-badge source-badge--${order.source}`}>
                                    {order.source === "order" ? "Pesanan" : "Kasir"}
                                 </span>
                              </td>
                              <td>{order.payment_method ?? order.metode_pembayaran ?? "-"}</td>
                              <td>
                                 {order.source === "order" ? (
                                    <span className={`status-badge ${order.status_order === "Dikonfirmasi" ? "status-badge--success" : order.status_order === "Ditolak" ? "status-badge--error" : "status-badge--warning"}`}>
                                       {order.status_order ?? "-"}
                                    </span>
                                 ) : (
                                    <span className={`status-badge ${(order.payment_status ?? order.status_pembayaran) === "Lunas" ? "status-badge--success" : "status-badge--error"}`}>
                                       {order.payment_status ?? order.status_pembayaran ?? "-"}
                                    </span>
                                 )}
                              </td>
                              <td>Rp {Number(order.total_harga).toLocaleString("id-ID")}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </div>
      </div>
   );
}
