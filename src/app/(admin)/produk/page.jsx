"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { createClient } from "@/utils/supabase";
import Loading from "@/components/Loading";
import "./produk.css";

const supabase = createClient();

export default function ProdukPage() {
   const [products, setProducts] = useState([]);
   const [loading, setLoading] = useState(false);
   const [editingId, setEditingId] = useState(null);
   const [editStockValue, setEditStockValue] = useState(0);

   const [newNama, setNewNama] = useState("");
   const [newHargaBeli, setNewHargaBeli] = useState(0);
   const [newHargaJual, setNewHargaJual] = useState(0);
   const [newStok, setNewStok] = useState(0);
   const [searchQuery, setSearchQuery] = useState("");
   const [csvFile, setCsvFile] = useState(null);
   const [importLoading, setImportLoading] = useState(false);
   const [importError, setImportError] = useState("");
   const [importMessage, setImportMessage] = useState("");

   useEffect(() => {
      fetchProducts();
   }, []);

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
      setEditStockValue(p.stok ?? 0);
   }

   async function saveStock(id) {
      setLoading(true);
      try {
         const { error } = await supabase.from("produk").update({ stok: Number(editStockValue) }).eq("id", id);
         if (error) throw error;
         setEditingId(null);
         await fetchProducts();
      } catch (err) {
         console.error(err);
         toast.error("Gagal memperbarui stok");
      } finally {
         setLoading(false);
      }
   }

   async function handleAddProduct(e) {
      e.preventDefault();
      if (!newNama) return toast.error("Isi nama produk");
      setLoading(true);
      try {
         const { error } = await supabase
            .from("produk")
            .insert({
               nama_produk: newNama,
               harga_beli: Number(newHargaBeli),
               harga_jual: Number(newHargaJual),
               stok: Number(newStok),
            });
         if (error) throw error;
         setNewNama("");
         setNewHargaBeli(0);
         setNewHargaJual(0);
         setNewStok(0);
         await fetchProducts();
      } catch (err) {
         console.error(err);
         toast.error("Gagal menambahkan produk");
      } finally {
         setLoading(false);
      }
   }

   function downloadCsvTemplate() {
      const header = ["nama_produk", "harga_beli", "harga_jual", "stok"];
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
         const expected = ["nama_produk", "harga_beli", "harga_jual", "stok"];
         if (headers.length !== expected.length || !expected.every((name, idx) => headers[idx] === name)) {
            throw new Error("Header CSV harus: nama_produk,harga_beli,harga_jual,stok");
         }

         const rows = lines.slice(1).map((line, index) => {
            const cols = line.split(",").map((col) => col.trim());
            if (cols.length !== expected.length) {
               throw new Error(`Baris ${index + 2} tidak memiliki 4 kolom.`);
            }
            const [nama_produk, harga_beli, harga_jual, stok] = cols;
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
               nama_produk,
               harga_beli: hargaBeliNumber,
               harga_jual: hargaJualNumber,
               stok: stokNumber,
            };
         });

         const { error } = await supabase.from("produk").insert(rows);
         if (error) throw error;

         setImportMessage(`${rows.length} produk berhasil diimpor.`);
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
            <form className="produk-form" onSubmit={handleAddProduct}>
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
               <button className="btn btn--primary produk-form__button" type="submit" disabled={loading}>
                  Tambah Produk
               </button>
            </form>
         </section>

         <section className="produk-page__panel produk-page__import-panel">
            <div className="produk-import">
               <div className="produk-import__header">
                  <h2>Impor Produk CSV</h2>
                  <p>Unduh template CSV lalu unggah file berisi daftar produk.</p>
               </div>
               <div className="produk-import__controls">
                  <button className="btn btn--secondary produk-import__button" type="button" onClick={downloadCsvTemplate}>
                     Unduh Template CSV
                  </button>
                  <input
                     type="file"
                     accept=".csv"
                     onChange={(e) => {
                        setCsvFile(e.target.files?.[0] ?? null);
                        setImportError("");
                        setImportMessage("");
                     }}
                  />
                  <button className="btn btn--primary produk-import__button" type="button" onClick={handleImportCsv} disabled={importLoading || !csvFile}>
                     {importLoading ? "Mengimpor..." : "Impor CSV"}
                  </button>
               </div>
               {importMessage && <div className="produk-import__success">{importMessage}</div>}
               {importError && <div className="produk-import__error">{importError}</div>}
            </div>
         </section>

         <section className="produk-page__panel produk-page__table-panel">
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
               <div className="produk-page__summary">
                  Menampilkan {filteredProducts.length} dari {products.length} produk
               </div>
            </div>

            {loading && <Loading message="Memuat produk..." size="small" />}

            <table className="produk-table">
               <thead>
                  <tr>
                     <th>Nama Produk</th>
                     <th>Harga Beli</th>
                     <th>Harga Jual</th>
                     <th>Stok</th>
                     <th>Aksi</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredProducts.map((p) => (
                     <tr key={p.id}>
                        <td>{p.nama_produk}</td>
                        <td className="produk-table__numeric">Rp {Number(p.harga_beli ?? 0).toLocaleString()}</td>
                        <td className="produk-table__numeric">Rp {Number(p.harga_jual ?? 0).toLocaleString()}</td>
                        <td className="produk-table__numeric">
                           {editingId === p.id ? (
                              <input
                                 className="produk-table__stock-input"
                                 type="number"
                                 value={editStockValue}
                                 onChange={(e) => setEditStockValue(e.target.value)}
                              />
                           ) : (
                              p.stok ?? 0
                           )}
                        </td>
                        <td>
                           <div className="produk-actions">
                              {editingId === p.id ? (
                                 <>
                                    <button className="btn btn--primary produk-actions__button" onClick={() => saveStock(p.id)} disabled={loading}>
                                       Simpan
                                    </button>
                                    <button className="btn produk-actions__button" onClick={() => setEditingId(null)}>
                                       Batal
                                    </button>
                                 </>
                              ) : (
                                 <>
                                    <button className="btn produk-actions__button" onClick={() => startEdit(p)}>
                                       Edit Stok
                                    </button>
                                    <button
                                       className="btn produk-actions__button btn--danger"
                                       onClick={async () => {
                                          if (!confirm(`Hapus produk ${p.nama_produk}?`)) return;
                                          setLoading(true);
                                          try {
                                             const { error } = await supabase.from("produk").delete().eq("id", p.id);
                                             if (error) throw error;
                                             await fetchProducts();
                                          } catch (err) {
                                             console.error(err);
                                             toast.error("Gagal menghapus produk");
                                          } finally {
                                             setLoading(false);
                                          }
                                       }}
                                    >
                                       Hapus
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
         </section>
      </div>
   );
}
