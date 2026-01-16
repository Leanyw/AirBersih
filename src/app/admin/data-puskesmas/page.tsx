"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Hospital,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Eye,
  Pencil,
  Trash,
  X,
  AlertCircle,
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
  status: "active" | "inactive";
}

interface PuskesmasStats {
  total: number;
  active: number;
  inactive: number;
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

/* ================= STAT CARD ================= */
function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  const colors: any = {
    blue: "text-blue-600",
    green: "text-green-600",
    gray: "text-gray-600",
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border">
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );
}

/* ================= MAIN PAGE ================= */
export default function DataPuskesmasPage() {
  const [list, setList] = useState<PuskesmasData[]>([]);
  const [filtered, setFiltered] = useState<PuskesmasData[]>([]);
  const [stats, setStats] = useState<PuskesmasStats>({
    total: 0,
    active: 0,
    inactive: 0,
  });

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<null | "detail" | "add" | "edit">(null);
  const [selected, setSelected] = useState<PuskesmasData | null>(null);

  const [form, setForm] = useState<any>({
    nama: "",
    email: "",
    phone: "",
    alamat: "",
    kecamatan: "",
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
          status: p.latitude && p.longitude ? "active" : "inactive",
        })) || [];

      setList(mapped);
      calculateStats(mapped);
    } catch (e: any) {
      toast.error("Gagal memuat data puskesmas");
    } finally {
      setLoading(false);
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
    const active = data.filter((p) => p.status === "active").length;
    const inactive = total - active;

    setStats({ total, active, inactive });
  };

  /* ================= CRUD ================= */
  const resetForm = () => {
    setForm({
      nama: "",
      email: "",
      phone: "",
      alamat: "",
      kecamatan: "",
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

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Hospital className="w-8 h-8 text-blue-600" />
            Data Puskesmas
          </h1>
          <p className="text-gray-600 mt-2">Daftar akun puskesmas terdaftar</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setModal("add");
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Tambah Puskesmas
        </button>
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard title="Total Puskesmas" value={stats.total} color="blue" />
        <StatCard title="Aktif" value={stats.active} color="green" />
        <StatCard title="Tidak Aktif" value={stats.inactive} color="gray" />
      </div>

      {/* ================= FILTER ================= */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            placeholder="Cari nama, email, kecamatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* ================= TABLE ================= */}
        <div className="overflow-x-auto mt-6">
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
                  <td colSpan={5} className="py-10 text-center text-gray-500">
                    Tidak ada data puskesmas
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.nama}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        Bergabung:{" "}
                        {new Date(p.created_at).toLocaleDateString("id-ID")}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {p.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {p.phone}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm">
                      <MapPin className="inline w-4 h-4 text-gray-400" />{" "}
                      {p.kecamatan}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 text-xs rounded-full border ${
                          p.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.status === "active" ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </td>

                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => {
                          setSelected(p);
                          setModal("detail");
                        }}
                      >
                        <Eye />
                      </button>
                      <button
                        onClick={() => {
                          setSelected(p);
                          setForm(p);
                          setLat(p.latitude);
                          setLng(p.longitude);
                          setModal("edit");
                        }}
                      >
                        <Pencil />
                      </button>
                      <button onClick={() => handleDelete(p.id)}>
                        <Trash />
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
            <h3 className="font-semibold mb-2">Informasi Puskesmas</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Status aktif jika lokasi peta tersedia</li>
              <li>• Lokasi digunakan untuk pemetaan layanan</li>
              <li>• Data hanya dapat diubah oleh admin</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ================= MODAL ================= */}
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

            {modal !== "detail" && (
              <>
                {["nama", "email", "phone", "alamat", "kecamatan"].map((f) => (
                  <input
                    key={f}
                    className="border p-2 w-full mb-2 rounded"
                    placeholder={f}
                    value={form[f] || ""}
                    onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  />
                ))}
              </>
            )}

            {(modal === "detail" || modal === "edit" || modal === "add") && (
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
            )}

            {modal !== "detail" && (
              <button
                onClick={handleSubmit}
                className="mt-4 px-4 py-2 bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white rounded-lg"
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
