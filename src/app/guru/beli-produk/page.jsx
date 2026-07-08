"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getAuthSession } from "@/utils/auth";
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
            const session = getAuthSession();
            const nipSession = session?.role === "guru" ? session.nip : null;
            if (!nipSession) {
               setTeacher(null);
               setProducts([]);
               setOrders([]);
               return;
            }

            const [{ data: guruData, error: guruError }, { data: produkData, error: produkError }, { data: ordersData, error: ordersError }] = await Promise.all([
               supabase
                  .from("guru")
                  .select("nip,nama_guru,saldo,total_hutang")
                  .eq("nip", nipSession)
                  .maybeSingle(),
               supabase.from("produk").select("id,nama_produk,harga,stok").order("nama_produk", { ascending: true }),
               supabase
                  .from("order_guru")
                  .select("id,created_at,total_harga,metode_pembayaran,status_order,status_pembayaran")
                  .eq("nip_guru", nipSession)
                  .order("created_at", { ascending: false })
                  .limit(5),
            ]);

            if (guruError) throw guruError;
            if (produkError) throw produkError;
            if (ordersError) throw ordersError;

            setTeacher(guruData ?? null);
            setProducts(produkData ?? []);
            setOrders(ordersData ?? []);
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

   const cartTotal = useMemo(() => {
      return cartItems.reduce((sum, item) => sum + item.harga * item.quantity, 0);
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
         const session = getAuthSession();
         const nipSession = session?.role === "guru" ? session.nip : null;
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
            keterangan: paymentMethod === "Saldo" ? "Menunggu konfirmasi admin untuk pembayaran saldo" : "Menunggu konfirmasi admin untuk hutang",
         });

         if (orderError) throw orderError;

         const detailOrders = cartItems.map((item) => ({
            order_id: orderId,
            produk_id: item.id,
            jumlah: item.quantity,
            harga_satuan: item.harga,
         }));

         const { error: detailError } = await supabase.from("detail_order_guru").insert(detailOrders);

         if (detailError) throw detailError;

         if (paymentMethod === "Saldo") {
            const newSaldo = Number(teacher?.saldo ?? 0) - cartTotal;
            const { error: updateError } = await supabase
               .from("guru")
               .update({ saldo: newSaldo })
               .eq("nip", nipSession);

            if (updateError) throw updateError;
            setTeacher((current) => (current ? { ...current, saldo: newSaldo } : current));
         }

         setMessage(paymentMethod === "Saldo" ? "Pesanan berhasil dibuat dan saldo Anda langsung dipotong." : "Pesanan berhasil dibuat!");
         setCartItems([]);
         setTimeout(() => setMessage(""), 3000);

         const { data: ordersData, error: ordersError } = await supabase
            .from("order_guru")
            .select("id,created_at,total_harga,metode_pembayaran,status_order,status_pembayaran")
            .eq("nip_guru", nipSession)
            .order("created_at", { ascending: false })
            .limit(5);

         if (!ordersError) setOrders(ordersData ?? []);
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
         {message && <div style={{ padding: "1rem", marginBottom: "1rem", backgroundColor: "#d4edda", color: "#155724", borderRadius: "4px" }}>{message}</div>}
         {errorMessage && <div style={{ padding: "1rem", marginBottom: "1rem", backgroundColor: "#f8d7da", color: "#721c24", borderRadius: "4px" }}>{errorMessage}</div>}

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
            <div className="orders-section__title">Pesanan Terbaru</div>
            {orders.length === 0 ? (
               <div style={{ color: "#999", textAlign: "center", padding: "1rem" }}>Tidak ada pesanan.</div>
            ) : (
               <table className="orders-table">
                  <thead>
                     <tr>
                        <th>ID</th>
                        <th>Total</th>
                        <th>Metode</th>
                        <th>Status Order</th>
                        <th>Status Bayar</th>
                        <th>Tanggal</th>
                     </tr>
                  </thead>
                  <tbody>
                     {orders.map((order) => (
                        <tr key={order.id}>
                           <td>{order.id.substring(0, 12)}</td>
                           <td>Rp {Number(order.total_harga).toLocaleString()}</td>
                           <td>{order.metode_pembayaran}</td>
                           <td>
                              <span className={`status-badge ${order.status_order === "Dikonfirmasi" ? "status-badge--success" : order.status_order === "Ditolak" ? "status-badge--error" : "status-badge--warning"}`}>
                                 {order.status_order}
                              </span>
                           </td>
                           <td>
                              <span className={`status-badge ${order.status_pembayaran === "Lunas" ? "status-badge--success" : "status-badge--error"}`}>
                                 {order.status_pembayaran}
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
