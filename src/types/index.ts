export type Role = 'ADMIN' | 'OPERATOR';

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  full_name: string;
  is_active: boolean;
}

export interface PelkaRecommendation {
  kode: 'ANAK' | 'REMAJA' | 'PEMUDA' | 'BAPAK' | 'IBU' | 'LANSIA' | 'BELUM_DITENTUKAN' | 'TIDAK_DAPAT_DITENTUKAN';
  nama_pelka: string;
  usia?: number;
  alasan: string;
  is_applicable: boolean;
}

export interface DistributionItem {
  label: string;
  count: number;
}

export interface BirthdayItem {
  jemaat_id: string;
  nama_lengkap: string;
  tanggal_lahir: string;
  usia_akan_dicapai: number;
  hari_lagi: number;
  pelka: string;
  kelompok: string;
  nomor_telepon?: string;
}

export interface AuditEntry {
  id: string;
  user_id?: string;
  username: string;
  role: string;
  action: string;
  entity: string;
  entity_id?: string;
  old_data?: string;
  new_data?: string;
  summary: string;
  reason?: string;
  ip_or_device?: string;
  timestamp: string;
}

export interface DashboardSummary {
  total_jemaat_aktif: number;
  total_keluarga_aktif: number;
  total_kelompok: number;
  pelka_distribution: DistributionItem[];
  kelompok_distribution: DistributionItem[];
  upcoming_birthdays: BirthdayItem[];
  pending_pelka_reviews: number;
  recent_audits: AuditEntry[];
}

export interface FormOptionItem {
  id: string;
  label: string;
  code?: string;
}

export interface JemaatFormOptions {
  pelka_options: FormOptionItem[];
  kelompok_options: FormOptionItem[];
}

export interface JemaatListItem {
  id: string;
  nomor_anggota: string;
  nik?: string;
  nama_lengkap: string;
  tempat_lahir?: string;
  tanggal_lahir: string;
  jenis_kelamin: 'L' | 'P';
  status_perkawinan: 'BELUM_MENIKAH' | 'MENIKAH' | 'CERAI_HIDUP' | 'CERAI_MATI';
  status_keanggotaan: 'AKTIF' | 'PINDAH' | 'MENINGGAL' | 'NONAKTIF';
  pelka_id?: string;
  nama_pelka?: string;
  kode_pelka?: string;
  kelompok_id?: string;
  nama_kelompok?: string;
  nomor_telepon?: string;
  alamat?: string;
  is_archived: boolean;
  pelka_recommendation: PelkaRecommendation;
}

export interface JemaatBriefItem {
  id: string;
  nomor_anggota: string;
  nama_lengkap: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  nama_pelka?: string;
  nama_kelompok?: string;
}

export interface JemaatKeluargaBrief {
  keluarga_id: string;
  nomor_keluarga: string;
  nama_keluarga: string;
  hubungan_keluarga: string;
}

export interface RiwayatKelompokItem {
  id: string;
  kelompok_asal?: string;
  kelompok_tujuan: string;
  tanggal_perpindahan: string;
  alasan?: string;
  recorded_by_name?: string;
}

export interface RiwayatGerejawiItem {
  id: string;
  jenis_peristiwa: string;
  tanggal_peristiwa: string;
  tempat?: string;
  pelayan_firman?: string;
  nomor_surat?: string;
  keterangan?: string;
}

export interface JemaatDetail extends Omit<JemaatListItem, 'pelka_recommendation'> {
  tanggal_menikah?: string;
  pendidikan_terakhir?: string;
  bidang_ilmu?: string;
  pekerjaan?: string;
  desa_kelurahan?: string;
  kecamatan?: string;
  tanggal_masuk?: string;
  tanggal_meninggal?: string;
  created_at: string;
  updated_at: string;
  pelka_recommendation: PelkaRecommendation;
  keluarga?: JemaatKeluargaBrief;
  riwayat_kelompok: RiwayatKelompokItem[];
  riwayat_gerejawi: RiwayatGerejawiItem[];
}

export interface JemaatFilter {
  search?: string;
  pelka_id?: string;
  kelompok_id?: string;
  status_keanggotaan?: string;
  jenis_kelamin?: string;
  status_perkawinan?: string;
  include_archived?: boolean;
  page?: number;
  page_size?: number;
}

export interface JemaatPaginationResult {
  items: JemaatListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DuplicateCheckResult {
  is_duplicate: boolean;
  duplicate_reason?: string;
  existing_id?: string;
  existing_name?: string;
}

export interface JemaatInput {
  nomor_anggota?: string;
  nik?: string;
  nama_lengkap: string;
  tempat_lahir?: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  status_perkawinan: string;
  tanggal_menikah?: string;
  pendidikan_terakhir?: string;
  bidang_ilmu?: string;
  pekerjaan?: string;
  alamat?: string;
  desa_kelurahan?: string;
  kecamatan?: string;
  nomor_telepon?: string;
  status_keanggotaan?: string;
  tanggal_masuk?: string;
  pelka_id?: string;
  kelompok_id?: string;
}

export interface KeluargaListItem {
  id: string;
  nomor_keluarga: string;
  nama_keluarga: string;
  kepala_keluarga_id?: string;
  kepala_keluarga_nama?: string;
  jumlah_anggota: number;
  status: string;
  alamat?: string;
  tanggal_pembentukan?: string;
}

export interface KeluargaFilter {
  search?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export interface KeluargaPaginationResult {
  items: KeluargaListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AnggotaKeluargaItem {
  id: string;
  keluarga_id: string;
  jemaat_id: string;
  nomor_anggota: string;
  nama_lengkap: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  status_perkawinan: string;
  hubungan_keluarga: string;
  nama_pelka?: string;
  nama_kelompok?: string;
  tanggal_mulai: string;
  tanggal_berakhir?: string;
  catatan?: string;
}

export interface KeluargaDetail {
  id: string;
  nomor_keluarga: string;
  nama_keluarga: string;
  kepala_keluarga_id?: string;
  kepala_keluarga_nama?: string;
  tanggal_pembentukan?: string;
  status: string;
  alamat?: string;
  catatan?: string;
  created_at: string;
  updated_at: string;
  anggota: AnggotaKeluargaItem[];
}

export interface KeluargaInput {
  nomor_keluarga?: string;
  nama_keluarga: string;
  kepala_keluarga_id?: string;
  alamat?: string;
  catatan?: string;
  tanggal_pembentukan?: string;
  status?: string;
}

export interface AddAnggotaInput {
  keluarga_id: string;
  jemaat_id: string;
  hubungan_keluarga: string;
  tanggal_mulai?: string;
  catatan?: string;
}

export interface KelompokListItem {
  id: string;
  nomor_kelompok: string;
  nama_kelompok: string;
  deskripsi?: string;
  is_active: boolean;
  jumlah_jemaat: number;
}

export interface KelompokJemaatItem {
  id: string;
  nomor_anggota: string;
  nama_lengkap: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  status_perkawinan: string;
  status_keanggotaan: string;
  nama_pelka?: string;
  alamat?: string;
  nomor_telepon?: string;
}

export interface KelompokDetail {
  id: string;
  nomor_kelompok: string;
  nama_kelompok: string;
  deskripsi?: string;
  is_active: boolean;
  jemaat_list: KelompokJemaatItem[];
}

export interface MoveKelompokInput {
  jemaat_id: string;
  kelompok_tujuan_id: string;
  tanggal_perpindahan: string;
  alasan?: string;
}

export interface PelkaSummaryItem {
  id: string;
  kode: string;
  nama_pelka: string;
  deskripsi?: string;
  is_active: boolean;
  jumlah_anggota_aktual: number;
  jumlah_rekomendasi: number;
}

export interface PelkaReviewItem {
  jemaat_id: string;
  nomor_anggota: string;
  nama_lengkap: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  usia: number;
  status_perkawinan: string;
  pelka_aktual_id?: string;
  pelka_aktual_nama?: string;
  pelka_aktual_kode?: string;
  rekomendasi_kode: string;
  rekomendasi_nama: string;
  rekomendasi_id?: string;
  alasan_rekomendasi: string;
  nama_kelompok?: string;
}

export interface PelkaMutationInput {
  jemaat_id: string;
  new_pelka_id: string;
  reason: string;
}

export interface JabatanItem {
  id: string;
  nama_jabatan: string;
  jenis: 'FUNGSIONAL' | 'STRUKTURAL';
  deskripsi?: string;
  is_active: boolean;
  jumlah_pejabat_aktif: number;
}

export interface PejabatAktifItem {
  id: string;
  jemaat_id: string;
  nomor_anggota: string;
  nama_lengkap: string;
  jenis_kelamin: string;
  jabatan_id: string;
  nama_jabatan: string;
  jenis_jabatan: string;
  lingkup: string;
  kelompok_id?: string;
  nama_kelompok?: string;
  pelka_id?: string;
  nama_pelka?: string;
  tanggal_pengangkatan: string;
  tanggal_berakhir?: string;
  keterangan?: string;
}

export interface PengangkatanJabatanInput {
  jemaat_id: string;
  jabatan_id: string;
  lingkup: string;
  kelompok_id?: string;
  pelka_id?: string;
  tanggal_pengangkatan: string;
  tanggal_berakhir?: string;
  keterangan?: string;
}

export interface AkhiriJabatanInput {
  riwayat_id: string;
  tanggal_berakhir: string;
  keterangan: string;
}

// Tahap 4: Peristiwa Gerejawi & Atestasi & Kematian
export interface PeristiwaGerejawiItem {
  id: string;
  jemaat_id: string;
  nomor_anggota: string;
  nama_lengkap: string;
  jenis_kelamin: string;
  jenis_peristiwa: 'BAPTIS' | 'SIDI' | 'PERKAWINAN' | 'PENGAKUAN_DOSA' | 'LAINNYA';
  tanggal_peristiwa: string;
  tempat?: string;
  pelayan_firman?: string;
  nomor_surat?: string;
  keterangan?: string;
  created_at: string;
}

export interface CreatePeristiwaInput {
  jemaat_id: string;
  jenis_peristiwa: string;
  tanggal_peristiwa: string;
  tempat?: string;
  pelayan_firman?: string;
  nomor_surat?: string;
  keterangan?: string;
}

export interface CreatePerkawinanInput {
  mempelai_1_id: string;
  mempelai_2_id?: string;
  nama_pasangan_luar?: string;
  tanggal_perkawinan: string;
  tempat?: string;
  pelayan_firman?: string;
  nomor_surat?: string;
  keterangan?: string;
}

export interface AtestasiItem {
  id: string;
  jemaat_id: string;
  nomor_anggota: string;
  nama_lengkap: string;
  jenis_kelamin: string;
  status_sebelumnya: string;
  status_baru: string;
  tanggal_perubahan: string;
  alasan?: string;
  jemaat_tujuan_asal?: string;
  nomor_surat?: string;
  created_at: string;
}

export interface CreateAtestasiKeluarInput {
  jemaat_id: string;
  gereja_tujuan: string;
  tanggal_keluar: string;
  nomor_surat?: string;
  alasan: string;
}

export interface CreateAtestasiMasukInput {
  jemaat_id: string;
  gereja_asal: string;
  tanggal_masuk: string;
  nomor_surat?: string;
  keterangan?: string;
}

export interface KematianItem {
  id: string;
  jemaat_id: string;
  nomor_anggota: string;
  nama_lengkap: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  tanggal_meninggal: string;
  tempat_meninggal?: string;
  tempat_pemakaman?: string;
  pelayan_pemakaman?: string;
  nomor_surat_kematian?: string;
  keterangan?: string;
  created_at: string;
}

export interface CatatKematianInput {
  jemaat_id: string;
  tanggal_meninggal: string;
  tempat_meninggal?: string;
  tempat_pemakaman?: string;
  pelayan_pemakaman?: string;
  nomor_surat_kematian?: string;
  keterangan?: string;
}

// ---------------------------------------------------------
// TAHAP 5: Audit Log, Backup/Restore, Import/Export, Settings
// ---------------------------------------------------------

export interface AuditLogItem {
  id: string;
  user_id?: string;
  username: string;
  role: string;
  action: string;
  entity: string;
  entity_id?: string;
  old_data?: string;
  new_data?: string;
  summary: string;
  reason?: string;
  ip_or_device?: string;
  timestamp: string;
}

export interface AuditLogFilter {
  action?: string;
  entity?: string;
  user_id?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

export interface AuditLogPaginationResult {
  items: AuditLogItem[];
  total_records: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BackupFileInfo {
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  created_at: string;
}

export interface BackupResult {
  backup_path: string;
  file_name: string;
  file_size_bytes: number;
  created_at: string;
}

export interface JemaatExportRow {
  nomor_anggota: string;
  nik?: string;
  nama_lengkap: string;
  tempat_lahir?: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  status_perkawinan: string;
  tanggal_menikah?: string;
  alamat?: string;
  desa_kelurahan?: string;
  kecamatan?: string;
  nomor_telepon?: string;
  status_keanggotaan: string;
  nama_pelka?: string;
  nama_kelompok?: string;
}

export interface KeluargaExportRow {
  nomor_keluarga: string;
  nama_keluarga: string;
  kepala_keluarga?: string;
  alamat?: string;
  jumlah_anggota: number;
  status: string;
}

export interface JemaatImportRow {
  nik?: string;
  nama_lengkap: string;
  tempat_lahir?: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  status_perkawinan: string;
  alamat?: string;
  nomor_telepon?: string;
  nomor_kelompok?: string;
}

export interface ImportSummary {
  total_submitted: number;
  total_inserted: number;
  failed_records: string[];
}

export interface DataSummaryResult {
  total_jemaat: number;
  total_keluarga: number;
  total_peristiwa: number;
  total_pejabat: number;
  dummy_status: string;
}


