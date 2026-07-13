"use client";

import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { toast } from "react-hot-toast";
import { createClient } from "@/utils/supabase";
import "./kasir.css";

const supabase = createClient();

export default function KasirPage() {
   const [products, setProducts] = useState([]);
   const [siswa, setSiswa] = useState([]);
   const [guru, setGuru] = useState([]);
   const [customerType, setCustomerType] = useState("siswa");
   const [selectedSiswa, setSelectedSiswa] = useState(null);
   const [selectedGuru, setSelectedGuru] = useState(null);
   const [productSearch, setProductSearch] = useState("");
   const [cart, setCart] = useState([]);
   const [paymentMethod, setPaymentMethod] = useState("Tunai");
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      fetchAll();
   }, []);

   async function fetchAll() {
      const [{ data: produk }, { data: listSiswa }, { data: listGuru }] = await Promise.all([
         supabase.from("produk").select("*"),
         supabase.from("siswa").select("nis,nama_siswa,kelas,total_hutang,saldo"),
         supabase.from("guru").select("nip,nama_guru,bidang_studi,total_hutang,saldo"),
      ]);

      setProducts(produk ?? []);
      setSiswa(listSiswa ?? []);
      setGuru(listGuru ?? []);
   }

   function addToCart(p) {
      if (!p.stok || p.stok <= 0) return;
      setCart((prev) => {
         const existing = prev.find((i) => i.id === p.id);
         if (existing) {
            return prev.map((i) => (i.id === p.id ? { ...i, qty: Math.min(i.qty + 1, p.stok) } : i));
         }
         return [...prev, { id: p.id, nama: p.nama_produk, harga: p.harga_jual ?? p.harga_beli ?? 0, qty: 1, stok: p.stok }];
      });
   }

   function changeQty(id, delta) {
      setCart((prev) => {
         return prev
            .map((i) => {
               if (i.id !== id) return i;
               const newQty = i.qty + delta;
               return { ...i, qty: Math.max(0, Math.min(newQty, i.stok)) };
            })
            .filter((i) => i.qty > 0);
      });
   }

   const total = cart.reduce((s, i) => s + i.harga * i.qty, 0);

   const filteredProducts = useMemo(() => {
      const query = productSearch.toLowerCase().trim();
      return products
         .filter((p) =>
            !query ||
            p.nama_produk.toLowerCase().includes(query) ||
            String(p.id).includes(query)
         )
         .sort((a, b) => {
            if ((a.stok > 0) !== (b.stok > 0)) {
               return b.stok > 0 ? 1 : -1;
            }
            return a.nama_produk.localeCompare(b.nama_produk);
         });
   }, [products, productSearch]);

   const siswaOptions = useMemo(
      () =>
         siswa
            .slice()
            .sort((a, b) => String(a.nis).localeCompare(String(b.nis)))
            .map((s) => ({
               value: s.nis,
               label: `${s.nis} - ${s.nama_siswa} (${s.kelas})`,
               siswa: s,
            })),
      [siswa]
   );

   const guruOptions = useMemo(
      () =>
         guru
            .slice()
            .sort((a, b) => String(a.nip).localeCompare(String(b.nip)))
            .map((t) => ({
               value: t.nip,
               label: `${t.nip} - ${t.nama_guru} (${t.bidang_studi})`,
               guru: t,
            })),
      [guru]
   );

   const customerOptions = customerType === "siswa" ? siswaOptions : guruOptions;
   const selectedCustomer = customerType === "siswa" ? selectedSiswa : selectedGuru;
   const customerLabel = customerType === "siswa" ? "siswa" : "guru";

   async function handleProcess() {
      const customerId = selectedCustomer?.value;
      if (!customerId) return toast.error(`Pilih ${customerLabel} terlebih dahulu`);
      if (cart.length === 0) return toast.error("Keranjang kosong");

      // Validate saldo for Saldo payment method
      if (paymentMethod === "Saldo") {
         const customerObj = customerType === "siswa" ? selectedSiswa?.siswa : selectedGuru?.guru;
         const customerSaldo = Number(customerObj?.saldo ?? 0);
         if (customerSaldo < total) {
            return toast.error(`Saldo tidak cukup. Saldo: Rp ${customerSaldo.toLocaleString()}, Total: Rp ${total.toLocaleString()}`);
         }
      }

      setLoading(true);
      try {
         // create transaksi (generate simple id)
         const trxId = `trx_${Date.now()}`;
         const transactionRow = {
            id: trxId,
            customer_type: customerType,
            nis_siswa: customerType === "siswa" ? customerId : null,
            nip_guru: customerType === "guru" ? customerId : null,
            transaction_type: "purchase",
            payment_method: paymentMethod,
            payment_status: paymentMethod === "Hutang" ? "Belum Lunas" : "Lunas",
            amount_total: total,
            amount_paid: paymentMethod === "Hutang" ? 0 : total,
            amount_due: paymentMethod === "Hutang" ? total : 0,
         };

         const { data: transaksiData, error: tErr } = await supabase.from("transaksi").insert(transactionRow).select().single();
         if (tErr) throw tErr;

         const transaksiId = transaksiData.id ?? trxId;

         // insert detail_transaksi (schema requires harga_satuan and sub_total)
         const details = cart.map((it) => ({
            transaksi_id: transaksiId,
            produk_id: it.id,
            jumlah: it.qty,
            harga_satuan: it.harga,
            sub_total: it.qty * it.harga,
         }));
         const { error: dErr } = await supabase.from("detail_transaksi").insert(details);
         if (dErr) throw dErr;

         // update produk stok
         for (const it of cart) {
            const prod = products.find((p) => p.id === it.id);
            const newStok = (prod?.stok ?? 0) - it.qty;
            await supabase.from("produk").update({ stok: newStok }).eq("id", it.id);
         }

         if (paymentMethod === "Hutang") {
            if (customerType === "siswa") {
               const siswaObj = selectedSiswa?.siswa;
               const current = Number(siswaObj?.total_hutang ?? 0);
               await supabase.from("siswa").update({ total_hutang: current + total }).eq("nis", customerId);
            } else {
               const guruObj = selectedGuru?.guru;
               const current = Number(guruObj?.total_hutang ?? 0);
               await supabase.from("guru").update({ total_hutang: current + total }).eq("nip", customerId);
            }
         } else if (paymentMethod === "Saldo") {
            if (customerType === "siswa") {
               const siswaObj = selectedSiswa?.siswa;
               const newSaldo = Number(siswaObj?.saldo ?? 0) - total;
               await supabase.from("siswa").update({ saldo: newSaldo }).eq("nis", customerId);
               await supabase.from("saldo_log").insert({
                  customer_type: "siswa",
                  nis_siswa: customerId,
                  transaksi_id: transaksiId,
                  log_type: "Order_Saldo",
                  amount: -total,
                  balance_before: Number(siswaObj?.saldo ?? 0),
                  balance_after: newSaldo,
                  payment_method: "Saldo",
                  note: `Pembelian produk via kasir dengan saldo`,
               });
            } else {
               const guruObj = selectedGuru?.guru;
               const newSaldo = Number(guruObj?.saldo ?? 0) - total;
               await supabase.from("guru").update({ saldo: newSaldo }).eq("nip", customerId);
               await supabase.from("saldo_log").insert({
                  customer_type: "guru",
                  nip_guru: customerId,
                  transaksi_id: transaksiId,
                  log_type: "Order_Saldo",
                  amount: -total,
                  balance_before: Number(guruObj?.saldo ?? 0),
                  balance_after: newSaldo,
                  payment_method: "Saldo",
                  note: `Pembelian produk via kasir dengan saldo`,
               });
            }
         }

         toast.success("Transaksi berhasil");
         setCart([]);
         await fetchAll();
      } catch (err) {
         console.error("Error detail:", err);
         const errorMsg = err?.message || err?.error_description || JSON.stringify(err) || "Error tidak diketahui";
         toast.error(`Error: ${errorMsg}`);
      } finally {
         setLoading(false);
      }
   }

   return (
      <div className="pos">
         <div className="pos__left">
            <div className="panel product-panel">
               <div className="panel__header">
                  <div>
                     <h2>Produk</h2>
                     <p className="panel__meta">{filteredProducts.length} produk ditemukan</p>
                  </div>
                  <input
                     className="search-input"
                     type="search"
                     value={productSearch}
                     onChange={(e) => setProductSearch(e.target.value)}
                     placeholder="Cari produk..."
                  />
               </div>

               <div className="product-grid">
                  {filteredProducts.length === 0 ? (
                     <div className="empty-state">Tidak ada produk ditemukan.</div>
                  ) : (
                     filteredProducts.map((p) => (
                        <div
                           key={p.id}
                           className={`product-card ${p.stok <= 0 ? "product-card--disabled" : ""}`}
                           onClick={() => p.stok > 0 && addToCart(p)}
                        >
                           <div className="product-card__top">
                              <div className="product-card__name">{p.nama_produk}</div>
                              <div className={`product-card__badge ${p.stok > 0 ? "product-card__badge--available" : "product-card__badge--empty"}`}>
                                 {p.stok > 0 ? `Stok ${p.stok}` : "Habis"}
                              </div>
                           </div>
                           <div className="product-card__price">Rp {(p.harga_jual ?? p.harga_beli ?? 0).toLocaleString()}</div>
                        </div>
                     ))
                  )}
               </div>
            </div>
         </div>

         <div className="pos__right">
            <div className="cart">
               <div className="panel__header">
                  <div>
                     <h2>Kasir POS</h2>
                     <p className="panel__meta">Pilih siswa dan proses pesanan</p>
                  </div>
               </div>

               <div className="cart__siswa">
                  <div className="customer-toggle" role="tablist" aria-label="Pilih pelanggan">
                     <button
                        type="button"
                        className={`customer-toggle__button ${customerType === "siswa" ? "customer-toggle__button--active" : ""}`}
                        onClick={() => {
                           setCustomerType("siswa");
                           setSelectedGuru(null);
                        }}
                     >
                        Siswa
                     </button>
                     <button
                        type="button"
                        className={`customer-toggle__button ${customerType === "guru" ? "customer-toggle__button--active" : ""}`}
                        onClick={() => {
                           setCustomerType("guru");
                           setSelectedSiswa(null);
                        }}
                     >
                        Guru
                     </button>
                  </div>

                  <label htmlFor="customer-select">Pilih {customerType === "siswa" ? "Siswa" : "Guru"}</label>
                  <Select
                     inputId="customer-select"
                     options={customerOptions}
                     value={selectedCustomer}
                     onChange={customerType === "siswa" ? setSelectedSiswa : setSelectedGuru}
                     placeholder={customerType === "siswa" ? "Cari dan pilih siswa..." : "Cari dan pilih guru..."}
                     isSearchable
                     className="react-select-container"
                     classNamePrefix="react-select"
                     noOptionsMessage={() => (customerType === "siswa" ? "Tidak ada siswa" : "Tidak ada guru")}
                  />
               </div>

               <div className="cart__list">
                  {cart.length === 0 && <div className="note">Keranjang kosong</div>}
                  {cart.map((it) => (
                     <div className="cart-item" key={it.id}>
                        <div className="cart-item__meta">
                           <div>{it.nama}</div>
                           <div className="note">Rp {it.harga.toLocaleString()}</div>
                        </div>
                        <div className="cart-item__controls">
                           <button className="btn" onClick={() => changeQty(it.id, -1)}>-</button>
                           <div className="controls__qty">{it.qty}</div>
                           <button className="btn" onClick={() => changeQty(it.id, +1)}>+</button>
                        </div>
                     </div>
                  ))}
               </div>

               <div className="payment">
                  <div>
                     <label>
                        <input type="radio" name="metode" value="Tunai" checked={paymentMethod === "Tunai"} onChange={() => setPaymentMethod("Tunai")} /> Tunai
                     </label>
                     <label style={{ marginLeft: 8 }}>
                        <input type="radio" name="metode" value="QRIS" checked={paymentMethod === "QRIS"} onChange={() => setPaymentMethod("QRIS")} /> QRIS
                     </label>
                     <label style={{ marginLeft: 8 }}>
                        <input type="radio" name="metode" value="Saldo" checked={paymentMethod === "Saldo"} onChange={() => setPaymentMethod("Saldo")} /> Saldo
                     </label>
                     <label style={{ marginLeft: 8 }}>
                        <input type="radio" name="metode" value="Hutang" checked={paymentMethod === "Hutang"} onChange={() => setPaymentMethod("Hutang")} /> Hutang
                     </label>
                  </div>
                  <div className="total">Total: Rp {total.toLocaleString()}</div>
                  {paymentMethod === "Saldo" && selectedCustomer && (
                     <div style={{ fontSize: "0.9rem", color: "#666", marginTop: 8 }}>
                        Saldo tersedia: Rp {Number(customerType === "siswa" ? selectedCustomer.siswa?.saldo : selectedCustomer.guru?.saldo ?? 0).toLocaleString()}
                     </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                     <button className="btn btn--primary" onClick={handleProcess} disabled={loading}>
                        {loading ? "Memproses..." : "Proses"}
                     </button>
                     <button
                        className="btn"
                        onClick={() => {
                           setCart([]);
                        }}
                     >
                        Bersihkan
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}


