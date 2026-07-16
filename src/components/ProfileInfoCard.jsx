export default function ProfileInfoCard({ title, fields, loading, emptyMessage }) {
   return (
      <section className="profile-card">
         <h2>{title}</h2>
         {loading ? (
            <div className="profile-card__empty">Memuat data...</div>
         ) : !fields || fields.length === 0 ? (
            <div className="profile-card__empty">{emptyMessage}</div>
         ) : (
            <div className="profile-info">
               {fields.map((field) => (
                  <div className="profile-info__row" key={field.label}>
                     <span className="profile-info__label">{field.label}</span>
                     <span className="profile-info__value">{field.value}</span>
                  </div>
               ))}
            </div>
         )}
      </section>
   );
}
