"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import Loading from "@/components/Loading";
import "./siswa.css";

const supabase = createClient();

export default function SiswaPage() {
   const [students, setStudents] = useState([]);
   const [loading, setLoading] = useState(false);

   const [nis, setNis] = useState("");
   const [nama, setNama] = useState("");
   const [kelas, setKelas] = useState("");
   const [password, setPassword] = useState("");
   const [editingNis, setEditingNis] = useState(null);
   const [editNama, setEditNama] = useState("");
   const [editKelas, setEditKelas] = useState("");
   const [editPassword, setEditPassword] = useState("");

   useEffect(() => {
      fetchStudents();
   }, []);

   async function fetchStudents() {
      setLoading(true);
      try {
         const { data, error } = await supabase.from("siswa").select("nis,nama_siswa,kelas,total_hutang").order("nis", { ascending: true });
         if (error) throw error;
         setStudents(data ?? []);
      } catch (err) {
         console.error(err);
         alert("Gagal memuat data siswa");
      } finally {
         setLoading(false);
      }
   }

   async function handleAdd(e) {
      e.preventDefault();
      if (!nis || !nama) return alert("Isi NIS dan nama siswa");
      setLoading(true);
      try {
         const payload = {
            nis: Number(nis),
            nama_siswa: nama,
            kelas: kelas || null,
            password: password || "",
            total_hutang: 0,
         };
         const { error } = await supabase.from("siswa").insert(payload);
         if (error) throw error;
         setNis("");
         setNama("");
         setKelas("");
         setPassword("");
         await fetchStudents();
      } catch (err) {
         console.error(err);
         alert("Gagal menambahkan siswa");
      } finally {
         setLoading(false);
      }
   }

   async function handleDelete(nisVal) {
      if (!confirm(`Hapus siswa dengan NIS ${nisVal}?`)) return;
      setLoading(true);
      try {
         const { error } = await supabase.from("siswa").delete().eq("nis", nisVal);
         if (error) throw error;
         await fetchStudents();
      } catch (err) {
         console.error(err);
         alert("Gagal menghapus siswa");
      } finally {
         setLoading(false);
      }
   }

   function startEdit(s) {
      setEditingNis(s.nis);
      setEditNama(s.nama_siswa || "");
      setEditKelas(s.kelas || "");
      setEditPassword("");
   }

   function cancelEdit() {
      setEditingNis(null);
      setEditNama("");
      setEditKelas("");
      setEditPassword("");
   }

   async function saveEdit(nisVal) {
      setLoading(true);
      try {
         const payload = { nama_siswa: editNama, kelas: editKelas };
         if (editPassword) payload.password = editPassword;
         const { error } = await supabase.from("siswa").update(payload).eq("nis", nisVal);
         if (error) throw error;
         cancelEdit();
         await fetchStudents();
      } catch (err) {
         console.error(err);
         alert("Gagal memperbarui data siswa");
      } finally {
         setLoading(false);
      }
   }

   return (
      <div className="siswa-page">
         <div className="siswa-page__header">
            <div>
               <h1>Daftar Siswa</h1>
               <p className="siswa-page__subtitle">Menampilkan semua siswa. Tambah siswa baru dan kelola data langsung dari tabel.</p>
            </div>
         </div>

         <section className="siswa-page__panel">
            <form className="siswa-form" onSubmit={handleAdd}>
               <div className="siswa-form__group">
                  <label className="siswa-form__label" htmlFor="nis">NIS</label>
                  <input id="nis" className="siswa-form__input" placeholder="NIS" value={nis} onChange={(e) => setNis(e.target.value)} />
               </div>
               <div className="siswa-form__group">
                  <label className="siswa-form__label" htmlFor="nama">Nama Siswa</label>
                  <input id="nama" className="siswa-form__input" placeholder="Nama siswa" value={nama} onChange={(e) => setNama(e.target.value)} />
               </div>
               <div className="siswa-form__group">
                  <label className="siswa-form__label" htmlFor="kelas">Kelas</label>
                  <input id="kelas" className="siswa-form__input" placeholder="Kelas" value={kelas} onChange={(e) => setKelas(e.target.value)} />
               </div>
               <div className="siswa-form__group">
                  <label className="siswa-form__label" htmlFor="password">Password</label>
                  <input id="password" className="siswa-form__input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
               </div>
               <button className="btn btn--primary siswa-form__button" type="submit" disabled={loading}>
                  Tambah Siswa
               </button>
            </form>
         </section>

         <section className="siswa-page__panel siswa-page__table-panel">
            {loading && <Loading message="Memuat siswa..." size="small" />}

            <table className="siswa-table">
               <thead>
                  <tr>
                     <th>NIS</th>
                     <th>Nama</th>
                     <th>Kelas</th>
                     <th>Total Hutang</th>
                     <th>Aksi</th>
                  </tr>
               </thead>
               <tbody>
                  {students.map((s) => (
                     <tr key={s.nis}>
                        <td>{s.nis}</td>
                        <td>
                           {editingNis === s.nis ? (
                              <input className="siswa-table__input" value={editNama} onChange={(e) => setEditNama(e.target.value)} />
                           ) : (
                              s.nama_siswa
                           )}
                        </td>
                        <td>
                           {editingNis === s.nis ? (
                              <input className="siswa-table__input" value={editKelas} onChange={(e) => setEditKelas(e.target.value)} />
                           ) : (
                              s.kelas
                           )}
                        </td>
                        <td className="siswa-table__numeric">Rp {Number(s.total_hutang || 0).toLocaleString()}</td>
                        <td>
                           <div className="siswa-actions">
                              {editingNis === s.nis ? (
                                 <>
                                    <input
                                       className="siswa-table__input"
                                       placeholder="Password baru"
                                       value={editPassword}
                                       onChange={(e) => setEditPassword(e.target.value)}
                                    />
                                    <button className="btn btn--primary siswa-actions__button" onClick={() => saveEdit(s.nis)} disabled={loading}>
                                       Simpan
                                    </button>
                                    <button className="btn siswa-actions__button" onClick={cancelEdit}>
                                       Batal
                                    </button>
                                 </>
                              ) : (
                                 <>
                                    <button className="btn siswa-actions__button" onClick={() => startEdit(s)}>
                                       Edit
                                    </button>
                                    <button className="btn siswa-actions__button btn--danger" onClick={() => handleDelete(s.nis)}>
                                       Hapus
                                    </button>
                                 </>
                              )}
                           </div>
                        </td>
                     </tr>
                  ))}
                  {students.length === 0 && !loading && (
                     <tr>
                        <td colSpan={5} className="siswa-table__empty">
                           Tidak ada siswa.
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </section>
      </div>
   );
}
