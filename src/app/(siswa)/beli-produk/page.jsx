"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getAuthSession } from "@/utils/auth";
import Loading from "@/components/Loading";
import "./beli-produk.css";

const supabase = createClient();

export default function BeliProdukPage() {
   const [student, setStudent] = useState(null);
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
            const session = getAuthSession();
            const nisSession = session?.role === "siswa" ? session.nis : null;
            if (!nisSession) {
               setStudent(null);
               setProducts([]);
               setOrders([]);
               return;
            }

            const [{ data: siswaData, error: siswaError }, { data: produkData, error: produkError }, { data: ordersData, error: ordersError }, { data: transaksiData, error: transaksiError }] = await Promise.all([
               supabase
                  .from("siswa")
                  .select("nis,nama_siswa,saldo,total_hutang")
                  .eq("nis", nisSession)
                  .maybeSingle(),
               supabase.from("produk").select("id,nama_produk,harga,stok").order("nama_produk", { ascending: true }),
               supabase
                  .from("order_siswa")
                  .select("id,created_at,total_harga,metode_pembayaran,status_order,status_pembayaran")
                  .eq("nis_siswa", nisSession)
                  .order("created_at", { ascending: false }),
               supabase
                  .from("transaksi")
                  .select("id,created_at,total_bayar,metode_pembayaran,status_pembayaran")
                  .eq("nis_siswa", nisSession)
                  .order("created_at", { ascending: false }),
            ]);

            if (siswaError) throw siswaError;
            if (produkError) throw produkError;
            if (ordersError) throw ordersError;
            if (transaksiError) throw transaksiError;

            setStudent(siswaData ?? null);
            setProducts(produkData ?? []);

            // Combine order_siswa and transaksi, then sort by date (limit to 10 total)
            const combined = [
               ...(ordersData ?? []).map((o) => ({ ...o, source: "order" })),
               ...(transaksiData ?? []).map((t) => ({ ...t, total_harga: t.total_bayar, source: "kasir" })),
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
            String(product.harga).includes(q) ||
            String(product.stok).includes(q)
         );
      });
   }, [products, searchQuery]);

   const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.harga * item.quantity, 0), [cartItems]);

   function addToCart(product) {
      if (product.stok <= 0) return;

      setCartItems((current) => {
         const existingItem = current.find((item) => item.id === product.id);
         if (existingItem) {
            const nextQuantity = Math.min(existingItem.quantity + 1, product.stok);
            return current.map((item) => (item.id === product.id ? { ...item, quantity: nextQuantity } : item));
         }

         return [...current, { ...product, quantity: 1 }];
      });
   }

   function removeFromCart(productId) {
      setCartItems((current) => current.filter((item) => item.id !== productId));
   }

   function updateQuantity(productId, quantity) {
      if (quantity <= 0) {
         removeFromCart(productId);
         return;
      }

      setCartItems((current) =>
         current.map((item) => {
            if (item.id !== productId) return item;
            return { ...item, quantity: Math.min(quantity, item.stok) };
         })
      );
   }

   async function handleSubmitOrder() {
      setMessage("");
      if (!student) return;
      if (cartItems.length === 0) {
         setErrorMessage("Keranjang kosong.");
         return;
      }

      if (paymentMethod === "Saldo" && Number(student.saldo ?? 0) < cartTotal) {
         setErrorMessage("Saldo tidak mencukupi untuk melakukan pembayaran.");
         return;
      }

      setSubmitting(true);
      setErrorMessage("");
      try {
         const orderId = `order_${Date.now()}`;
         const orderPayload = {
            id: orderId,
            nis_siswa: student.nis,
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
         };

         const { error: orderError } = await supabase.from("order_siswa").insert(orderPayload);
         if (orderError) throw orderError;

         const detailPayload = cartItems.map((item) => ({
            order_id: orderId,
            produk_id: item.id,
            jumlah: item.quantity,
            harga_satuan: item.harga,
         }));

         const { error: detailError } = await supabase.from("detail_order_siswa").insert(detailPayload);
         if (detailError) throw detailError;

         if (paymentMethod === "Saldo") {
            const currentSaldo = Number(student.saldo ?? 0);
            const newSaldo = currentSaldo - cartTotal;
            if (newSaldo < 0) throw new Error("Saldo tidak cukup untuk melakukan pembayaran.");

            const { error: updateSaldoError } = await supabase.from("siswa").update({ saldo: newSaldo }).eq("nis", student.nis);
            if (updateSaldoError) throw updateSaldoError;

            // Create saldo history entry
            const { error: historyError } = await supabase.from("topup_saldo").insert({
               nis_siswa: student.nis,
               jumlah: cartTotal,
               metode: "Pembayaran Saldo",
               tipe: "Order_Saldo",
               keterangan: `Pembelian produk order ${orderId}`,
            });

            if (historyError) {
               console.error("Warning: Could not record saldo history:", historyError);
            }

            setStudent((current) => (current ? { ...current, saldo: newSaldo } : current));
         }

         setCartItems([]);
         setMessage(
            paymentMethod === "Saldo"
               ? "Pesanan berhasil dikirim dan saldo Anda langsung dipotong."
               : paymentMethod === "Tunai"
                  ? "Pesanan berhasil dikirim. Silakan lakukan pembayaran tunai kepada admin."
                  : "Pesanan berhasil dikirim ke admin. Silakan tunggu konfirmasi."
         );
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
      } catch (error) {
         console.error(error);
         setErrorMessage("Gagal mengirim order. Coba lagi.");
      } finally {
         setSubmitting(false);
      }
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
                  style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem", border: "1px solid #ccc", borderRadius: "4px" }}
               />
               <div className="beli-produk-products">
                  {filteredProducts.map((product) => {
                     const cartItem = cartItems.find((item) => item.id === product.id);
                     return (
                        <div key={product.id} className="product-card">
                           <div className="product-card__name">{product.nama_produk}</div>
                           <div className="product-card__info">
                              <div className="product-card__price">Rp {Number(product.harga).toLocaleString()}</div>
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
                                 className="btn btn--primary"
                                 style={{ fontSize: "0.85rem", padding: "0.25rem 0.75rem" }}
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
                  <div style={{ color: "#999", textAlign: "center", padding: "1rem" }}>Keranjang kosong</div>
               ) : (
                  <>
                     <div className="cart-items">
                        {cartItems.map((item) => (
                           <div key={item.id} className="cart-item">
                              <div>
                                 <div className="cart-item__name">{item.nama_produk}</div>
                                 <div className="cart-item__qty">
                                    Rp {Number(item.harga).toLocaleString()} x {item.quantity}
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
                           <span>Rp {Number(cartTotal).toLocaleString()}</span>
                        </div>
                        <div className="cart-summary__total">
                           <span>Total</span>
                           <span>Rp {Number(cartTotal).toLocaleString()}</span>
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

                     <button onClick={handleSubmitOrder} disabled={submitting} className="btn btn--primary" style={{ width: "100%" }}>
                        {submitting ? "Memproses..." : "Pesan Sekarang"}
                     </button>
                  </>
               )}
            </div>
         </div>

         <div className="orders-section">
            <div className="orders-section__title">Riwayat Transaksi</div>
            {orders.length === 0 ? (
               <div style={{ color: "#999", textAlign: "center", padding: "1rem" }}>Tidak ada transaksi.</div>
            ) : (
               <table className="orders-table">
                  <thead>
                     <tr>
                        <th>ID</th>
                        <th>Total</th>
                        <th>Metode</th>
                        <th>Status Order</th>
                        <th>Status Bayar</th>
                        <th>Sumber</th>
                        <th>Tanggal</th>
                     </tr>
                  </thead>
                  <tbody>
                     {orders.map((order) => (
                        <tr key={`${order.source}-${order.id}`}>
                           <td>{order.id.substring(0, 12)}</td>
                           <td>Rp {Number(order.total_harga).toLocaleString()}</td>
                           <td>{order.metode_pembayaran}</td>
                           <td>
                              {order.source === "order" ? (
                                 <span className={`status-badge ${order.status_order === "Dikonfirmasi" ? "status-badge--success" : order.status_order === "Ditolak" ? "status-badge--error" : "status-badge--warning"}`}>
                                    {order.status_order}
                                 </span>
                              ) : (
                                 <span style={{ color: "#999" }}>-</span>
                              )}
                           </td>
                           <td>
                              <span className={`status-badge ${order.status_pembayaran === "Lunas" ? "status-badge--success" : "status-badge--error"}`}>
                                 {order.status_pembayaran}
                              </span>
                           </td>
                           <td>
                              <span className={`source-badge source-badge--${order.source}`}>
                                 {order.source === "order" ? "Pesanan" : "Kasir"}
                              </span>
                           </td>
                           <td>{new Date(order.created_at).toLocaleDateString("id-ID")}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            )}
         </div>
      </div>
   );
}
