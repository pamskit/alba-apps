"use client";

import { useEffect, useState } from "react";
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
   const [newHarga, setNewHarga] = useState(0);
   const [newStok, setNewStok] = useState(0);
   const [searchQuery, setSearchQuery] = useState("");

   useEffect(() => {
      fetchProducts();
   }, []);

   async function fetchProducts() {
      setLoading(true);
      try {
         const { data, error } = await supabase.from("produk").select("id,nama_produk,harga,stok").order("nama_produk", { ascending: true });
         if (error) throw error;
         setProducts(data ?? []);
      } catch (err) {
         console.error(err);
         alert("Gagal memuat produk");
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
         alert("Gagal memperbarui stok");
      } finally {
         setLoading(false);
      }
   }

   async function handleAddProduct(e) {
      e.preventDefault();
      if (!newNama) return alert("Isi nama produk");
      setLoading(true);
      try {
         const { error } = await supabase
            .from("produk")
            .insert({ nama_produk: newNama, harga: Number(newHarga), stok: Number(newStok) });
         if (error) throw error;
         setNewNama("");
         setNewHarga(0);
         setNewStok(0);
         await fetchProducts();
      } catch (err) {
         console.error(err);
         alert("Gagal menambahkan produk");
      } finally {
         setLoading(false);
      }
   }

   const filteredProducts = products.filter((product) => {
      if (!searchQuery.trim()) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return (
         product.nama_produk.toLowerCase().includes(lowerQuery) ||
         String(product.harga).includes(lowerQuery) ||
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
                  <label className="produk-form__label" htmlFor="product-price">
                     Harga
                  </label>
                  <input
                     id="product-price"
                     className="produk-form__input"
                     placeholder="Harga"
                     type="number"
                     value={newHarga}
                     onChange={(e) => setNewHarga(e.target.value)}
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
                     placeholder="Cari nama, harga, atau stok"
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
                     <th>Harga</th>
                     <th>Stok</th>
                     <th>Aksi</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredProducts.map((p) => (
                     <tr key={p.id}>
                        <td>{p.nama_produk}</td>
                        <td className="produk-table__numeric">Rp {Number(p.harga).toLocaleString()}</td>
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
                                             alert("Gagal menghapus produk");
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
                        <td colSpan={4} className="produk-table__empty">
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
