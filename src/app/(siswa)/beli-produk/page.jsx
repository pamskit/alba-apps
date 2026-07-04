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

            const [{ data: siswaData, error: siswaError }, { data: produkData, error: produkError }, { data: ordersData, error: ordersError }] = await Promise.all([
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
                  .order("created_at", { ascending: false })
                  .limit(5),
            ]);

            if (siswaError) throw siswaError;
            if (produkError) throw produkError;
            if (ordersError) throw ordersError;

            setStudent(siswaData ?? null);
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

   const totalAmount = useMemo(
      () => cartItems.reduce((sum, item) => sum + item.harga * item.quantity, 0),
      [cartItems]
   );

   const addToCart = (product) => {
      if (product.stok <= 0) return;
      setCartItems((current) => {
         const existing = current.find((item) => item.id === product.id);
         if (existing) {
            const nextQuantity = Math.min(existing.quantity + 1, product.stok);
            return current.map((item) =>
               item.id === product.id ? { ...item, quantity: nextQuantity } : item
            );
         }
         return [...current, { ...product, quantity: 1 }];
      });
   };

   const updateQuantity = (productId, value) => {
      setCartItems((current) =>
         current.map((item) => {
            if (item.id !== productId) return item;
            const nextQuantity = Number(value);
            if (!nextQuantity || nextQuantity < 1) return item;
            return {
               ...item,
               quantity: Math.min(nextQuantity, item.stok),
            };
         })
      );
   };

   const removeCartItem = (productId) => {
      setCartItems((current) => current.filter((item) => item.id !== productId));
   };

   const handleSubmitOrder = async () => {
      setMessage("");
      if (!student) return;
      if (cartItems.length === 0) {
         setErrorMessage("Keranjang kosong.");
         return;
      }

      if (paymentMethod === "Saldo" && Number(student.saldo ?? 0) < totalAmount) {
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
            total_harga: totalAmount,
            metode_pembayaran: paymentMethod,
            status_order: "Menunggu",
            status_pembayaran: "Belum Lunas",
            keterangan: paymentMethod === "Saldo" ? "Menunggu konfirmasi admin untuk pembayaran saldo" : "Menunggu konfirmasi admin untuk hutang",
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

         setCartItems([]);
         setMessage("Pesanan berhasil dikirim ke admin. Silakan tunggu konfirmasi.");
         setOrders((current) => [
            {
               id: orderId,
               created_at: new Date().toISOString(),
               total_harga: totalAmount,
               metode_pembayaran: paymentMethod,
               status_order: "Menunggu",
               status_pembayaran: "Belum Lunas",
            },
            ...current,
         ]);
      } catch (error) {
         console.error(error);
         setErrorMessage("Gagal mengirim order. Coba lagi.");
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <div className="beli-produk-page">
         <div className="beli-produk-page__header">
            <div>
               <h1>Beli Produk</h1>
               <p className="beli-produk-page__subtitle">
                  Pilih produk koperasi, masukkan ke keranjang, lalu kirim pesanan untuk dikonfirmasi admin.
               </p>
            </div>
            {student && (
               <div className="beli-produk-summary">
                  <div className="summary-card">
                     <span className="summary-card__label">Saldo</span>
                     <strong className="summary-card__value">Rp {Number(student.saldo ?? 0).toLocaleString()}</strong>
                  </div>
                  <div className="summary-card">
                     <span className="summary-card__label">Hutang</span>
                     <strong className="summary-card__value">Rp {Number(student.total_hutang ?? 0).toLocaleString()}</strong>
                  </div>
               </div>
            )}
         </div>

         {loading ? (
            <Loading message="Memuat produk..." size="small" />
         ) : (
            <>
               {errorMessage && <div className="page-message page-message--error">{errorMessage}</div>}
               {message && <div className="page-message page-message--success">{message}</div>}

               <div className="beli-produk-grid">
                  <div className="beli-produk-panel beli-produk-panel--products">
                     <div className="panel-header">
                        <div>
                           <h2>Produk Koperasi</h2>
                           <p>Pilih barang dan tambahkan ke keranjang.</p>
                        </div>
                        <div className="search-field">
                           <input
                              type="search"
                              placeholder="Cari produk..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                           />
                        </div>
                     </div>

                     <div className="product-grid">
                        {filteredProducts.length === 0 ? (
                           <div className="empty-state">Produk tidak ditemukan.</div>
                        ) : (
                           filteredProducts.map((product) => (
                              <div key={product.id} className="product-card">
                                 <div className="product-card__name">{product.nama_produk}</div>
                                 <div className="product-card__meta">Rp {Number(product.harga).toLocaleString()}</div>
                                 <div className="product-card__stock">Stok: {product.stok}</div>
                                 <button
                                    className="btn btn--primary product-card__button"
                                    disabled={product.stok <= 0}
                                    onClick={() => addToCart(product)}
                                 >
                                    {product.stok > 0 ? "Tambah ke Keranjang" : "Habis"}
                                 </button>
                              </div>
                           ))
                        )}
                     </div>
                  </div>

                  <div className="beli-produk-panel beli-produk-panel--cart">
                     <div className="panel-header">
                        <div>
                           <h2>Keranjang</h2>
                           <p>Atur item sebelum mengirim order.</p>
                        </div>
                     </div>

                     <div className="cart-list">
                        {cartItems.length === 0 ? (
                           <div className="empty-state">Keranjang masih kosong.</div>
                        ) : (
                           cartItems.map((item) => (
                              <div key={item.id} className="cart-item">
                                 <div className="cart-item__info">
                                    <div className="cart-item__name">{item.nama_produk}</div>
                                    <div className="cart-item__meta">Rp {Number(item.harga).toLocaleString()} x {item.quantity}</div>
                                 </div>
                                 <div className="cart-item__controls">
                                    <input
                                       type="number"
                                       min={1}
                                       max={item.stok}
                                       value={item.quantity}
                                       onChange={(e) => updateQuantity(item.id, e.target.value)}
                                    />
                                    <button className="btn btn--secondary" onClick={() => removeCartItem(item.id)}>
                                       Hapus
                                    </button>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>

                     <div className="order-box">
                        <div className="order-box__row">
                           <span>Total Belanja</span>
                           <strong>Rp {totalAmount.toLocaleString()}</strong>
                        </div>
                        <div className="order-box__row">
                           <label htmlFor="payment-method">Metode Pembayaran</label>
                           <select id="payment-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                              <option value="Saldo">Saldo</option>
                              <option value="Hutang">Hutang</option>
                           </select>
                        </div>
                        <button className="btn btn--primary order-box__button" onClick={handleSubmitOrder} disabled={submitting || cartItems.length === 0}>
                           {submitting ? "Mengirim order..." : "Kirim Pesanan"}
                        </button>
                        {paymentMethod === "Saldo" && Number(student?.saldo ?? 0) < totalAmount && (
                           <div className="hint-text">Saldo tidak cukup. Isi saldo terlebih dahulu atau pilih Hutang.</div>
                        )}
                     </div>
                  </div>
               </div>

               <div className="beli-produk-panel">
                  <div className="panel-header">
                     <div>
                        <h2>Riwayat Order</h2>
                        <p>Order terakhir dikirim ke admin.</p>
                     </div>
                  </div>
                  <div className="history-table-wrap">
                     <table className="history-table">
                        <thead>
                           <tr>
                              <th>Tanggal</th>
                              <th>Total</th>
                              <th>Metode</th>
                              <th>Status Order</th>
                              <th>Status Bayar</th>
                           </tr>
                        </thead>
                        <tbody>
                           {orders.length === 0 ? (
                              <tr>
                                 <td className="history-empty" colSpan={5}>
                                    Belum ada order.
                                 </td>
                              </tr>
                           ) : (
                              orders.map((order) => (
                                 <tr key={order.id}>
                                    <td>{new Date(order.created_at).toLocaleString("id-ID")}</td>
                                    <td>Rp {Number(order.total_harga || 0).toLocaleString()}</td>
                                    <td>{order.metode_pembayaran}</td>
                                    <td>{order.status_order}</td>
                                    <td>{order.status_pembayaran}</td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </>
         )}
      </div>
   );
}
