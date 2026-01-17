"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Hospital,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Eye,
  Pencil,
  Trash,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";

/* ================== TYPES ================== */
interface PuskesmasData {
  id: string;
  nama: string;
  email: string;
  phone: string;
  alamat: string;
  kecamatan: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  is_active: boolean;
}

interface PuskesmasStats {
  total: number;
  active_account: number;
  inactive_account: number;
}

/* ================= MAP PICKER ================= */
function LocationPicker({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function DataPuskesmasPage() {
  const [list, setList] = useState<PuskesmasData[]>([]);
  const [filtered, setFiltered] = useState<PuskesmasData[]>([]);
  const [stats, setStats] = useState<PuskesmasStats>({
    total: 0,
    active_account: 0,
    inactive_account: 0,
  });

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modal, setModal] = useState<null | "detail" | "add" | "edit">(null);
  const [selected, setSelected] = useState<PuskesmasData | null>(null);

  const [form, setForm] = useState<any>({
    nama: "",
    email: "",
    phone: "",
    alamat: "",
    kecamatan: "",
    is_active: true,
  });

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  /* ================= FETCH ================= */
  const fetchData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("puskesmas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: PuskesmasData[] =
        data?.map((p: any) => ({
          ...p,
          is_active: p.is_active ?? true,
        })) || [];

      setList(mapped);
      calculateStats(mapped);
    } catch {
      toast.error("Gagal memuat data puskesmas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= FILTER ================= */
  useEffect(() => {
    let temp = [...list];

    if (search) {
      temp = temp.filter(
        (p) =>
          p.nama.toLowerCase().includes(search.toLowerCase()) ||
          p.email.toLowerCase().includes(search.toLowerCase()) ||
          p.kecamatan.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFiltered(temp);
  }, [list, search]);

  /* ================= STATS ================= */
  const calculateStats = (data: PuskesmasData[]) => {
    const total = data.length;
    const active_account = data.filter((p) => p.is_active).length;
    const inactive_account = total - active_account;
    
    setStats({ total, active_account, inactive_account });
  };

  /* ================= CRUD ================= */
  const resetForm = () => {
    setForm({
      nama: "",
      email: "",
      phone: "",
      alamat: "",
      kecamatan: "",
      is_active: true,
    });
    setLat(null);
    setLng(null);
    setSelected(null);
  };

  const handleSubmit = async () => {
    if (!form.nama || !form.email || !form.kecamatan) {
      toast.error("Lengkapi data wajib");
      return;
    }

    const payload = {
      ...form,
      latitude: lat,
      longitude: lng,
      role: "puskesmas",
    };

    try {
      if (modal === "add") {
        await supabase.from("puskesmas").insert(payload);
        toast.success("Puskesmas ditambahkan");
      }

      if (modal === "edit" && selected) {
        await supabase.from("puskesmas").update(payload).eq("id", selected.id);
        toast.success("Data puskesmas diperbarui");
      }

      setModal(null);
      resetForm();
      fetchData();
    } catch {
      toast.error("Gagal menyimpan data");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus puskesmas ini?")) return;
    await supabase.from("puskesmas").delete().eq("id", id);
    toast.success("Puskesmas dihapus");
    fetchData();
  };

  const handleToggleActivation = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("puskesmas")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(
        currentStatus
          ? "Akun puskesmas dinonaktifkan"
          : "Akun puskesmas diaktifkan"
      );
      
      fetchData();
    } catch {
      toast.error("Gagal mengubah status akun");
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-30"></div>
          <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
        </div>
        <h2 className="text-xl font-bold text-blue-700">Air Bersih</h2>
        <p className="text-sm text-gray-600">Memuat data puskesmas...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Hospital className="w-8 h-8 text-blue-600" />
          Data Puskesmas
        </h1>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchData();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          <button
            onClick={() => {
              resetForm();
              setModal("add");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-blue-500 to-cyan-400 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Puskesmas</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-green-600">
            {stats.active_account}
          </div>
          <div className="text-sm text-gray-600">Akun Aktif</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-red-600">
            {stats.inactive_account}
          </div>
          <div className="text-sm text-gray-600">Akun Nonaktif</div>
        </div>
      </div>

      {/* ================= FILTER ================= */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              placeholder="Cari nama, email, kecamatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ================= TABLE ================= */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold">
                  Puskesmas
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold">
                  Kontak
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold">
                  Lokasi
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold">
                  Status
                </th>
                <th className="py-3 px-4 text-left text-sm font-semibold">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    Tidak ada data puskesmas
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{p.nama}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.created_at).toLocaleDateString("id-ID")}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {p.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {p.phone}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-sm">
                      <MapPin className="inline w-4 h-4 text-gray-400" />{" "}
                      {p.kecamatan}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActivation(p.id, p.is_active)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          p.is_active
                            ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
                            : "bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
                        }`}
                      >
                        {p.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>

                    <td className="py-3 px-4 flex gap-2">
                      <button
                        onClick={() => {
                          setSelected(p);
                          setModal("detail");
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelected(p);
                          setForm(p);
                          setLat(p.latitude);
                          setLng(p.longitude);
                          setModal("edit");
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= INFO BOX ================= */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex gap-4">
          <AlertCircle className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold mb-2">Informasi Data Puskesmas</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Status akun mengontrol akses login puskesmas</li>
              <li>• Klik tombol status akun untuk mengaktifkan/nonaktifkan</li>
              <li>• Data hanya dapat dikelola oleh admin</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ================= MODAL (DETAIL / ADD / EDIT) ================= */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl">
            <button onClick={() => setModal(null)} className="float-right">
              <X />
            </button>

            <h2 className="text-lg font-bold mb-4">
              {modal === "detail"
                ? "Detail Puskesmas"
                : modal === "add"
                ? "Tambah Puskesmas"
                : "Edit Puskesmas"}
            </h2>

            {modal !== "detail" &&
              ["nama", "email", "phone", "alamat", "kecamatan"].map((f) => (
                <input
                  key={f}
                  className="border p-2 w-full mb-2 rounded"
                  placeholder={f}
                  value={form[f] || ""}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                />
              ))}

            {modal !== "detail" && modal !== "add" && (
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm">
                  Akun Aktif
                </label>
              </div>
            )}

            <MapContainer
              center={[lat || -6.2, lng || 106.8]}
              zoom={13}
              className="h-64 rounded-lg"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {modal !== "detail" && (
                <LocationPicker
                  onPick={(a, b) => {
                    setLat(a);
                    setLng(b);
                  }}
                />
              )}
              {lat && lng && <Marker position={[lat, lng]} />}
            </MapContainer>

            {modal === "detail" && selected && (
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">Status Akun:</div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selected.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selected.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
              </div>
            )}

            {modal !== "detail" && (
              <button
                onClick={handleSubmit}
                className="mt-4 px-4 py-2 bg-gradient-to-br from-blue-500 to-cyan-400 text-white rounded-lg"
              >
                Simpan
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

