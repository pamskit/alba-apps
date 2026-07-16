"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { createClient } from "@/utils/supabase";
import Loading from "@/components/Loading";
import "./produk.css";

const supabase = createClient();

function generateProductCode(existingCodes) {
   let attempts = 0;
   while (attempts < 50) {
      const now = new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const code = `PRD-${datePart}-${randomPart}`;
      if (!existingCodes.has(code)) {
         return code;
      }
      attempts += 1;
   }
   return `PRD-${Date.now()}`;
}

function EditIcon() {
   return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
         <path d="M4 20h4l10-10-4-4L4 16v4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
         <path d="M13 7l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
   );
}

function SaveIcon() {
   return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
         <path d="M5 12l5 5L20 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
   );
}

function CancelIcon() {
   return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
         <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
   );
}

function DeleteIcon() {
   return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
         <path d="M4 7h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
         <path d="M9 7V5h6v2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
         <path d="M8 7l1 12h6l1-12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
   );
}

export default function ProdukPage() {
   const [products, setProducts] = useState([]);
   const [loading, setLoading] = useState(false);
   const [editingId, setEditingId] = useState(null);
   const [editValues, setEditValues] = useState({
      nama_produk: "",
      harga_beli: 0,
      harga_jual: 0,
      stok: 0,
   });
   const [isAddModalOpen, setIsAddModalOpen] = useState(false);

   const [newKodeProduk, setNewKodeProduk] = useState("");
   const [newNama, setNewNama] = useState("");
   const [newBarcode, setNewBarcode] = useState("");
   const [scanPreview, setScanPreview] = useState("");
   const [isScanMode, setIsScanMode] = useState(false);
   const [newHargaBeli, setNewHargaBeli] = useState(0);
   const [newHargaJual, setNewHargaJual] = useState(0);
   const [newStok, setNewStok] = useState(0);
   const [searchQuery, setSearchQuery] = useState("");
   const [csvFile, setCsvFile] = useState(null);
   const [importLoading, setImportLoading] = useState(false);
   const [importError, setImportError] = useState("");
   const [importMessage, setImportMessage] = useState("");
   const scanBufferRef = useRef("");
   const scanLastKeyTsRef = useRef(0);

   useEffect(() => {
      fetchProducts();
   }, []);

   useEffect(() => {
      if (!isAddModalOpen) {
         setIsScanMode(false);
         setScanPreview("");
         scanBufferRef.current = "";
      }
   }, [isAddModalOpen]);

   useEffect(() => {
      if (!isAddModalOpen || !isScanMode) return;

      const handleScanKeydown = (event) => {
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
            const scannedValue = scanBufferRef.current.trim();
            if (!scannedValue) return;
            setNewBarcode(scannedValue);
            setScanPreview(scannedValue);
            setIsScanMode(false);
            scanBufferRef.current = "";
            toast.success("Barcode berhasil discan");
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
      };

      window.addEventListener("keydown", handleScanKeydown);
      return () => window.removeEventListener("keydown", handleScanKeydown);
   }, [isAddModalOpen, isScanMode]);

   async function fetchProducts() {
      setLoading(true);
      try {
         const { data, error } = await supabase.from("produk").select("*").order("nama_produk", { ascending: true });
         if (error) throw error;
         setProducts(data ?? []);
      } catch (err) {
         console.error(err);
         toast.error("Gagal memuat produk");
      } finally {
         setLoading(false);
      }
   }

   function startEdit(p) {
      setEditingId(p.id);
      setEditValues({
         nama_produk: p.nama_produk ?? "",
         harga_beli: Number(p.harga_beli ?? 0),
         harga_jual: Number(p.harga_jual ?? 0),
         stok: Number(p.stok ?? 0),
      });
   }

   function cancelEdit() {
      setEditingId(null);
      setEditValues({
         nama_produk: "",
         harga_beli: 0,
         harga_jual: 0,
         stok: 0,
      });
   }

   async function saveProductUpdate(id) {
      if (!editValues.nama_produk.trim()) {
         toast.error("Nama produk wajib diisi");
         return;
      }
      if (Number(editValues.harga_beli) < 0 || Number(editValues.harga_jual) < 0 || Number(editValues.stok) < 0) {
         toast.error("Harga dan stok tidak boleh negatif");
         return;
      }

      setLoading(true);
      try {
         const { error } = await supabase
            .from("produk")
            .update({
               nama_produk: editValues.nama_produk.trim(),
               harga_beli: Number(editValues.harga_beli),
               harga_jual: Number(editValues.harga_jual),
               stok: Number(editValues.stok),
            })
            .eq("id", id);
         if (error) throw error;
         cancelEdit();
         toast.success("Produk berhasil diperbarui");
         await fetchProducts();
      } catch (err) {
         console.error(err);
         toast.error("Gagal memperbarui produk");
      } finally {
         setLoading(false);
      }
   }

   async function handleAddProduct(e) {
      e.preventDefault();
      if (!newNama) return toast.error("Isi nama produk");
      if (!newBarcode.trim()) return toast.error("Isi barcode produk");
      if (!newKodeProduk) return toast.error("Kode produk belum tergenerate, coba buka ulang modal");
      setLoading(true);
      try {
         const normalizedBarcode = newBarcode.trim();
         const { data: existingRows, error: existingCheckError } = await supabase
            .from("produk")
            .select("id,nama_produk,stok")
            .eq("barcode", normalizedBarcode)
            .limit(1);

         if (existingCheckError) throw existingCheckError;

         const existingProduct = existingRows?.[0];
         if (existingProduct) {
            const updatedStock = Number(existingProduct.stok ?? 0) + Number(newStok);
            const { error: updateError } = await supabase
               .from("produk")
               .update({ stok: updatedStock })
               .eq("id", existingProduct.id);

            if (updateError) throw updateError;

            setNewKodeProduk("");
            setNewNama("");
            setNewBarcode("");
            setScanPreview("");
            setIsScanMode(false);
            setNewHargaBeli(0);
            setNewHargaJual(0);
            setNewStok(0);
            setIsAddModalOpen(false);
            toast.success(`Produk sudah ada, stok ${existingProduct.nama_produk} ditambahkan`);
            await fetchProducts();
            return;
         }

         const { error } = await supabase
            .from("produk")
            .insert({
               kode_produk: newKodeProduk,
               nama_produk: newNama,
               barcode: normalizedBarcode,
               harga_beli: Number(newHargaBeli),
               harga_jual: Number(newHargaJual),
               stok: Number(newStok),
            });
         if (error) throw error;
         setNewKodeProduk("");
         setNewNama("");
         setNewBarcode("");
         setScanPreview("");
         setIsScanMode(false);
         setNewHargaBeli(0);
         setNewHargaJual(0);
         setNewStok(0);
         setIsAddModalOpen(false);
         toast.success("Produk berhasil ditambahkan");
         await fetchProducts();
      } catch (err) {
         console.error(err);
         if (String(err?.message || "").toLowerCase().includes("barcode")) {
            toast.error("Barcode sudah dipakai produk lain");
            return;
         }
         toast.error("Gagal menambahkan produk");
      } finally {
         setLoading(false);
      }
   }

   function downloadCsvTemplate() {
      const header = ["barcode", "nama_produk", "harga_beli", "harga_jual", "stok"];
      const csv = [header.join(",")].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "template_produk.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
   }

   async function handleImportCsv(e) {
      e.preventDefault();
      setImportMessage("");
      setImportError("");
      if (!csvFile) {
         setImportError("Pilih file CSV terlebih dahulu.");
         return;
      }

      setImportLoading(true);
      try {
         const text = await csvFile.text();
         const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
         if (lines.length < 2) {
            throw new Error("File CSV tidak berisi data produk.");
         }

         const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
         const expected = ["barcode", "nama_produk", "harga_beli", "harga_jual", "stok"];
         if (headers.length !== expected.length || !expected.every((name, idx) => headers[idx] === name)) {
            throw new Error("Header CSV harus: barcode,nama_produk,harga_beli,harga_jual,stok");
         }

         const usedCodes = new Set(products.map((product) => product.kode_produk).filter(Boolean));
         const existingByBarcode = new Map(
            products
               .filter((product) => product.barcode)
               .map((product) => [String(product.barcode).trim(), { id: product.id, stok: Number(product.stok ?? 0) }])
         );

         const rows = lines.slice(1).map((line, index) => {
            const cols = line.split(",").map((col) => col.trim());
            if (cols.length !== expected.length) {
               throw new Error(`Baris ${index + 2} tidak memiliki 5 kolom.`);
            }
            const [barcode, nama_produk, harga_beli, harga_jual, stok] = cols;
            if (!barcode) {
               throw new Error(`Baris ${index + 2}: barcode wajib diisi.`);
            }
            if (!nama_produk) {
               throw new Error(`Baris ${index + 2}: nama_produk wajib diisi.`);
            }
            const hargaBeliNumber = Number(harga_beli);
            const hargaJualNumber = Number(harga_jual);
            const stokNumber = Number(stok);
            if (Number.isNaN(hargaBeliNumber) || hargaBeliNumber < 0) {
               throw new Error(`Baris ${index + 2}: harga_beli harus angka >= 0.`);
            }
            if (Number.isNaN(hargaJualNumber) || hargaJualNumber < 0) {
               throw new Error(`Baris ${index + 2}: harga_jual harus angka >= 0.`);
            }
            if (Number.isNaN(stokNumber) || stokNumber < 0) {
               throw new Error(`Baris ${index + 2}: stok harus angka >= 0.`);
            }

            return {
               barcode,
               nama_produk,
               harga_beli: hargaBeliNumber,
               harga_jual: hargaJualNumber,
               stok: stokNumber,
            };
         });

         const rowsToInsert = [];
         const updatesById = new Map();

         rows.forEach((row) => {
            const barcodeKey = String(row.barcode).trim();
            const existing = existingByBarcode.get(barcodeKey);

            if (existing) {
               const currentUpdate = updatesById.get(existing.id);
               if (currentUpdate) {
                  currentUpdate.stok += row.stok;
                  currentUpdate.nama_produk = row.nama_produk;
                  currentUpdate.harga_beli = row.harga_beli;
                  currentUpdate.harga_jual = row.harga_jual;
               } else {
                  updatesById.set(existing.id, {
                     id: existing.id,
                     stok: existing.stok + row.stok,
                     nama_produk: row.nama_produk,
                     harga_beli: row.harga_beli,
                     harga_jual: row.harga_jual,
                  });
               }
               return;
            }

            const stagedRow = rowsToInsert.find((item) => item.barcode === barcodeKey);
            if (stagedRow) {
               stagedRow.stok += row.stok;
               stagedRow.nama_produk = row.nama_produk;
               stagedRow.harga_beli = row.harga_beli;
               stagedRow.harga_jual = row.harga_jual;
               return;
            }

            const generatedCode = generateProductCode(usedCodes);
            usedCodes.add(generatedCode);
            rowsToInsert.push({ ...row, barcode: barcodeKey, kode_produk: generatedCode });
         });

         if (updatesById.size > 0) {
            for (const update of updatesById.values()) {
               const { error: updateError } = await supabase
                  .from("produk")
                  .update({
                     nama_produk: update.nama_produk,
                     harga_beli: update.harga_beli,
                     harga_jual: update.harga_jual,
                     stok: update.stok,
                  })
                  .eq("id", update.id);
               if (updateError) throw updateError;
            }
         }

         if (rowsToInsert.length > 0) {
            const { error: insertError } = await supabase.from("produk").insert(rowsToInsert);
            if (insertError) throw insertError;
         }

         setImportMessage(
            `Impor selesai: ${rowsToInsert.length} produk baru ditambahkan, ${updatesById.size} produk existing di-restock.`
         );
         setCsvFile(null);
         await fetchProducts();
      } catch (err) {
         console.error(err);
         setImportError(err.message || "Gagal mengimpor CSV.");
      } finally {
         setImportLoading(false);
      }
   }

   const filteredProducts = products.filter((product) => {
      if (!searchQuery.trim()) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return (
         product.nama_produk.toLowerCase().includes(lowerQuery) ||
         String(product.harga_beli ?? "").includes(lowerQuery) ||
         String(product.harga_jual ?? "").includes(lowerQuery) ||
         String(product.stok).includes(lowerQuery)
      );
   });

   return (
      <div className="produk-page">
         <div className="produk-page__header">
            <div>
               <h1>Manajemen Produk</h1>
               <p className="produk-page__subtitle">Daftar produk, edit stok langsung, dan tambahkan produk baru dengan cepat.</p>
            </div>
         </div>

         <section className="produk-page__panel">
            <h2>Tambah Produk</h2>
            <p>Lakukan import produk atau tambahkan produk secara manual lewat modal.</p>

            <div className="produk-page__actions">
               <button
                  className="btn btn--primary produk-import__button"
                  type="button"
                  onClick={() => {
                     const usedCodes = new Set(products.map((product) => product.kode_produk).filter(Boolean));
                     setNewKodeProduk(generateProductCode(usedCodes));
                     setIsAddModalOpen(true);
                  }}
               >
                  Tambah Produk
               </button>
            </div>

            <div className="produk-import">
               <div className="produk-import__header">
                  <h2>Impor Produk CSV</h2>
                  <p>Unduh template, isi data produk, lalu unggah file CSV untuk tambah produk baru atau restock barcode yang sudah ada.</p>
               </div>
               <div className="produk-import__controls">
                  <button className="btn btn--secondary produk-import__button" type="button" onClick={downloadCsvTemplate}>
                     Unduh Template CSV
                  </button>
                  <label className="produk-import__file-field" htmlFor="produk-csv-file">
                     <span className="produk-import__file-label">Pilih File CSV</span>
                     <input
                        id="produk-csv-file"
                        className="produk-import__file-input"
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                           setCsvFile(e.target.files?.[0] ?? null);
                           setImportError("");
                           setImportMessage("");
                        }}
                     />
                     <span className="produk-import__file-name">{csvFile?.name || "Belum ada file dipilih"}</span>
                  </label>
                  <button className="btn btn--primary produk-import__button" type="button" onClick={handleImportCsv} disabled={importLoading || !csvFile}>
                     {importLoading ? "Mengimpor..." : "Impor CSV"}
                  </button>
               </div>
               <p className="produk-import__hint">Format wajib: barcode,nama_produk,harga_beli,harga_jual,stok</p>
               {importMessage && <div className="produk-import__success">{importMessage}</div>}
               {importError && <div className="produk-import__error">{importError}</div>}
            </div>
         </section>

         <section className="produk-import produk-page__panel produk-page__table-panel">
            <div className="produk-table-header">
               <h2>Daftar Produk</h2>
               <p >
                  Menampilkan {filteredProducts.length} dari {products.length} produk
               </p>
            </div>
            <div className="produk-page__toolbar">
               <div className="produk-page__search">
                  <label htmlFor="produk-search" className="produk-form__label">
                     Cari Produk
                  </label>
                  <input
                     id="produk-search"
                     className="produk-form__input produk-page__search-input"
                     type="search"
                     placeholder="Cari nama, harga beli, harga jual, atau stok"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
            </div>

            {loading && <Loading message="Memuat produk..." size="small" />}

            <div className="produk-table-wrap">
               <table className="produk-table">
                  <thead>
                     <tr>
                        <th>Nama Produk</th>
                        <th className="produk-table__numeric">Harga Beli</th>
                        <th className="produk-table__numeric">Harga Jual</th>
                        <th className="produk-table__numeric">Stok</th>
                        <th className="produk-table__actions">Aksi</th>
                     </tr>
                  </thead>
                  <tbody>
                     {filteredProducts.map((p) => (
                        <tr key={p.id}>
                           <td>
                              {editingId === p.id ? (
                                 <input
                                    className="produk-table__cell-input"
                                    type="text"
                                    value={editValues.nama_produk}
                                    onChange={(e) => setEditValues((prev) => ({ ...prev, nama_produk: e.target.value }))}
                                 />
                              ) : (
                                 p.nama_produk
                              )}
                           </td>
                           <td className="produk-table__numeric">
                              {editingId === p.id ? (
                                 <input
                                    className="produk-table__cell-input produk-table__cell-input--number"
                                    type="number"
                                    value={editValues.harga_beli}
                                    onChange={(e) => setEditValues((prev) => ({ ...prev, harga_beli: e.target.value }))}
                                 />
                              ) : (
                                 `Rp ${Number(p.harga_beli ?? 0).toLocaleString()}`
                              )}
                           </td>
                           <td className="produk-table__numeric">
                              {editingId === p.id ? (
                                 <input
                                    className="produk-table__cell-input produk-table__cell-input--number"
                                    type="number"
                                    value={editValues.harga_jual}
                                    onChange={(e) => setEditValues((prev) => ({ ...prev, harga_jual: e.target.value }))}
                                 />
                              ) : (
                                 `Rp ${Number(p.harga_jual ?? 0).toLocaleString()}`
                              )}
                           </td>
                           <td className="produk-table__numeric">
                              {editingId === p.id ? (
                                 <input
                                    className="produk-table__cell-input produk-table__cell-input--number"
                                    type="number"
                                    value={editValues.stok}
                                    onChange={(e) => setEditValues((prev) => ({ ...prev, stok: e.target.value }))}
                                 />
                              ) : (
                                 p.stok ?? 0
                              )}
                           </td>
                           <td className="produk-table__actions-cell">
                              <div className={`produk-actions ${editingId === p.id ? "produk-actions--editing" : ""}`}>
                                 {editingId === p.id ? (
                                    <>
                                       <button
                                          className="btn btn--primary produk-actions__button produk-actions__button--save"
                                          type="button"
                                          onClick={() => saveProductUpdate(p.id)}
                                          disabled={loading}
                                          aria-label="Simpan"
                                          title="Simpan"
                                       >
                                          <SaveIcon />
                                       </button>
                                       <button
                                          className="btn produk-actions__button produk-actions__button--cancel"
                                          type="button"
                                          onClick={cancelEdit}
                                          aria-label="Batal"
                                          title="Batal"
                                       >
                                          <CancelIcon />
                                       </button>
                                    </>
                                 ) : (
                                    <>
                                       <button
                                          className="btn produk-actions__button"
                                          type="button"
                                          onClick={() => startEdit(p)}
                                          aria-label="Edit data"
                                          title="Edit data"
                                       >
                                          <EditIcon />
                                       </button>
                                       <button
                                          className="btn produk-actions__button btn--danger"
                                          type="button"
                                          aria-label="Hapus produk"
                                          title="Hapus produk"
                                          onClick={async () => {
                                             if (!confirm(`Hapus produk ${p.nama_produk}?`)) return;
                                             setLoading(true);
                                             try {
                                                const { error } = await supabase.from("produk").delete().eq("id", p.id);
                                                if (error) throw error;
                                                await fetchProducts();
                                                toast.success(`Produk ${p.nama_produk} berhasil dihapus`);
                                             } catch (err) {
                                                console.error(err);
                                                toast.error("Gagal menghapus produk");
                                             } finally {
                                                setLoading(false);
                                             }
                                          }}
                                       >
                                          <DeleteIcon />
                                       </button>
                                    </>
                                 )}
                              </div>
                           </td>
                        </tr>
                     ))}
                     {filteredProducts.length === 0 && !loading && (
                        <tr>
                           <td colSpan={5} className="produk-table__empty">
                              Tidak ada produk yang cocok.
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </section>

         {isAddModalOpen && (
            <div className="produk-modal" role="dialog" aria-modal="true" aria-labelledby="produk-modal-title" onClick={() => setIsAddModalOpen(false)}>
               <div className="produk-modal__card" onClick={(e) => e.stopPropagation()}>
                  <div className="produk-modal__header">
                     <h2 id="produk-modal-title">Tambah Produk Baru</h2>
                     <button type="button" className="btn produk-modal__close" onClick={() => setIsAddModalOpen(false)}>
                        Tutup
                     </button>
                  </div>
                  <form className="produk-form" onSubmit={handleAddProduct}>
                     <div className="produk-form__group">
                        <label className="produk-form__label" htmlFor="product-kode">
                           Kode Produk
                        </label>
                        <input
                           id="product-kode"
                           className="produk-form__input produk-form__input--readonly"
                           value={newKodeProduk || "Generating..."}
                           readOnly
                        />
                     </div>
                     <div className="produk-form__group">
                        <label className="produk-form__label" htmlFor="product-name">
                           Nama Produk
                        </label>
                        <input
                           id="product-name"
                           className="produk-form__input"
                           placeholder="Nama produk"
                           value={newNama}
                           onChange={(e) => setNewNama(e.target.value)}
                        />
                     </div>
                     <div className="produk-form__group">
                        <label className="produk-form__label" htmlFor="product-barcode">
                           Barcode
                        </label>
                        <div className="produk-scan-box">
                           <div className="produk-scan-box__status">
                              {isScanMode ? "Mode scan aktif. Arahkan scanner lalu tekan Enter." : "Barcode diisi dari scanner."}
                           </div>
                           <div className="produk-scan-box__actions">
                              <button
                                 type="button"
                                 className="btn btn--primary produk-scan-box__button"
                                 onClick={() => {
                                    setIsScanMode(true);
                                    setScanPreview("");
                                    scanBufferRef.current = "";
                                 }}
                                 disabled={isScanMode || loading}
                              >
                                 {isScanMode ? "Scanning..." : "Mulai Scan"}
                              </button>
                              <button
                                 type="button"
                                 className="btn produk-scan-box__button"
                                 onClick={() => {
                                    setIsScanMode(false);
                                    setScanPreview("");
                                    setNewBarcode("");
                                    scanBufferRef.current = "";
                                 }}
                                 disabled={loading}
                              >
                                 Reset
                              </button>
                           </div>
                           {scanPreview && <div className="produk-scan-box__preview">Preview scan: {scanPreview}</div>}
                        </div>
                        <input
                           id="product-barcode"
                           className="produk-form__input produk-form__input--readonly"
                           placeholder="Klik Mulai Scan"
                           value={newBarcode}
                           readOnly
                        />
                     </div>
                     <div className="produk-form__group">
                        <label className="produk-form__label" htmlFor="product-buy-price">
                           Harga Beli
                        </label>
                        <input
                           id="product-buy-price"
                           className="produk-form__input"
                           placeholder="Harga beli"
                           type="number"
                           value={newHargaBeli}
                           onChange={(e) => setNewHargaBeli(e.target.value)}
                        />
                     </div>
                     <div className="produk-form__group">
                        <label className="produk-form__label" htmlFor="product-sell-price">
                           Harga Jual
                        </label>
                        <input
                           id="product-sell-price"
                           className="produk-form__input"
                           placeholder="Harga jual"
                           type="number"
                           value={newHargaJual}
                           onChange={(e) => setNewHargaJual(e.target.value)}
                        />
                     </div>
                     <div className="produk-form__group">
                        <label className="produk-form__label" htmlFor="product-stock">
                           Stok
                        </label>
                        <input
                           id="product-stock"
                           className="produk-form__input"
                           placeholder="Stok"
                           type="number"
                           value={newStok}
                           onChange={(e) => setNewStok(e.target.value)}
                        />
                     </div>
                     <div className="produk-modal__footer">
                        <button className="btn" type="button" onClick={() => setIsAddModalOpen(false)} disabled={loading}>
                           Batal
                        </button>
                        <button className="btn btn--primary produk-form__button" type="submit" disabled={loading}>
                           {loading ? "Menyimpan..." : "Tambah Produk"}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
}
