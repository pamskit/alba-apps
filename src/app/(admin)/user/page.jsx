"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { createClient } from "@/utils/supabase";
import Loading from "@/components/Loading";
import "./user.css";

const supabase = createClient();

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

export default function UserPage() {
   const [selectedType, setSelectedType] = useState("siswa");
   const [students, setStudents] = useState([]);
   const [teachers, setTeachers] = useState([]);
   const [loading, setLoading] = useState(false);
   const [isAddModalOpen, setIsAddModalOpen] = useState(false);

   const [id, setId] = useState("");
   const [name, setName] = useState("");
   const [kelasBidang, setKelasBidang] = useState("");
   const [editingId, setEditingId] = useState(null);
   const [editName, setEditName] = useState("");
   const [editKelasBidang, setEditKelasBidang] = useState("");

   const isSiswa = selectedType === "siswa";
   const currentList = isSiswa ? students : teachers;
   const currentLabel = isSiswa ? "Siswa" : "Guru";
   const currentIdLabel = isSiswa ? "NIS" : "NIK";
   const currentNameLabel = "Nama";
   const currentRoleLabel = isSiswa ? "Kelas" : "Bidang Studi";
   const defaultPassword = isSiswa ? "siswa123" : "guru123";

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
   }

   function openAddModal() {
      resetForm();
      setIsAddModalOpen(true);
   }

   function closeAddModal() {
      setIsAddModalOpen(false);
      resetForm();
   }

   async function fetchData() {
      setLoading(true);
      try {
         const [studentRes, teacherRes] = await Promise.all([
            supabase.from("siswa").select("nis,nama_siswa,kelas,total_hutang,saldo").order("nis", { ascending: true }),
            supabase.from("guru").select("nip,nama_guru,bidang_studi,total_hutang,saldo").order("nip", { ascending: true }),
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
      if (!id || !name || !kelasBidang) return toast.error(`Isi ${currentIdLabel}, Nama, dan ${currentRoleLabel}`);
      if (!/^\d+$/.test(String(id))) return toast.error(`${currentIdLabel} harus berupa angka`);
      setLoading(true);
      try {
         const payload = isSiswa
            ? {
               nis: Number(id),
               nama_siswa: name.trim(),
               kelas: kelasBidang.trim(),
               password: "siswa123",
               total_hutang: 0,
               saldo: 0,
            }
            : {
               nip: Number(id),
               nama_guru: name.trim(),
               bidang_studi: kelasBidang.trim(),
               password: "guru123",
               total_hutang: 0,
               saldo: 0,
            };

         const { error } = await supabase.from(isSiswa ? "siswa" : "guru").insert(payload);
         if (error) throw error;
         resetForm();
         setIsAddModalOpen(false);
         toast.success(`${currentLabel} berhasil ditambahkan`);
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
         toast.success(`${currentLabel} berhasil dihapus`);
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
   }

   function cancelEdit() {
      setEditingId(null);
      setEditName("");
      setEditKelasBidang("");
   }

   async function saveEdit(itemId) {
      if (!editName.trim() || !editKelasBidang.trim()) {
         toast.error("Nama dan data peran wajib diisi");
         return;
      }
      setLoading(true);
      try {
         const payload = isSiswa
            ? { nama_siswa: editName.trim(), kelas: editKelasBidang.trim() }
            : { nama_guru: editName.trim(), bidang_studi: editKelasBidang.trim() };

         const { error } = await supabase.from(isSiswa ? "siswa" : "guru").update(payload).eq(isSiswa ? "nis" : "nip", itemId);
         if (error) throw error;
         cancelEdit();
         toast.success(`${currentLabel} berhasil diperbarui`);
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
            <div className="user-panel-head">
               <div className="user-panel-head__meta">
                  <h2>Data {currentLabel}</h2>
                  <p>Kelola data {currentLabel.toLowerCase()} aktif dan lakukan pembaruan dengan cepat.</p>
               </div>
               <button className="btn btn--primary user-form__button" type="button" onClick={openAddModal}>
                  Tambah {currentLabel}
               </button>
            </div>
         </section>

         <section className="user-page__panel user-page__table-panel">
            {loading && <Loading message={`Memuat ${currentLabel.toLowerCase()}...`} size="small" />}

            <div className="user-table-head">
               <h3>Daftar {currentLabel}</h3>
               <p>Menampilkan {currentList.length} data</p>
            </div>

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
                              <td className="user-table__actions-cell">
                                 <div className={`user-actions ${isEditing ? "user-actions--editing" : ""}`}>
                                    {isEditing ? (
                                       <>
                                          <button
                                             className="btn btn--primary user-actions__button user-actions__button--save"
                                             type="button"
                                             onClick={() => saveEdit(itemId)}
                                             disabled={loading}
                                             aria-label="Simpan"
                                             title="Simpan"
                                          >
                                             <SaveIcon />
                                          </button>
                                          <button
                                             className="btn user-actions__button user-actions__button--cancel"
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
                                             className="btn user-actions__button"
                                             type="button"
                                             onClick={() => startEdit(item)}
                                             aria-label="Edit"
                                             title="Edit"
                                          >
                                             <EditIcon />
                                          </button>
                                          <button
                                             className="btn user-actions__button btn--danger"
                                             type="button"
                                             onClick={() => handleDelete(itemId)}
                                             aria-label="Hapus"
                                             title="Hapus"
                                          >
                                             <DeleteIcon />
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

         {isAddModalOpen && (
            <div className="user-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title" onClick={closeAddModal}>
               <div className="user-modal__card" onClick={(e) => e.stopPropagation()}>
                  <div className="user-modal__header">
                     <h2 id="user-modal-title">Tambah {currentLabel}</h2>
                     <button type="button" className="btn user-modal__close" onClick={closeAddModal}>
                        Tutup
                     </button>
                  </div>

                  <form className="user-form" onSubmit={handleAdd}>
                     <div className="user-form__group">
                        <label className="user-form__label" htmlFor="user-id">{currentIdLabel}</label>
                        <input id="user-id" className="user-form__input" placeholder={currentIdLabel} value={id} onChange={(e) => setId(e.target.value)} />
                     </div>
                     <div className="user-form__group">
                        <label className="user-form__label" htmlFor="user-name">Nama</label>
                        <input id="user-name" className="user-form__input" placeholder={`Nama ${currentLabel}`} value={name} onChange={(e) => setName(e.target.value)} />
                     </div>
                     <div className="user-form__group">
                        <label className="user-form__label" htmlFor="user-role-field">{currentRoleLabel}</label>
                        <input
                           id="user-role-field"
                           className="user-form__input"
                           placeholder={currentRoleLabel}
                           value={kelasBidang}
                           onChange={(e) => setKelasBidang(e.target.value)}
                        />
                     </div>
                     <div className="user-form__group">
                        <label className="user-form__label" htmlFor="user-password">Password Default</label>
                        <input id="user-password" className="user-form__input user-form__input--readonly" value={defaultPassword} readOnly />
                     </div>
                     <div className="user-form__group">
                        <label className="user-form__label" htmlFor="user-hutang">Total Hutang</label>
                        <input id="user-hutang" className="user-form__input user-form__input--readonly" value="0" readOnly />
                     </div>
                     <div className="user-form__group">
                        <label className="user-form__label" htmlFor="user-saldo">Saldo</label>
                        <input id="user-saldo" className="user-form__input user-form__input--readonly" value="0" readOnly />
                     </div>

                     <div className="user-modal__footer">
                        <button className="btn" type="button" onClick={closeAddModal} disabled={loading}>
                           Batal
                        </button>
                        <button className="btn btn--primary user-form__button" type="submit" disabled={loading}>
                           {loading ? "Menyimpan..." : `Tambah ${currentLabel}`}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
}
