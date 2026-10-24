"use client";

import React, { useState, useEffect, useCallback } from "react";
import { invokeCommand } from "@/lib/tauri";
import { useAuth, getAuthToken } from "@/lib/auth-context";
import {
  KeluargaListItem,
  KeluargaDetail,
  KeluargaPaginationResult,
  KeluargaFilter,
} from "@/types";
import { KeluargaFormDialog } from "./KeluargaFormDialog";
import { KeluargaDetailModal } from "./KeluargaDetailModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Plus,
  Search,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  MapPin,
} from "lucide-react";

export function KeluargaListView() {
  const { user, token: ctxToken } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const token = ctxToken || getAuthToken();

  const [data, setData] = useState<KeluargaPaginationResult>({
    items: [],
    total: 0,
    page: 1,
    page_size: 15,
    total_pages: 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("AKTIF");
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editDetail, setEditDetail] = useState<KeluargaDetail | null>(null);
  const [viewDetail, setViewDetail] = useState<KeluargaDetail | null>(null);

  const fetchKeluarga = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const filter: KeluargaFilter = {
        search: search.trim() || undefined,
        status: selectedStatus || undefined,
        page,
        page_size: 15,
      };
      const res = await invokeCommand<KeluargaPaginationResult>("list_keluarga", {
        token,
        filter,
      });
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedStatus, page, token]);

  useEffect(() => {
    fetchKeluarga();
  }, [fetchKeluarga]);

  const handleOpenDetail = async (id: string) => {
    try {
      const detail = await invokeCommand<KeluargaDetail>("get_keluarga_detail", { token, id });
      setViewDetail(detail);
    } catch (err: any) {
      alert(`Gagal mengambil detail keluarga: ${err.message || err}`);
    }
  };

  const handleOpenEdit = async (id: string) => {
    try {
      const detail = await invokeCommand<KeluargaDetail>("get_keluarga_detail", { token, id });
      setEditDetail(detail);
      setIsFormOpen(true);
    } catch (err: any) {
      alert(`Gagal mengambil data untuk diubah: ${err.message || err}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            <Home className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Kartu Keluarga Jemaat
            </h1>
            <p className="text-xs text-muted-foreground">
              Kelola data keluarga, kepala keluarga, dan susunan anggota rumah tangga
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditDetail(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Kartu Keluarga Baru</span>
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari Nama Keluarga, No. KK, atau Nama Kepala Keluarga..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 text-xs"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">Semua Status</option>
            <option value="AKTIF">Aktif</option>
            <option value="PINDAH">Pindah Domisili</option>
            <option value="NONAKTIF">Non-Aktif</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">No. Kartu Keluarga</th>
                <th className="py-3 px-4">Nama Keluarga</th>
                <th className="py-3 px-4">Kepala Keluarga</th>
                <th className="py-3 px-4">Anggota</th>
                <th className="py-3 px-4">Alamat Rumah</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Memuat data keluarga...</span>
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Home className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">Tidak ada kartu keluarga yang ditemukan.</p>
                  </td>
                </tr>
              ) : (
                data.items.map((k) => (
                  <tr
                    key={k.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => handleOpenDetail(k.id)}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {k.nomor_keluarga}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground group-hover:text-blue-600 transition-colors">
                        {k.nama_keluarga}
                      </div>
                      {k.tanggal_pembentukan && (
                        <div className="text-[10px] text-muted-foreground">
                          Dibentuk: {k.tanggal_pembentukan}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-medium text-foreground">
                      {k.kepala_keluarga_nama || (
                        <span className="text-muted-foreground italic">Belum Ada</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <Users className="h-3.5 w-3.5 text-blue-500" />
                        {k.jumlah_anggota} jiwa
                      </span>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground">
                      {k.alamat || <span className="italic">-</span>}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant={k.status === "AKTIF" ? "default" : "secondary"}>
                        {k.status}
                      </Badge>
                    </td>

                    <td
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Lihat Susunan Keluarga"
                          onClick={() => handleOpenDetail(k.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-600"
                            title="Ubah Data Keluarga"
                            onClick={() => handleOpenEdit(k.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20 text-xs">
          <span className="text-muted-foreground">
            Halaman <strong>{data.page}</strong> dari <strong>{data.total_pages}</strong> ({data.total} total)
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.total_pages || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 text-xs"
            >
              Selanjutnya
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Form Dialog */}
      <KeluargaFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditDetail(null);
        }}
        onSuccess={fetchKeluarga}
        token={token}
        editData={editDetail}
      />

      {/* Detail Modal */}
      <KeluargaDetailModal
        isOpen={Boolean(viewDetail)}
        onClose={() => setViewDetail(null)}
        keluarga={viewDetail}
        onRefresh={handleOpenDetail}
        token={token}
        isAdmin={isAdmin}
      />
    </div>
  );
}
