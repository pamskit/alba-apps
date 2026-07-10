"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { createClient } from "@/utils/supabase";
import Loading from "@/components/Loading";
import "./user.css";

const supabase = createClient();

export default function UserPage() {
   const [selectedType, setSelectedType] = useState("siswa");
   const [students, setStudents] = useState([]);
   const [teachers, setTeachers] = useState([]);
   const [loading, setLoading] = useState(false);

   const [id, setId] = useState("");
   const [name, setName] = useState("");
   const [kelasBidang, setKelasBidang] = useState("");
   const [password, setPassword] = useState("");
   const [editingId, setEditingId] = useState(null);
   const [editName, setEditName] = useState("");
   const [editKelasBidang, setEditKelasBidang] = useState("");
   const [editPassword, setEditPassword] = useState("");

   const isSiswa = selectedType === "siswa";
   const currentList = isSiswa ? students : teachers;
   const currentLabel = isSiswa ? "Siswa" : "Guru";
   const currentIdLabel = isSiswa ? "NIS" : "NIP";
   const currentNameLabel = isSiswa ? "Nama Siswa" : "Nama Guru";
   const currentRoleLabel = isSiswa ? "Kelas" : "Bidang Studi";

   const totalHutangSiswa = students.reduce((sum, student) => sum + Number(student.total_hutang || 0), 0);
   const totalHutangGuru = teachers.reduce((sum, teacher) => sum + Number(teacher.total_hutang || 0), 0);

   useEffect(() => {
      fetchData();
   }, []);

   useEffect(() => {
      cancelEdit();
      resetForm();
   }, [selectedType]);

   function resetForm() {
      setId("");
      setName("");
      setKelasBidang("");
      setPassword("");
   }

   async function fetchData() {
      setLoading(true);
      try {
         const [studentRes, teacherRes] = await Promise.all([
            supabase.from("siswa").select("nis,nama_siswa,kelas,total_hutang").order("nis", { ascending: true }),
            supabase.from("guru").select("nip,nama_guru,bidang_studi,total_hutang").order("nip", { ascending: true }),
         ]);
         if (studentRes.error) throw studentRes.error;
         if (teacherRes.error) throw teacherRes.error;
         setStudents(studentRes.data ?? []);
         setTeachers(teacherRes.data ?? []);
      } catch (err) {
         console.error(err);
         toast.error("Gagal memuat data user");
      } finally {
         setLoading(false);
      }
   }

   async function handleAdd(e) {
      e.preventDefault();
      if (!id || !name) return toast.error(`Isi ${currentIdLabel} dan ${currentNameLabel}`);
      setLoading(true);
      try {
         const payload = isSiswa
            ? {
               nis: Number(id),
               nama_siswa: name,
               kelas: kelasBidang || null,
               password: password || "",
               total_hutang: 0,
            }
            : {
               nip: Number(id),
               nama_guru: name,
               bidang_studi: kelasBidang || null,
               password: password || "",
               total_hutang: 0,
            };

         const { error } = await supabase.from(isSiswa ? "siswa" : "guru").insert(payload);
         if (error) throw error;
         resetForm();
         await fetchData();
      } catch (err) {
         console.error(err);
         toast.error(`Gagal menambahkan ${currentLabel.toLowerCase()}`);
      } finally {
         setLoading(false);
      }
   }

   async function handleDelete(itemId) {
      if (!confirm(`Hapus ${currentLabel.toLowerCase()} dengan ${currentIdLabel} ${itemId}?`)) return;
      setLoading(true);
      try {
         const { error } = await supabase.from(isSiswa ? "siswa" : "guru").delete().eq(isSiswa ? "nis" : "nip", itemId);
         if (error) throw error;
         await fetchData();
      } catch (err) {
         console.error(err);
         toast.error(`Gagal menghapus ${currentLabel.toLowerCase()}`);
      } finally {
         setLoading(false);
      }
   }

   function startEdit(item) {
      setEditingId(item[isSiswa ? "nis" : "nip"]);
      setEditName(item[isSiswa ? "nama_siswa" : "nama_guru"] || "");
      setEditKelasBidang(item[isSiswa ? "kelas" : "bidang_studi"] || "");
      setEditPassword("");
   }

   function cancelEdit() {
      setEditingId(null);
      setEditName("");
      setEditKelasBidang("");
      setEditPassword("");
   }

   async function saveEdit(itemId) {
      setLoading(true);
      try {
         const payload = isSiswa
            ? { nama_siswa: editName, kelas: editKelasBidang }
            : { nama_guru: editName, bidang_studi: editKelasBidang };
         if (editPassword) payload.password = editPassword;

         const { error } = await supabase.from(isSiswa ? "siswa" : "guru").update(payload).eq(isSiswa ? "nis" : "nip", itemId);
         if (error) throw error;
         cancelEdit();
         await fetchData();
      } catch (err) {
         console.error(err);
         toast.error(`Gagal memperbarui ${currentLabel.toLowerCase()}`);
      } finally {
         setLoading(false);
      }
   }

   return (
      <div className="user-page">
         <div className="user-page__header">
            <div>
               <h1>Manajemen User</h1>
               <p className="user-page__subtitle">Kelola siswa dan guru dalam satu halaman. Tambah, edit, dan hapus data secara langsung.</p>
            </div>
            <div className="user-toggle" role="tablist" aria-label="Pilih tipe user">
               <button
                  type="button"
                  role="tab"
                  aria-selected={isSiswa}
                  className={`user-toggle__button ${isSiswa ? "user-toggle__button--active" : ""}`}
                  onClick={() => setSelectedType("siswa")}
               >
                  Siswa
               </button>
               <button
                  type="button"
                  role="tab"
                  aria-selected={!isSiswa}
                  className={`user-toggle__button ${!isSiswa ? "user-toggle__button--active" : ""}`}
                  onClick={() => setSelectedType("guru")}
               >
                  Guru
               </button>
            </div>
         </div>

         <div className="user-summary">
            <div className="user-summary__card">
               <span className="user-summary__label">Total Siswa</span>
               <strong className="user-summary__value">{students.length}</strong>
            </div>
            <div className="user-summary__card">
               <span className="user-summary__label">Total Guru</span>
               <strong className="user-summary__value">{teachers.length}</strong>
            </div>
            <div className="user-summary__card">
               <span className="user-summary__label">Hutang Siswa</span>
               <strong className="user-summary__value">Rp {totalHutangSiswa.toLocaleString()}</strong>
            </div>
            <div className="user-summary__card">
               <span className="user-summary__label">Hutang Guru</span>
               <strong className="user-summary__value">Rp {totalHutangGuru.toLocaleString()}</strong>
            </div>
         </div>

         <section className="user-page__panel">
            <form className="user-form" onSubmit={handleAdd}>
               <div className="user-form__group">
                  <label className="user-form__label" htmlFor="id">{currentIdLabel}</label>
                  <input id="id" className="user-form__input" placeholder={currentIdLabel} value={id} onChange={(e) => setId(e.target.value)} />
               </div>
               <div className="user-form__group">
                  <label className="user-form__label" htmlFor="name">{currentNameLabel}</label>
                  <input id="name" className="user-form__input" placeholder={currentNameLabel} value={name} onChange={(e) => setName(e.target.value)} />
               </div>
               <div className="user-form__group">
                  <label className="user-form__label" htmlFor="role">{currentRoleLabel}</label>
                  <input id="role" className="user-form__input" placeholder={currentRoleLabel} value={kelasBidang} onChange={(e) => setKelasBidang(e.target.value)} />
               </div>
               <div className="user-form__group">
                  <label className="user-form__label" htmlFor="password">Password</label>
                  <input id="password" className="user-form__input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
               </div>
               <button className="btn btn--primary user-form__button" type="submit" disabled={loading}>
                  Tambah {currentLabel}
               </button>
            </form>
         </section>

         <section className="user-page__panel user-page__table-panel">
            {loading && <Loading message={`Memuat ${currentLabel.toLowerCase()}...`} size="small" />}

            <div className="user-table-wrap">
               <table className="user-table">
                  <thead>
                     <tr>
                        <th>{currentIdLabel}</th>
                        <th>{currentNameLabel}</th>
                        <th>{currentRoleLabel}</th>
                        <th>Total Hutang</th>
                        <th>Aksi</th>
                     </tr>
                  </thead>
                  <tbody>
                     {currentList.map((item) => {
                        const itemId = item[isSiswa ? "nis" : "nip"];
                        const itemName = item[isSiswa ? "nama_siswa" : "nama_guru"];
                        const itemRole = item[isSiswa ? "kelas" : "bidang_studi"];
                        const rowKey = `${selectedType}-${itemId}`;
                        const isEditing = editingId === itemId;
                        return (
                           <tr key={rowKey}>
                              <td>{itemId}</td>
                              <td>
                                 {isEditing ? (
                                    <input className="user-table__input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                                 ) : (
                                    itemName
                                 )}
                              </td>
                              <td>
                                 {isEditing ? (
                                    <input className="user-table__input" value={editKelasBidang} onChange={(e) => setEditKelasBidang(e.target.value)} />
                                 ) : (
                                    itemRole || "-"
                                 )}
                              </td>
                              <td className="user-table__numeric">Rp {Number(item.total_hutang || 0).toLocaleString()}</td>
                              <td>
                                 <div className="user-actions">
                                    {isEditing ? (
                                       <>
                                          <input
                                             className="user-table__input"
                                             placeholder="Password baru"
                                             value={editPassword}
                                             onChange={(e) => setEditPassword(e.target.value)}
                                          />
                                          <button className="btn btn--primary user-actions__button" onClick={() => saveEdit(itemId)} disabled={loading}>
                                             Simpan
                                          </button>
                                          <button className="btn user-actions__button" onClick={cancelEdit}>
                                             Batal
                                          </button>
                                       </>
                                    ) : (
                                       <>
                                          <button className="btn user-actions__button" onClick={() => startEdit(item)}>
                                             Edit
                                          </button>
                                          <button className="btn user-actions__button btn--danger" onClick={() => handleDelete(itemId)}>
                                             Hapus
                                          </button>
                                       </>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        );
                     })}
                     {currentList.length === 0 && !loading && (
                        <tr>
                           <td colSpan={5} className="user-table__empty">
                              Tidak ada {currentLabel.toLowerCase()}.
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </section>
      </div>
   );
}
