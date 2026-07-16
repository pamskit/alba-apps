"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
   const [scanPreview, setScanPreview] = useState("");
   const [isScanMode, setIsScanMode] = useState(false);
   const [cart, setCart] = useState([]);
   const [paymentMethod, setPaymentMethod] = useState("Tunai");
   const [loading, setLoading] = useState(false);
   const scanInputRef = useRef(null);
   const scanBufferRef = useRef("");
   const scanLastKeyTsRef = useRef(0);

   useEffect(() => {
      fetchAll();
   }, []);

   useEffect(() => {
      if (!isScanMode) return;
      scanInputRef.current?.focus();
   }, [isScanMode]);

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

   const hasProductSearch = productSearch.trim().length > 0;

   const productLookup = useMemo(() => {
      const lookup = new Map();

      products.forEach((product) => {
         [product.barcode, product.kode_produk, product.id]
            .filter(Boolean)
            .map((value) => String(value).trim())
            .forEach((key) => {
               if (!lookup.has(key)) {
                  lookup.set(key, product);
               }
            });
      });

      return lookup;
   }, [products]);

   function handleScanSubmit(rawValue) {
      const scannedValue = String(rawValue ?? "").trim();

      if (!scannedValue) {
         toast.error("Scan barcode terlebih dahulu");
         return;
      }

      const matchedProduct = productLookup.get(scannedValue);

      if (!matchedProduct) {
         toast.error("Produk tidak ditemukan");
         return;
      }

      if (!matchedProduct.stok || matchedProduct.stok <= 0) {
         toast.error("Stok produk habis");
         return;
      }

      addToCart(matchedProduct);
      toast.success(`${matchedProduct.nama_produk} ditambahkan`);
      setScanPreview(scannedValue);
      scanBufferRef.current = "";
      requestAnimationFrame(() => {
         scanInputRef.current?.focus();
      });
   }

   function handleScanKeyDown(event) {
      if (!isScanMode) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "Escape") {
         setIsScanMode(false);
         setScanPreview("");
         scanBufferRef.current = "";
         return;
      }

      const now = Date.now();
      if (now - scanLastKeyTsRef.current > 150) {
         scanBufferRef.current = "";
      }
      scanLastKeyTsRef.current = now;

      if (event.key === "Enter") {
         event.preventDefault();
         handleScanSubmit(scanBufferRef.current);
         scanBufferRef.current = "";
         return;
      }

      if (event.key === "Backspace") {
         event.preventDefault();
         scanBufferRef.current = scanBufferRef.current.slice(0, -1);
         setScanPreview(scanBufferRef.current);
         return;
      }

      if (event.key.length === 1) {
         event.preventDefault();
         scanBufferRef.current += event.key;
         setScanPreview(scanBufferRef.current);
      }
   }

   function startScanMode() {
      setIsScanMode(true);
      setScanPreview("");
      scanBufferRef.current = "";
      requestAnimationFrame(() => {
         scanInputRef.current?.focus();
      });
   }

   function resetScanMode() {
      setIsScanMode(false);
      setScanPreview("");
      scanBufferRef.current = "";
   }

   const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
   const selectedBalance =
      customerType === "siswa"
         ? Number(selectedSiswa?.siswa?.saldo ?? 0)
         : Number(selectedGuru?.guru?.saldo ?? 0);
   const selectedDebt =
      customerType === "siswa"
         ? Number(selectedSiswa?.siswa?.total_hutang ?? 0)
         : Number(selectedGuru?.guru?.total_hutang ?? 0);
   const insufficientSaldo = paymentMethod === "Saldo" && selectedBalance < total;

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
      <div className="pos-shell">
         <header className="pos-shell__header">
            <div>
               <p className="pos-kicker">Kasir Admin</p>
               <h1>POS ringan untuk transaksi cepat</h1>
               <p className="pos-subtitle">Fokus ke pilih pelanggan, cari produk, lalu proses dalam satu alur yang singkat.</p>
            </div>
            <div className="pos-stats">
               <div className="pos-stat">
                  <span>Produk</span>
                  <strong>{filteredProducts.length}</strong>
               </div>
               <div className="pos-stat">
                  <span>Item</span>
                  <strong>{cartCount}</strong>
               </div>
               <div className="pos-stat">
                  <span>Total</span>
                  <strong>Rp {total.toLocaleString()}</strong>
               </div>
            </div>
         </header>

         <div className="pos-layout">
            <section className="pos-panel pos-panel--products">
               <div className="pos-panel__header">
                  <div>
                     <h2>Produk</h2>
                     <p>{filteredProducts.length} hasil</p>
                  </div>
                  <div className="pos-panel__actions">
                     <input
                        className="pos-search"
                        type="search"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Cari nama / kode produk"
                     />
                  </div>
               </div>

               <div className="pos-scan-field">
                  <label className="pos-scan-label">Barcode</label>
                  <div className="pos-scan-box">
                     <div className="pos-scan-box__status">
                        {isScanMode ? "Mode scan aktif. Arahkan scanner lalu tekan Enter." : "Barcode diisi dari scanner."}
                     </div>
                     <div className="pos-scan-box__actions">
                        <button
                           type="button"
                           className="btn btn--primary pos-scan-box__button"
                           onClick={startScanMode}
                           disabled={isScanMode || loading}
                        >
                           {isScanMode ? "Scanning..." : "Mulai Scan"}
                        </button>
                        <button
                           type="button"
                           className="btn pos-scan-box__button"
                           onClick={resetScanMode}
                           disabled={loading}
                        >
                           Reset
                        </button>
                     </div>
                     {scanPreview && <div className="pos-scan-box__preview">Preview scan: {scanPreview}</div>}
                  </div>
               </div>

               <input
                  ref={scanInputRef}
                  className="pos-scan-capture"
                  type="text"
                  value={scanPreview}
                  readOnly
                  onKeyDown={handleScanKeyDown}
                  autoComplete="off"
                  inputMode="numeric"
                  aria-label="Scanner produk"
                  tabIndex={0}
               />

               <div
                  className={`pos-product-list ${hasProductSearch ? "pos-product-list--search" : ""}`}
                  role="list"
                  aria-label="Daftar produk"
               >
                  {filteredProducts.length === 0 ? (
                     <div className="pos-empty">Tidak ada produk ditemukan.</div>
                  ) : (
                     filteredProducts.map((p) => {
                        const price = p.harga_jual ?? p.harga_beli ?? 0;
                        const available = p.stok > 0;

                        return (
                           <button
                              key={p.id}
                              type="button"
                              className={`pos-product ${available ? "" : "pos-product--disabled"}`}
                              onClick={() => available && addToCart(p)}
                              disabled={!available}
                           >
                              <div className="pos-product__main">
                                 <div className="pos-product__title-row">
                                    <span className="pos-product__id">#{p.id}</span>
                                    <strong>{p.nama_produk}</strong>
                                 </div>
                                 <div className="pos-product__meta">
                                    <span className={`pos-pill ${available ? "pos-pill--success" : "pos-pill--danger"}`}>
                                       {available ? `Stok ${p.stok}` : "Habis"}
                                    </span>
                                    <span className="pos-product__price">Rp {price.toLocaleString()}</span>
                                 </div>
                              </div>
                           </button>
                        );
                     })
                  )}
               </div>
            </section>

            <aside className="pos-panel pos-panel--cart">
               <div className="pos-panel__header">
                  <div>
                     <h2>Keranjang</h2>
                     <p>{cartCount} item siap diproses</p>
                  </div>
               </div>

               <div className="pos-customer">
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

                  <Select
                     inputId="customer-select"
                     options={customerOptions}
                     value={selectedCustomer}
                     onChange={customerType === "siswa" ? setSelectedSiswa : setSelectedGuru}
                     placeholder={customerType === "siswa" ? "Cari / pilih siswa" : "Cari / pilih guru"}
                     isSearchable
                     className="react-select-container"
                     classNamePrefix="react-select"
                     noOptionsMessage={() => (customerType === "siswa" ? "Tidak ada siswa" : "Tidak ada guru")}
                  />

                  <div className="pos-customer__summary">
                     <div>
                        <span>Saldo</span>
                        <strong>Rp {selectedBalance.toLocaleString()}</strong>
                     </div>
                     <div>
                        <span>Hutang</span>
                        <strong>Rp {selectedDebt.toLocaleString()}</strong>
                     </div>
                  </div>
               </div>

               <div className="pos-cart-list">
                  {cart.length === 0 ? (
                     <div className="pos-empty pos-empty--compact">Keranjang masih kosong.</div>
                  ) : (
                     cart.map((it) => (
                        <div className="pos-cart-item" key={it.id}>
                           <div className="pos-cart-item__info">
                              <strong>{it.nama}</strong>
                              <span>Rp {it.harga.toLocaleString()}</span>
                           </div>
                           <div className="pos-cart-item__controls">
                              <button type="button" className="pos-icon-button" onClick={() => changeQty(it.id, -1)} aria-label={`Kurangi ${it.nama}`}>
                                 -
                              </button>
                              <div className="pos-cart-item__qty">{it.qty}</div>
                              <button type="button" className="pos-icon-button" onClick={() => changeQty(it.id, 1)} aria-label={`Tambah ${it.nama}`}>
                                 +
                              </button>
                           </div>
                        </div>
                     ))
                  )}
               </div>

               <div className="pos-payment">
                  <div className="pos-payment__label">Metode bayar</div>
                  <div className="pos-payment__options">
                     {[
                        ["Tunai", "Tunai"],
                        ["QRIS", "QRIS"],
                        ["Saldo", "Saldo"],
                        ["Hutang", "Hutang"],
                     ].map(([value, label]) => (
                        <label key={value} className={`pos-payment-option ${paymentMethod === value ? "pos-payment-option--active" : ""}`}>
                           <input type="radio" name="metode" value={value} checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} />
                           <span>{label}</span>
                        </label>
                     ))}
                  </div>

                  <div className="pos-total">
                     <span>Total</span>
                     <strong>Rp {total.toLocaleString()}</strong>
                  </div>

                  {paymentMethod === "Saldo" && selectedCustomer && (
                     <div className="pos-hint">Saldo tersedia: Rp {selectedBalance.toLocaleString()}</div>
                  )}

                  <div className="pos-actions">
                     <button className="btn btn--primary" onClick={handleProcess} disabled={loading || insufficientSaldo}>
                        {loading ? "Memproses..." : "Proses transaksi"}
                     </button>
                     <button
                        className="btn"
                        type="button"
                        onClick={() => {
                           setCart([]);
                        }}
                     >
                        Kosongkan
                     </button>
                  </div>
               </div>
            </aside>
         </div>
      </div>
   );
}


