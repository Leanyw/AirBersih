"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import {
  Beaker,
  FlaskConical,
  CheckCircle,
  AlertTriangle,
  Save,
  FileText,
  Calendar,
  User,
  MapPin,
  ChevronRight,
  Filter,
  Search,
  Download,
  Clock,
  XCircle,
  Activity,
  AlertCircle,
  RefreshCw,
  Shield,
  Thermometer,
  Droplets,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useRouter } from "next/navigation";

// Types
interface WaterReport {
  id: string;
  user_id: string;
  lokasi: string;
  keterangan: string;
  foto_url: string;
  bau: string;
  rasa: string;
  warna: string;
  status: "pending" | "diproses" | "selesai" | "ditolak";
  kecamatan: string;
  created_at: string;
  updated_at: string;
  users?: {
    nama: string;
    phone: string;
    email: string;
  };
  lab_result?: {
    report_id: string;
    bacteria_count: number;
    ph_level: number;
    turbidity: number;
    chlorine: number;
    heavy_metals: boolean;
    e_coli_present: boolean;
    total_dissolved_solids: number;
    test_date: string;
    technician_notes: string;
    safety_level: "safe" | "warning" | "danger";
  };
}

interface LabTestForm {
  report_id: string;
  bacteria_count: number;
  ph_level: number;
  turbidity: number;
  chlorine: number;
  heavy_metals: boolean;
  e_coli_present: boolean;
  total_dissolved_solids: number;
  technician_notes: string;
}

// Fungsi analisis keamanan air
const analyzeWaterSafety = (params: {
  bacteria_count?: number;
  ph_level?: number;
  turbidity?: number;
  chlorine?: number;
  heavy_metals?: boolean;
  e_coli_present?: boolean;
  total_dissolved_solids?: number;
}) => {
  const issues: string[] = [];
  let score = 100;

  const bacteria_count = params.bacteria_count || 0;
  const ph_level = params.ph_level || 7.0;
  const turbidity = params.turbidity || 0;
  const chlorine = params.chlorine || 0.2;
  const heavy_metals = params.heavy_metals || false;
  const e_coli_present = params.e_coli_present || false;
  const total_dissolved_solids = params.total_dissolved_solids || 150;

  if (bacteria_count > 1000) {
    issues.push("Jumlah bakteri sangat tinggi");
    score -= 40;
  } else if (bacteria_count > 100) {
    issues.push("Jumlah bakteri melebihi batas aman");
    score -= 20;
  }

  if (ph_level < 6.5 || ph_level > 8.5) {
    issues.push("Tingkat pH tidak normal");
    score -= 15;
  }

  if (turbidity > 5) {
    issues.push("Air terlalu keruh");
    score -= 10;
  }

  if (chlorine < 0.2) {
    issues.push("Klorin tidak cukup untuk desinfeksi");
    score -= 10;
  } else if (chlorine > 0.5) {
    issues.push("Klorin berlebihan");
    score -= 5;
  }

  if (heavy_metals) {
    issues.push("Terdeteksi logam berat");
    score -= 30;
  }

  if (e_coli_present) {
    issues.push("E. coli ditemukan (kontaminasi tinja)");
    score -= 25;
  }

  if (total_dissolved_solids > 500) {
    issues.push("Total padatan terlarut terlalu tinggi");
    score -= 10;
  }

  let safety_level: "safe" | "warning" | "danger";
  if (score >= 80) {
    safety_level = "safe";
  } else if (score >= 60) {
    safety_level = "warning";
  } else {
    safety_level = "danger";
  }

  return { safety_level, score, issues };
};

// Helper functions
const formatDateSafe = (
  dateString: string | null | undefined,
  formatStr: string = "dd MMM yyyy"
): string => {
  if (!dateString) return "Tanggal tidak tersedia";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Tanggal tidak valid";
    return format(date, formatStr, { locale: id });
  } catch {
    return "Tanggal tidak valid";
  }
};

const getConditionText = (
  condition: string,
  type: "bau" | "rasa" | "warna"
) => {
  const texts: Record<string, Record<string, string>> = {
    bau: {
      tidak_berbau: "Tidak Berbau",
      berbau_besi: "Berbau Besi",
      berbau_busuk: "Berbau Busuk",
      berbau_kaporit: "Berbau Kaporit",
    },
    rasa: {
      normal: "Normal",
      tidak_normal: "Tidak Normal",
      pahit: "Pahit",
      asin: "Asin",
    },
    warna: {
      jernih: "Jernih",
      keruh: "Keruh",
      kecoklatan: "Kecoklatan",
      kehijauan: "Kehijauan",
    },
  };

  return texts[type]?.[condition] || condition;
};

export default function AnalisisLabPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [reports, setReports] = useState<WaterReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WaterReport | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [formData, setFormData] = useState<LabTestForm>({
    report_id: "",
    bacteria_count: 0,
    ph_level: 7.0,
    turbidity: 0,
    chlorine: 0.2,
    heavy_metals: false,
    e_coli_present: false,
    total_dissolved_solids: 150,
    technician_notes: "",
  });

  // 🔍 DEBUG: Log auth state
  useEffect(() => {
    console.log("🔄 Auth state di AnalisisLab:", {
      userEmail: user?.email,
      profileRole: profile?.role,
      profileKecamatan: profile?.kecamatan,
      profileNama: profile?.nama,
    });
  }, [user, profile]);

  // 🚀 Fetch data when user is authenticated
  useEffect(() => {
    console.log("🔄 useEffect triggered, profile role:", profile?.role);

    if (user && profile?.role === "puskesmas") {
      console.log("✅ User is puskesmas, fetching data...");
      fetchWaterReports();
    } else if (user && profile?.role !== "puskesmas") {
      console.log("❌ User bukan puskesmas, role:", profile?.role);
      toast.error("Hanya untuk puskesmas");
      router.push("/dashboard");
    } else {
      console.log("⏳ Waiting for auth...");
    }
  }, [user, profile, router]);

  // 📥 FETCH WATER REPORTS - MIRIP DENGAN DASHBOARD
  const fetchWaterReports = async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);
      console.log("🚀 Starting fetchWaterReports...");

      const kecamatan = profile.kecamatan;
      console.log("📍 Fetching reports");

      // 1️⃣ Dapatkan warga di wilayah puskesmas (SAMA DENGAN DASHBOARD)
      const { data: wargaData } = await supabase
        .from("users")
        .select("id, nama, phone, email")
        .eq("role", "warga");

      const wargaIds = wargaData?.map((w) => w.id) || [];
      const wargaMap = new Map(wargaData?.map((w) => [w.id, w]) || []);

      console.log("👥 Warga di kecamatan:", wargaIds.length);

      if (wargaIds.length === 0) {
        console.log("📭 No residents");
        setReports([]);
        setSelectedReport(null);
        toast.success(`Belum ada warga terdaftar`);
        return;
      }

      // 2️⃣ Ambil laporan dari warga tersebut (SAMA DENGAN DASHBOARD)
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select("*")
        .in("user_id", wargaIds)
        .order("created_at", { ascending: false });

      if (reportsError) {
        console.error("❌ Reports fetch error:", reportsError);
        throw new Error(
          `Gagal mengambil data laporan: ${reportsError.message}`
        );
      }

      console.log("📊 Total reports found:", reportsData?.length || 0);

      if (!reportsData || reportsData.length === 0) {
        console.log("📭 No reports found");
        setReports([]);
        setSelectedReport(null);
        toast.success(`Belum ada laporan`);
        return;
      }

      // Log first report for debugging
      if (reportsData.length > 0) {
        console.log("📋 Sample report:", {
          id: reportsData[0].id,
          status: reportsData[0].status,
          kecamatan: reportsData[0].kecamatan,
          lokasi: reportsData[0].lokasi,
        });
      }

      // 3️⃣ Ambil lab results untuk reports ini (SAMA DENGAN DASHBOARD)
      const reportIds = reportsData.map((r) => r.id);
      let labResultsMap = new Map();

      if (reportIds.length > 0) {
        const { data: labResultsData, error: labError } = await supabase
          .from("lab_results")
          .select("*")
          .in("report_id", reportIds);

        if (!labError && labResultsData && labResultsData.length > 0) {
          console.log("🔬 Total lab result rows:", labResultsData.length);

          // Group by report_id dan transform ke structured format
          const groupedByReport = new Map<string, any[]>();
          labResultsData.forEach((lab) => {
            if (lab.report_id) {
              const existing = groupedByReport.get(lab.report_id) || [];
              existing.push(lab);
              groupedByReport.set(lab.report_id, existing);
            }
          });

          // Convert grouped data to structured lab result
          groupedByReport.forEach((rows, reportId) => {
            try {
              const overallRow = rows.find(
                (r) => r.parameter === "overall_safety"
              );
              if (overallRow) {
                labResultsMap.set(reportId, {
                  report_id: reportId,
                  bacteria_count: parseFloat(
                    rows.find((r) => r.parameter === "bacteria_count")?.value ||
                      "0"
                  ),
                  ph_level: parseFloat(
                    rows.find((r) => r.parameter === "ph_level")?.value || "7.0"
                  ),
                  turbidity: parseFloat(
                    rows.find((r) => r.parameter === "turbidity")?.value || "0"
                  ),
                  chlorine: parseFloat(
                    rows.find((r) => r.parameter === "chlorine")?.value || "0.2"
                  ),
                  heavy_metals:
                    rows.find((r) => r.parameter === "heavy_metals")?.value ===
                    "1",
                  e_coli_present:
                    rows.find((r) => r.parameter === "e_coli_present")
                      ?.value === "1",
                  total_dissolved_solids: parseFloat(
                    rows.find((r) => r.parameter === "total_dissolved_solids")
                      ?.value || "150"
                  ),
                  test_date: overallRow.tested_at,
                  technician_notes: overallRow.notes || "",
                  safety_level:
                    overallRow.status === "aman"
                      ? "safe"
                      : overallRow.status === "warning"
                      ? "warning"
                      : "danger",
                });
              }
            } catch (error) {
              console.warn(
                `⚠️ Error processing lab result for report ${reportId}:`,
                error
              );
            }
          });

          console.log("✅ Lab results processed:", labResultsMap.size);
        } else {
          console.log("📭 No lab results found or error:", labError?.message);
        }
      }

      // 4️⃣ Gabungkan data (SAMA DENGAN DASHBOARD)
      const processedReports: WaterReport[] = reportsData.map((report) => ({
        id: report.id,
        user_id: report.user_id,
        lokasi: report.lokasi || "",
        keterangan: report.keterangan || "",
        foto_url: report.foto_url || "",
        bau: report.bau || "",
        rasa: report.rasa || "",
        warna: report.warna || "",
        status: report.status || "pending",
        kecamatan: report.kecamatan || "",
        created_at: report.created_at,
        updated_at: report.updated_at || report.created_at,
        users: wargaMap.get(report.user_id),
        lab_result: labResultsMap.get(report.id),
      }));

      console.log("📊 Processed reports:", processedReports);

      console.log("✅ Final processed reports:", processedReports.length);
      console.log("📈 Status breakdown:", {
        pending: processedReports.filter((r) => r.status === "pending").length,
        diproses: processedReports.filter((r) => r.status === "diproses")
          .length,
        selesai: processedReports.filter((r) => r.status === "selesai").length,
        ditolak: processedReports.filter((r) => r.status === "ditolak").length,
      });

      setReports(processedReports);

      // Auto-select first pending report, or first report
      const firstPending = processedReports.find((r) => r.status === "pending");
      const firstReport = processedReports[0];

      if (firstPending) {
        setSelectedReport(firstPending);
        console.log("📌 Auto-selected pending report:", firstPending.id);
      } else if (firstReport) {
        setSelectedReport(firstReport);
        console.log("📌 Auto-selected first report:", firstReport.id);
      } else {
        setSelectedReport(null);
      }
    } catch (error: any) {
      console.error("❌ Error in fetchWaterReports:", error);
      toast.error(`Gagal mengambil data: ${error.message || "Unknown error"}`);
      setReports([]);
      setSelectedReport(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // 📝 Load form data when report is selected
  useEffect(() => {
    if (selectedReport) {
      console.log("📝 Loading form data for report:", selectedReport.id);

      setFormData((prev) => ({
        ...prev,
        report_id: selectedReport.id,
      }));

      // Load existing lab results if any
      if (selectedReport.lab_result) {
        console.log("🔄 Loading existing lab results");
        setFormData({
          report_id: selectedReport.id,
          bacteria_count: selectedReport.lab_result.bacteria_count || 0,
          ph_level: selectedReport.lab_result.ph_level || 7.0,
          turbidity: selectedReport.lab_result.turbidity || 0,
          chlorine: selectedReport.lab_result.chlorine || 0.2,
          heavy_metals: selectedReport.lab_result.heavy_metals || false,
          e_coli_present: selectedReport.lab_result.e_coli_present || false,
          total_dissolved_solids:
            selectedReport.lab_result.total_dissolved_solids || 150,
          technician_notes: selectedReport.lab_result.technician_notes || "",
        });
      } else {
        // Reset form for new analysis
        console.log("🔄 Resetting form for new analysis");
        setFormData({
          report_id: selectedReport.id,
          bacteria_count: 0,
          ph_level: 7.0,
          turbidity: 0,
          chlorine: 0.2,
          heavy_metals: false,
          e_coli_present: false,
          total_dissolved_solids: 150,
          technician_notes: "",
        });
      }
    }
  }, [selectedReport]);

  // ✅ HANDLE SUBMIT - SIMPLIFIED VERSION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReport || !user || !profile) {
      toast.error("Data tidak lengkap. Silakan pilih laporan.");
      return;
    }

    console.log("🚀 Submitting lab analysis for report:", selectedReport.id);

    // Validate form
    if (
      isNaN(formData.ph_level) ||
      formData.ph_level < 0 ||
      formData.ph_level > 14
    ) {
      toast.error("Nilai pH harus antara 0-14");
      return;
    }

    if (isNaN(formData.bacteria_count) || formData.bacteria_count < 0) {
      toast.error("Jumlah bakteri harus angka positif");
      return;
    }

    const loadingToast = toast.loading("Menyimpan hasil analisis...");

    try {
      setSaving(true);

      // Analyze water safety
      const safetyAnalysis = analyzeWaterSafety({
        bacteria_count: formData.bacteria_count,
        ph_level: formData.ph_level,
        turbidity: formData.turbidity,
        chlorine: formData.chlorine,
        heavy_metals: formData.heavy_metals,
        e_coli_present: formData.e_coli_present,
        total_dissolved_solids: formData.total_dissolved_solids,
      });

      console.log("🔬 Safety analysis result:", safetyAnalysis);

      const currentTimestamp = new Date().toISOString();
      const safetyStatus =
        safetyAnalysis.safety_level === "safe"
          ? "aman"
          : safetyAnalysis.safety_level === "warning"
          ? "warning"
          : "bahaya";

      // 🧪 Prepare lab data rows (KEY-VALUE format)
      const labRows = [
        {
          report_id: selectedReport.id,
          parameter: "bacteria_count",
          value: String(formData.bacteria_count),
          unit: "CFU/mL",
          status:
            formData.bacteria_count > 1000
              ? "bahaya"
              : formData.bacteria_count > 100
              ? "warning"
              : "aman",
          tested_at: currentTimestamp,
          lab_officer: user.id,
          notes: "",
          puskesmas_id: profile.id,
        },
        {
          report_id: selectedReport.id,
          parameter: "ph_level",
          value: String(formData.ph_level.toFixed(1)),
          unit: "pH",
          status:
            formData.ph_level < 6.5 || formData.ph_level > 8.5
              ? "warning"
              : "aman",
          tested_at: currentTimestamp,
          lab_officer: user.id,
          notes: "",
          puskesmas_id: profile.id,
        },
        {
          report_id: selectedReport.id,
          parameter: "turbidity",
          value: String(formData.turbidity.toFixed(1)),
          unit: "NTU",
          status: formData.turbidity > 5 ? "warning" : "aman",
          tested_at: currentTimestamp,
          lab_officer: user.id,
          notes: "",
          puskesmas_id: profile.id,
        },
        {
          report_id: selectedReport.id,
          parameter: "chlorine",
          value: String(formData.chlorine.toFixed(2)),
          unit: "mg/L",
          status:
            formData.chlorine < 0.2 || formData.chlorine > 0.5
              ? "warning"
              : "aman",
          tested_at: currentTimestamp,
          lab_officer: user.id,
          notes: "",
          puskesmas_id: profile.id,
        },
        {
          report_id: selectedReport.id,
          parameter: "total_dissolved_solids",
          value: String(formData.total_dissolved_solids),
          unit: "mg/L",
          status: formData.total_dissolved_solids > 500 ? "warning" : "aman",
          tested_at: currentTimestamp,
          lab_officer: user.id,
          notes: "",
          puskesmas_id: profile.id,
        },
        {
          report_id: selectedReport.id,
          parameter: "heavy_metals",
          value: formData.heavy_metals ? "1" : "0",
          unit: "boolean",
          status: formData.heavy_metals ? "bahaya" : "aman",
          tested_at: currentTimestamp,
          lab_officer: user.id,
          notes: "",
          puskesmas_id: profile.id,
        },
        {
          report_id: selectedReport.id,
          parameter: "e_coli_present",
          value: formData.e_coli_present ? "1" : "0",
          unit: "boolean",
          status: formData.e_coli_present ? "bahaya" : "aman",
          tested_at: currentTimestamp,
          lab_officer: user.id,
          notes: "",
          puskesmas_id: profile.id,
        },
        {
          report_id: selectedReport.id,
          parameter: "overall_safety",
          value: String(safetyAnalysis.score),
          unit: "score",
          status: safetyStatus,
          tested_at: currentTimestamp,
          lab_officer: user.id,
          notes: formData.technician_notes || "",
          puskesmas_id: profile.id,
        },
      ];

      console.log("💾 Saving lab rows:", labRows.length);

      // 1️⃣ Delete existing lab results first
      const { error: deleteError } = await supabase
        .from("lab_results")
        .delete()
        .eq("report_id", selectedReport.id);

      if (deleteError) {
        console.warn(
          "⚠️ Could not delete existing lab results:",
          deleteError.message
        );
      }

      // 2️⃣ Insert new lab results
      toast.loading("Menyimpan hasil laboratorium...", { id: loadingToast });

      const { error: labError } = await supabase
        .from("lab_results")
        .insert(labRows);

      if (labError) {
        console.error("❌ Lab save error:", labError);
        throw new Error(`Gagal menyimpan hasil lab: ${labError.message}`);
      }

      console.log("✅ Lab results saved");

      // 3️⃣ Update report status to 'selesai'
      toast.loading("Memperbarui status laporan...", { id: loadingToast });

      const { error: reportError } = await supabase
        .from("reports")
        .update({
          status: "selesai",
          updated_at: currentTimestamp,
        })
        .eq("id", selectedReport.id);

      if (reportError) {
        console.error("❌ Report update error:", reportError);
        // Continue anyway, lab results are saved
      } else {
        console.log('✅ Report status updated to "selesai"');
      }

      // 4️⃣ Send notification to user
      toast.loading("Mengirim notifikasi ke warga...", { id: loadingToast });

      try {
        const notificationMessages = {
          safe: `✅ Hasil Analisis: Air AMAN\nAir di ${selectedReport.lokasi} AMAN untuk dikonsumsi. Tetap jaga kebersihan sumber air.`,
          warning: `⚠️ Hasil Analisis: Air WASPADA\nAir di ${selectedReport.lokasi} dalam kondisi WASPADA. Beberapa parameter tidak memenuhi standar.`,
          danger: `🚨 Hasil Analisis: Air BAHAYA\nAir di ${selectedReport.lokasi} BERBAHAYA! Tidak aman untuk dikonsumsi.`,
        };

        const notificationData = {
          user_id: selectedReport.user_id,
          puskesmas_id: user.id,
          title:
            safetyAnalysis.safety_level === "safe"
              ? "✅ Air AMAN"
              : safetyAnalysis.safety_level === "warning"
              ? "⚠️ Air WASPADA"
              : "🚨 Air BAHAYA",
          message: notificationMessages[safetyAnalysis.safety_level],
          type:
            safetyAnalysis.safety_level === "safe"
              ? "info"
              : safetyAnalysis.safety_level === "warning"
              ? "warning"
              : "urgent",
          is_read: false,
          created_at: currentTimestamp,
        };

        const { error: notifError } = await supabase
          .from("notifications")
          .insert([notificationData]);

        if (notifError) {
          console.warn("⚠️ Notification error:", notifError.message);
        } else {
          console.log("✅ Notification sent");
        }
      } catch (notifError) {
        console.warn("⚠️ Notification failed:", notifError);
      }

      // 5️⃣ Success message
      toast.success(
        <div>
          <div className="font-bold">✅ Analisis Berhasil Disimpan!</div>
          <div className="text-sm mt-1">
            • Hasil lab tersimpan ✓<br />
            • Status laporan: SELESAI ✓<br />• Notifikasi terkirim ke warga ✓
          </div>
        </div>,
        { id: loadingToast, duration: 5000 }
      );

      // 6️⃣ Refresh data and select next report
      await fetchWaterReports();

      // Find next pending report
      const nextReport = reports.find(
        (r) =>
          r.id !== selectedReport.id &&
          (r.status === "pending" || r.status === "diproses")
      );

      if (nextReport) {
        setSelectedReport(nextReport);
        toast.success(`Beralih ke laporan berikutnya`, { duration: 3000 });
      }
    } catch (error: any) {
      console.error("❌ Submit error:", error);
      toast.error(
        <div>
          <div className="font-bold">❌ Gagal Menyimpan</div>
          <div className="text-sm">{error.message}</div>
        </div>,
        { id: loadingToast, duration: 5000 }
      );
    } finally {
      setSaving(false);
    }
  };

  // 🎨 UI Helper Functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "diproses":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "selesai":
        return "bg-green-100 text-green-800 border-green-200";
      case "ditolak":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "diproses":
        return <Activity className="w-4 h-4" />;
      case "selesai":
        return <CheckCircle className="w-4 h-4" />;
      case "ditolak":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Menunggu";
      case "diproses":
        return "Diproses";
      case "selesai":
        return "Selesai";
      case "ditolak":
        return "Ditolak";
      default:
        return status;
    }
  };

  const getSafetyColor = (level: "safe" | "warning" | "danger") => {
    switch (level) {
      case "safe":
        return "text-green-600 bg-green-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "danger":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getSafetyText = (level: "safe" | "warning" | "danger") => {
    switch (level) {
      case "safe":
        return "AMAN";
      case "warning":
        return "WASPADA";
      case "danger":
        return "BAHAYA";
      default:
        return "TIDAK DIKETAHUI";
    }
  };

  const getSafetyIcon = (level: "safe" | "warning" | "danger") => {
    switch (level) {
      case "safe":
        return <CheckCircle className="w-4 h-4" />;
      case "warning":
      case "danger":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Filter reports
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      (report.users?.nama || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (report.lokasi || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.keterangan || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesFilter =
      statusFilter === "all" || report.status === statusFilter;

    return matchesSearch && matchesFilter;
  });

  // Analyze current form data
  const currentAnalysis = analyzeWaterSafety({
    bacteria_count: formData.bacteria_count,
    ph_level: formData.ph_level,
    turbidity: formData.turbidity,
    chlorine: formData.chlorine,
    heavy_metals: formData.heavy_metals,
    e_coli_present: formData.e_coli_present,
    total_dissolved_solids: formData.total_dissolved_solids,
  });

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchWaterReports();
  };

  // 🏗️ Loading State
  if (loading && !isRefreshing) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-30"></div>
          <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
        </div>
        <h2 className="text-xl font-bold text-blue-700">Air Bersih</h2>
        <p className="text-sm text-gray-600">Memuat data laporan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Beaker className="w-8 h-8 text-blue-600" />
              Laboratorium Analisis Air
            </h1>
            <p className="text-gray-600 mt-2">
              Kelola dan analisis laporan kualitas air dari warga di wilayah
              Anda.
            </p>
            <p className="text-sm text-gray-500">
              Total Laporan: {reports.length} | Ditampilkan:{" "}
              {filteredReports.length}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari laporan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Memperbarui..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Reports List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Daftar Laporan
                <span className="text-sm font-normal text-gray-500">
                  ({filteredReports.length})
                </span>
              </h2>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Menunggu</option>
                  <option value="diproses">Diproses</option>
                  <option value="selesai">Selesai</option>
                  <option value="ditolak">Ditolak</option>
                </select>
              </div>
            </div>

            {isRefreshing ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-600 mt-2">Memperbarui data...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Tidak ada laporan ditemukan</p>
                <p className="text-sm text-gray-400 mt-2">
                  {reports.length === 0
                    ? `Belum ada laporan`
                    : "Coba ubah filter atau pencarian"}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedReport?.id === report.id
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="font-semibold text-gray-800 truncate">
                            {report.users?.nama || "Tidak diketahui"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {report.lokasi || "Lokasi tidak tersedia"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            <Shield className="w-3 h-3 inline mr-1" />
                            {getConditionText(report.bau, "bau")}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            <Thermometer className="w-3 h-3 inline mr-1" />
                            {getConditionText(report.rasa, "rasa")}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            <Droplets className="w-3 h-3 inline mr-1" />
                            {getConditionText(report.warna, "warna")}
                          </span>
                        </div>

                        <p className="text-sm text-gray-500 line-clamp-2">
                          {report.keterangan || "Tidak ada keterangan"}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(
                              report.status
                            )}`}
                          >
                            {getStatusIcon(report.status)}
                            {getStatusText(report.status)}
                          </span>
                        </div>

                        {report.lab_result && (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getSafetyColor(
                              report.lab_result.safety_level
                            )}`}
                          >
                            {getSafetyIcon(report.lab_result.safety_level)}
                            {getSafetyText(report.lab_result.safety_level)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateSafe(report.created_at, "dd/MM/yy HH:mm")}
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 ${
                          selectedReport?.id === report.id
                            ? "text-blue-500"
                            : "text-gray-400"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Analysis Form */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <div className="space-y-6">
              {/* Report Summary */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                      Detail Laporan
                    </h2>
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">
                          {selectedReport.users?.nama || "Tidak diketahui"}
                        </span>
                        <span className="text-gray-400 hidden md:inline">
                          •
                        </span>
                        <span className="text-gray-500 text-sm">
                          {selectedReport.users?.phone || "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span>
                          {selectedReport.lokasi || "Lokasi tidak tersedia"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-2">
                    <span
                      className={`px-4 py-2 rounded-full font-medium flex items-center gap-2 ${getStatusColor(
                        selectedReport.status
                      )}`}
                    >
                      {getStatusIcon(selectedReport.status)}
                      {getStatusText(selectedReport.status)}
                    </span>
                    <span className="text-sm text-gray-500">
                      Dilaporkan:{" "}
                      {formatDateSafe(
                        selectedReport.created_at,
                        "dd MMM yyyy HH:mm"
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Kondisi Air Dilaporkan
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bau:</span>
                        <span className="font-medium">
                          {getConditionText(selectedReport.bau, "bau")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rasa:</span>
                        <span className="font-medium">
                          {getConditionText(selectedReport.rasa, "rasa")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Warna:</span>
                        <span className="font-medium">
                          {getConditionText(selectedReport.warna, "warna")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kecamatan:</span>
                        <span className="font-medium">
                          {selectedReport.kecamatan || "Tidak diketahui"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Deskripsi Lengkap
                    </h3>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-700 whitespace-pre-line">
                        {selectedReport.keterangan || "Tidak ada deskripsi"}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedReport.foto_url && selectedReport.foto_url !== "" && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Foto Pendukung
                    </h3>
                    <div className="relative">
                      <img
                        src={selectedReport.foto_url}
                        alt="Foto laporan air"
                        className="w-full max-w-md rounded-lg shadow-md border border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/placeholder-image.jpg";
                          (e.target as HTMLImageElement).classList.add(
                            "opacity-50"
                          );
                        }}
                      />
                    </div>
                  </div>
                )}

                {selectedReport.lab_result && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Hasil Analisis Sebelumnya
                      </h3>
                      <span className="text-xs text-green-600">
                        ✓ Sudah dianalisis
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-gray-600 text-sm">
                          Tingkat Keamanan:
                        </span>
                        <div className="mt-1">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getSafetyColor(
                              selectedReport.lab_result.safety_level
                            )}`}
                          >
                            {getSafetyIcon(
                              selectedReport.lab_result.safety_level
                            )}
                            {getSafetyText(
                              selectedReport.lab_result.safety_level
                            )}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600 text-sm">pH Level:</span>
                        <span className="font-medium ml-2">
                          {selectedReport.lab_result.ph_level || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 text-sm">Bakteri:</span>
                        <span className="font-medium ml-2">
                          {selectedReport.lab_result.bacteria_count || 0} CFU/mL
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 text-sm">
                          Tanggal Test:
                        </span>
                        <span className="font-medium ml-2 text-sm">
                          {formatDateSafe(
                            selectedReport.lab_result.test_date,
                            "dd/MM/yy"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="flex flex-col items-center">
                <FlaskConical className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {reports.length === 0
                    ? "Belum Ada Laporan"
                    : "Pilih Laporan untuk Analisis"}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  {reports.length === 0
                    ? `Belum ada laporan yang masuk`
                    : "Klik pada salah satu laporan di sebelah kiri untuk melihat detail dan melakukan analisis laboratorium"}
                </p>
                {reports.length === 0 && (
                  <button
                    onClick={handleRefresh}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Data
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
