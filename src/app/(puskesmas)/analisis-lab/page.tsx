'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
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
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

// Types sesuai dengan table reports
interface ReportRow {
  id: string;
  user_id: string;
  foto_url: string;
  bau: string;
  rasa: string;
  warna: string;
  lokasi: string;
  keterangan: string;
  status: 'pending' | 'diproses' | 'selesai' | 'ditolak';
  puskesmas_id: string | null;
  kecamatan: string;
  created_at: string;
  updated_at: string;
}

interface UserRow {
  id: string;
  nama: string;
  phone: string;
  email: string;
}

interface LabResultRow {
  id: string;
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
  safety_level: 'safe' | 'warning' | 'danger';
  technician_id: string;
  created_at: string;
}

interface WaterReport {
  id: string;
  user_id: string;
  lokasi: string;
  keterangan: string;
  foto_url: string;
  bau: string;
  rasa: string;
  warna: string;
  status: 'pending' | 'diproses' | 'selesai' | 'ditolak';
  kecamatan: string;
  created_at: string;
  updated_at: string;
  user: UserRow;
  lab_result?: LabResultRow;
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

// Fungsi analisis keamanan air dengan default values
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
    issues.push('Jumlah bakteri sangat tinggi');
    score -= 40;
  } else if (bacteria_count > 100) {
    issues.push('Jumlah bakteri melebihi batas aman');
    score -= 20;
  }

  if (ph_level < 6.5 || ph_level > 8.5) {
    issues.push('Tingkat pH tidak normal');
    score -= 15;
  }

  if (turbidity > 5) {
    issues.push('Air terlalu keruh');
    score -= 10;
  }

  if (chlorine < 0.2) {
    issues.push('Klorin tidak cukup untuk desinfeksi');
    score -= 10;
  } else if (chlorine > 0.5) {
    issues.push('Klorin berlebihan');
    score -= 5;
  }

  if (heavy_metals) {
    issues.push('Terdeteksi logam berat');
    score -= 30;
  }

  if (e_coli_present) {
    issues.push('E. coli ditemukan (kontaminasi tinja)');
    score -= 25;
  }

  if (total_dissolved_solids > 500) {
    issues.push('Total padatan terlarut terlalu tinggi');
    score -= 10;
  }

  let safety_level: 'safe' | 'warning' | 'danger';
  if (score >= 80) {
    safety_level = 'safe';
  } else if (score >= 60) {
    safety_level = 'warning';
  } else {
    safety_level = 'danger';
  }

  return { safety_level, score, issues };
};

// Fungsi helper untuk format tanggal dengan error handling
const formatDateSafe = (dateString: string | null | undefined, formatStr: string = 'dd MMM yyyy'): string => {
  if (!dateString) return 'Tanggal tidak tersedia';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Tanggal tidak valid';
    }
    return format(date, formatStr, { locale: id });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Tanggal tidak valid';
  }
};

const formatDateTimeSafe = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Tanggal tidak tersedia';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Tanggal tidak valid';
    }
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Tanggal tidak valid';
  }
};

// Helper untuk mendapatkan nilai yang aman
const getSafeValue = (value: any, defaultValue: any = '') => {
  if (value === null || value === undefined) return defaultValue;
  return value;
};

const transformFromLabRows = (rows: any[]): LabResultRow | null => {
  if (!rows || rows.length === 0) return null;

  const getValue = (param: string, defaultValue: any = 0) => {
    const row = rows.find(r => r.parameter === param);
    if (!row) return defaultValue;
    
    // Handle boolean values (stored as '1' or '0')
    if (param === 'heavy_metals' || param === 'e_coli_present') {
      return row.value === '1';
    }
    
    // Handle numeric values
    const num = parseFloat(row.value);
    return isNaN(num) ? defaultValue : num;
  };

  const overallRow = rows.find(r => r.parameter === 'overall_safety');
  
  return {
    id: rows[0].id || '',
    report_id: rows[0].report_id,
    bacteria_count: getValue('bacteria_count', 0),
    ph_level: getValue('ph_level', 7.0),
    turbidity: getValue('turbidity', 0),
    chlorine: getValue('chlorine', 0.2),
    heavy_metals: getValue('heavy_metals', false),
    e_coli_present: getValue('e_coli_present', false),
    total_dissolved_solids: getValue('total_dissolved_solids', 150),
    test_date: overallRow?.tested_at || rows[0].tested_at,
    technician_notes: overallRow?.notes || '',
    safety_level: overallRow?.value as 'safe' | 'warning' | 'danger' || 'safe',
    technician_id: rows[0].lab_officer,
    created_at: rows[0].tested_at
  };
};

export default function AnalisisLabPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [reports, setReports] = useState<WaterReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WaterReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [formData, setFormData] = useState<LabTestForm>({
    report_id: '',
    bacteria_count: 0,
    ph_level: 7.0,
    turbidity: 0,
    chlorine: 0.2,
    heavy_metals: false,
    e_coli_present: false,
    total_dissolved_solids: 150,
    technician_notes: ''
  });

  useEffect(() => {
    if (user && profile?.role === 'puskesmas') {
      fetchWaterReports();
    } else if (user && profile?.role !== 'puskesmas') {
      toast.error('Hanya untuk puskesmas');
      router.push('/dashboard');
    }
  }, [user, profile, router]);

const fetchWaterReports = async () => {
  try {
    setLoading(true);
    
    if (!profile) {
      console.error('❌ Profile tidak ditemukan');
      toast.error('Profile pengguna tidak ditemukan');
      return;
    }

    if (!profile.kecamatan) {
      console.error('❌ Kecamatan tidak ditemukan di profile');
      toast.error('Data kecamatan tidak ditemukan');
      return;
    }

    console.log('🔍 Fetching reports for kecamatan:', profile.kecamatan);
    
    // 1. Ambil data reports berdasarkan kecamatan
    const { data: reportsData, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .eq('kecamatan', profile.kecamatan)
      .order('created_at', { ascending: false });

    if (reportsError) {
      console.error('❌ Reports fetch error:', reportsError);
      throw new Error(`Gagal mengambil data laporan: ${reportsError.message}`);
    }

    console.log('📊 Raw reports data:', reportsData?.length || 0);

    if (!reportsData || reportsData.length === 0) {
      console.log('📭 No reports found for kecamatan:', profile.kecamatan);
      setReports([]);
      console.info(`Belum ada laporan di kecamatan ${profile.kecamatan}`);
      return;
    }

    // 2. Collect unique report IDs and user IDs
    const reportIds = reportsData.map((r: any) => r.id).filter(Boolean);
    const userIds = [...new Set(reportsData.map((r: any) => r.user_id).filter(Boolean))];
    
    console.log('📋 Report IDs:', reportIds.length);
    console.log('👥 Unique user IDs:', userIds.length);

    // 3. Batch fetch lab_results (MULTIPLE ROWS per report)
    let labResultsMap: Record<string, LabResultRow | null> = {};
    
    if (reportIds.length > 0) {
      const { data: labResultsData, error: labError } = await supabase
        .from('lab_results')
        .select('*')
        .in('report_id', reportIds)
        .order('tested_at', { ascending: false });

      if (labError) {
        console.error('⚠️ Lab results fetch error (non-critical):', labError);
      } else if (labResultsData && labResultsData.length > 0) {
        console.log('🔬 Total lab result rows:', labResultsData.length);
        
        // Group lab results by report_id (CRITICAL FIX)
        const labsByReport = new Map<string, any[]>();
        
        labResultsData.forEach(lab => {
          const existing = labsByReport.get(lab.report_id) || [];
          existing.push(lab);
          labsByReport.set(lab.report_id, existing);
        });
        
        console.log('📦 Lab results grouped by report:', labsByReport.size, 'reports have tests');
        
        // Transform each group of rows to single LabResultRow object
        labsByReport.forEach((rows, reportId) => {
          const transformed = transformFromLabRows(rows);
          if (transformed) {
            labResultsMap[reportId] = transformed;
          }
        });
        
        console.log('✅ Transformed lab results:', Object.keys(labResultsMap).length);
      } else {
        console.log('📭 No lab results found');
      }
    }

    // 4. Batch fetch users data
    let usersMap: Record<string, UserRow> = {};
    
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, nama, phone, email')
        .in('id', userIds);

      if (usersError) {
        console.error('⚠️ Users fetch error (non-critical):', usersError);
      } else if (usersData) {
        usersMap = usersData.reduce((map: Record<string, UserRow>, user: any) => {
          map[user.id] = {
            id: user.id,
            nama: user.nama || 'Tidak diketahui',
            phone: user.phone || '-',
            email: user.email || ''
          };
          return map;
        }, {});
        
        console.log('👤 Users loaded:', Object.keys(usersMap).length);
      }
    }

    // 5. Merge all data together
    const processedReports: WaterReport[] = reportsData.map((report: any) => {
      // Get user data with fallback
      const userData = usersMap[report.user_id] || { 
        id: report.user_id, 
        nama: 'Tidak diketahui', 
        phone: '-', 
        email: '' 
      };

      // Get lab result (already transformed from multiple rows)
      const labResult = labResultsMap[report.id] || undefined;
      
      return {
        id: report.id,
        user_id: report.user_id,
        lokasi: report.lokasi || '',
        keterangan: report.keterangan || '',
        foto_url: report.foto_url || '',
        bau: report.bau || '',
        rasa: report.rasa || '',
        warna: report.warna || '',
        status: report.status || 'pending',
        kecamatan: report.kecamatan || '',
        created_at: report.created_at,
        updated_at: report.updated_at || report.created_at,
        user: userData,
        lab_result: labResult
      };
    });

    console.log('✅ Processed reports:', processedReports.length);
    console.log('🔬 Reports with lab results:', processedReports.filter(r => r.lab_result).length);
    
    setReports(processedReports);
    
    // Auto-select first pending report if none selected
    if (processedReports.length > 0 && !selectedReport) {
      const firstPending = processedReports.find(r => r.status === 'pending');
      const reportToSelect = firstPending || processedReports[0];
      setSelectedReport(reportToSelect);
      console.log('📌 Auto-selected report:', reportToSelect.id);
    }

  } catch (error: any) {
    console.error('❌ Error fetching reports:', error);
    
    // Specific error handling
    if (error.message?.includes('JWT')) {
      toast.error('Sesi login expired, silahkan login ulang');
      router.push('/login');
    } else if (error.message?.includes('network')) {
      toast.error('Gagal terhubung ke server. Cek koneksi internet Anda');
    } else {
      toast.error(`Gagal mengambil data laporan: ${error.message || 'Unknown error'}`);
    }
    
    setReports([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (selectedReport) {
      setFormData(prev => ({
        ...prev,
        report_id: selectedReport.id
      }));
      
      // Load existing lab results if any
      if (selectedReport.lab_result) {
        setFormData({
          report_id: selectedReport.id,
          bacteria_count: getSafeValue(selectedReport.lab_result.bacteria_count, 0),
          ph_level: getSafeValue(selectedReport.lab_result.ph_level, 7.0),
          turbidity: getSafeValue(selectedReport.lab_result.turbidity, 0),
          chlorine: getSafeValue(selectedReport.lab_result.chlorine, 0.2),
          heavy_metals: getSafeValue(selectedReport.lab_result.heavy_metals, false),
          e_coli_present: getSafeValue(selectedReport.lab_result.e_coli_present, false),
          total_dissolved_solids: getSafeValue(selectedReport.lab_result.total_dissolved_solids, 150),
          technician_notes: getSafeValue(selectedReport.lab_result.technician_notes, '')
        });
      } else {
        // Reset form untuk report baru
        setFormData({
          report_id: selectedReport.id,
          bacteria_count: 0,
          ph_level: 7.0,
          turbidity: 0,
          chlorine: 0.2,
          heavy_metals: false,
          e_coli_present: false,
          total_dissolved_solids: 150,
          technician_notes: ''
        });
      }
    }
  }, [selectedReport]);

  const sendNotificationToUser = async (userId: string, safetyLevel: 'safe' | 'warning' | 'danger', reportLocation: string) => {
  try {
    const notificationTitles = {
      safe: '✅ Hasil Analisis: Air AMAN',
      warning: '⚠️ Hasil Analisis: Air WASPADA',
      danger: '🚨 Hasil Analisis: Air BAHAYA'
    };

    const notificationMessages = {
      safe: `Hasil analisis laboratorium untuk laporan air di ${reportLocation} menunjukkan kondisi AMAN untuk dikonsumsi. Namun tetap jaga kebersihan sumber air Anda.`,
      warning: `Hasil analisis laboratorium untuk laporan air di ${reportLocation} menunjukkan kondisi WASPADA. Beberapa parameter tidak memenuhi standar. Harap berhati-hati dan pertimbangkan pengolahan tambahan.`,
      danger: `Hasil analisis laboratorium untuk laporan air di ${reportLocation} menunjukkan kondisi BAHAYA! Air tidak aman untuk dikonsumsi. Segera hentikan penggunaan dan hubungi puskesmas untuk penanganan lebih lanjut.`
    };

    const notificationTypes: { [key: string]: 'info' | 'warning' | 'urgent' | 'lab_result' } = {
      safe: 'lab_result',
      warning: 'warning',
      danger: 'urgent'
    };

    const notificationData = {
      user_id: userId,
      puskesmas_id: user!.id,
      title: notificationTitles[safetyLevel],
      message: notificationMessages[safetyLevel],
      type: notificationTypes[safetyLevel],
      is_read: false
    };

    console.log('📧 Sending notification to user:', notificationData);

    const { error: notifError } = await supabase
      .from('notifications')
      .insert([notificationData]);

    if (notifError) {
      console.error('❌ Notification error:', notifError);
      return false;
    }

    console.log('✅ Notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!selectedReport || !user) {
    toast.error('Pilih laporan terlebih dahulu');
    return;
  }

  // Validasi form data
  if (isNaN(formData.ph_level) || formData.ph_level < 0 || formData.ph_level > 14) {
    toast.error('Nilai pH harus antara 0-14');
    return;
  }

  const loadingToast = toast.loading('Menyimpan hasil analisis...');

  try {
    setSaving(true);

    // Analyze water safety
    const safetyAnalysis = analyzeWaterSafety({
      bacteria_count: formData.bacteria_count || 0,
      ph_level: formData.ph_level || 7.0,
      turbidity: formData.turbidity || 0,
      chlorine: formData.chlorine || 0.2,
      heavy_metals: formData.heavy_metals || false,
      e_coli_present: formData.e_coli_present || false,
      total_dissolved_solids: formData.total_dissolved_solids || 150
    });

    console.log('🔬 Safety Analysis:', safetyAnalysis);

    // 1. Transform to key-value rows for database
const labRows = [
      {
        report_id: selectedReport.id,
        parameter: 'bacteria_count',
        value: String(formData.bacteria_count || 0),
        unit: 'CFU/mL',
        status: formData.bacteria_count > 1000 ? 'danger' : formData.bacteria_count > 100 ? 'warning' : 'safe',
        tested_at: new Date().toISOString(),
        lab_officer: user.id,
        notes: '',
        puskesmas_id: profile?.id || user.id
      },
      {
        report_id: selectedReport.id,
        parameter: 'ph_level',
        value: String(formData.ph_level || 7.0),
        unit: 'pH',
        status: (formData.ph_level < 6.5 || formData.ph_level > 8.5) ? 'warning' : 'safe',
        tested_at: new Date().toISOString(),
        lab_officer: user.id,
        notes: '',
        puskesmas_id: profile?.id || user.id
      },
      {
        report_id: selectedReport.id,
        parameter: 'turbidity',
        value: String(formData.turbidity || 0),
        unit: 'NTU',
        status: formData.turbidity > 5 ? 'warning' : 'safe',
        tested_at: new Date().toISOString(),
        lab_officer: user.id,
        notes: '',
        puskesmas_id: profile?.id || user.id
      },
      {
        report_id: selectedReport.id,
        parameter: 'chlorine',
        value: String(formData.chlorine || 0.2),
        unit: 'mg/L',
        status: (formData.chlorine < 0.2 || formData.chlorine > 0.5) ? 'warning' : 'safe',
        tested_at: new Date().toISOString(),
        lab_officer: user.id,
        notes: '',
        puskesmas_id: profile?.id || user.id
      },
      {
        report_id: selectedReport.id,
        parameter: 'total_dissolved_solids',
        value: String(formData.total_dissolved_solids || 150),
        unit: 'mg/L',
        status: formData.total_dissolved_solids > 500 ? 'warning' : 'safe',
        tested_at: new Date().toISOString(),
        lab_officer: user.id,
        notes: '',
        puskesmas_id: profile?.id || user.id
      },
      {
        report_id: selectedReport.id,
        parameter: 'heavy_metals',
        value: formData.heavy_metals ? '1' : '0',
        unit: 'boolean',
        status: formData.heavy_metals ? 'danger' : 'safe',
        tested_at: new Date().toISOString(),
        lab_officer: user.id,
        notes: '',
        puskesmas_id: profile?.id || user.id
      },
      {
        report_id: selectedReport.id,
        parameter: 'e_coli_present',
        value: formData.e_coli_present ? '1' : '0',
        unit: 'boolean',
        status: formData.e_coli_present ? 'danger' : 'safe',
        tested_at: new Date().toISOString(),
        lab_officer: user.id,
        notes: '',
        puskesmas_id: profile?.id || user.id
      },
      {
        report_id: selectedReport.id,
        parameter: 'overall_safety',
        value: safetyAnalysis.safety_level,
        unit: 'assessment',
        status: safetyAnalysis.safety_level,
        tested_at: new Date().toISOString(),
        lab_officer: user.id,
        notes: formData.technician_notes || '',
        puskesmas_id: profile?.id || user.id
      }
    ];

    console.log('💾 Saving', labRows.length, 'lab result rows');

    // 2. Delete existing lab results first
    const { error: deleteError } = await supabase
      .from('lab_results')
      .delete()
      .eq('report_id', selectedReport.id);

    if (deleteError) {
      console.warn('⚠️ Could not delete existing lab results:', deleteError);
    }

    // 3. Insert new lab results (MULTIPLE ROWS)
    toast.loading('Menyimpan hasil laboratorium...', { id: loadingToast });
    
    const { data: labResult, error: labError } = await supabase
      .from('lab_results')
      .insert(labRows)
      .select();

    if (labError) {
      console.error('❌ Lab save error:', labError);
      throw new Error(`Gagal menyimpan hasil lab: ${labError.message}`);
    }

    console.log('✅ Lab results saved:', labResult?.length, 'rows');

    // 4. Update report status to 'selesai'
    toast.loading('Memperbarui status laporan...', { id: loadingToast });
    
    const { error: reportError } = await supabase
      .from('reports')
      .update({ 
        status: 'selesai',
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedReport.id);

    if (reportError) {
      console.error('❌ Report update error:', reportError);
      throw new Error(`Status laporan gagal diupdate: ${reportError.message}`);
    }

    console.log('✅ Report status updated to "selesai"');

    // 5. Send notification to user
    toast.loading('Mengirim notifikasi ke warga...', { id: loadingToast });
    
    try {
      const notificationTitles = {
        safe: '✅ Hasil Analisis: Air AMAN',
        warning: '⚠️ Hasil Analisis: Air WASPADA',
        danger: '🚨 Hasil Analisis: Air BAHAYA'
      };

      const notificationMessages = {
        safe: `Hasil analisis laboratorium untuk laporan air di ${selectedReport.lokasi} menunjukkan kondisi AMAN untuk dikonsumsi. Namun tetap jaga kebersihan sumber air Anda.`,
        warning: `Hasil analisis laboratorium untuk laporan air di ${selectedReport.lokasi} menunjukkan kondisi WASPADA. Beberapa parameter tidak memenuhi standar. Harap berhati-hati dan pertimbangkan pengolahan tambahan.`,
        danger: `Hasil analisis laboratorium untuk laporan air di ${selectedReport.lokasi} menunjukkan kondisi BAHAYA! Air tidak aman untuk dikonsumsi. Segera hentikan penggunaan dan hubungi puskesmas untuk penanganan lebih lanjut.`
      };

      const notificationData = {
        user_id: selectedReport.user_id,
        puskesmas_id: user.id,
        title: notificationTitles[safetyAnalysis.safety_level],
        message: notificationMessages[safetyAnalysis.safety_level],
        type: safetyAnalysis.safety_level === 'safe' ? 'info' : safetyAnalysis.safety_level === 'warning' ? 'warning' : 'urgent',
        is_read: false,
        created_at: new Date().toISOString()
      };

      const { error: notifError } = await supabase
        .from('notifications')
        .insert([notificationData]);

      if (notifError) {
        console.warn('⚠️ Notification failed:', notifError);
      }

    } catch (notifError) {
      console.warn('⚠️ Notification error:', notifError);
    }

    // 6. Success message
    toast.success(
      <div>
        <div className="font-bold">✅ Analisis Berhasil Disimpan!</div>
        <div className="text-sm mt-1">
          • {labResult?.length || 8} parameter tersimpan ✓<br/>
          • Status laporan diperbarui ✓<br/>
          • Notifikasi terkirim ke warga ✓
        </div>
      </div>,
      { 
        id: loadingToast, 
        duration: 5000
      }
    );

    // 7. Refresh data
    await fetchWaterReports();
    
    // 8. Select next pending report
    const nextReport = reports.find(r => 
      r.id !== selectedReport.id && 
      r.status === 'pending'
    );
    
    if (nextReport) {
      setSelectedReport(nextReport);
    }

  } catch (error: any) {
    console.error('❌ Error in handleSubmit:', error);
    
    toast.error(
      <div>
        <div className="font-bold">❌ Gagal Menyimpan Analisis</div>
        <div className="text-sm mt-1">{error.message || 'Terjadi kesalahan'}</div>
      </div>,
      { 
        id: loadingToast, 
        duration: 8000 
      }
    );
  } finally {
    setSaving(false);
  }
};

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      (report.user?.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.lokasi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.keterangan || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      statusFilter === 'all' || 
      report.status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'diproses': return 'bg-blue-100 text-blue-800';
      case 'selesai': return 'bg-green-100 text-green-800';
      case 'ditolak': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu';
      case 'diproses': return 'Diproses';
      case 'selesai': return 'Selesai';
      case 'ditolak': return 'Ditolak';
      default: return status;
    }
  };

  const getSafetyColor = (level: 'safe' | 'warning' | 'danger') => {
    switch (level) {
      case 'safe': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'danger': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSafetyText = (level: 'safe' | 'warning' | 'danger') => {
    switch (level) {
      case 'safe': return 'AMAN';
      case 'warning': return 'WASPADA';
      case 'danger': return 'BAHAYA';
      default: return 'TIDAK DIKETAHUI';
    }
  };

  // Analyze current form data dengan nilai yang aman
  const currentAnalysis = analyzeWaterSafety({
    bacteria_count: getSafeValue(formData.bacteria_count, 0),
    ph_level: getSafeValue(formData.ph_level, 7.0),
    turbidity: getSafeValue(formData.turbidity, 0),
    chlorine: getSafeValue(formData.chlorine, 0.2),
    heavy_metals: getSafeValue(formData.heavy_metals, false),
    e_coli_present: getSafeValue(formData.e_coli_present, false),
    total_dissolved_solids: getSafeValue(formData.total_dissolved_solids, 150)
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data laporan...</p>
          <p className="text-sm text-gray-500 mt-2">Puskesmas: {profile?.nama || profile?.kecamatan || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Beaker className="w-8 h-8 text-blue-600" />
              Laboratorium Analisis Air
            </h1>
            <p className="text-gray-600 mt-2">
              Puskesmas: {getSafeValue(profile?.nama) || getSafeValue(profile?.kecamatan) || 'Tidak diketahui'}
              {profile?.kecamatan && (
                <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Kecamatan: {profile.kecamatan}
                </span>
              )}
            </p>
            <p className="text-sm text-gray-500">
              Total Laporan: {reports.length} | Ditampilkan: {filteredReports.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
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
              onClick={fetchWaterReports}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh
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
                Daftar Laporan ({filteredReports.length})
              </h2>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Menunggu</option>
                  <option value="diproses">Diproses</option>
                  <option value="selesai">Selesai</option>
                  <option value="ditolak">Ditolak</option>
                </select>
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Tidak ada laporan ditemukan</p>
                <p className="text-sm text-gray-400 mt-2">
                  {profile?.kecamatan 
                    ? `Belum ada laporan di kecamatan ${profile.kecamatan}` 
                    : 'Belum ada laporan'}
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {filteredReports.map(report => (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                      selectedReport?.id === report.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold text-gray-800">
                            {getSafeValue(report.user?.nama, 'Tidak diketahui')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{getSafeValue(report.lokasi, 'Lokasi tidak tersedia')}</span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {getSafeValue(report.keterangan, 'Tidak ada keterangan')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                          {getStatusText(report.status)}
                        </span>
                        {report.lab_result && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSafetyColor(report.lab_result.safety_level)}`}>
                            {getSafetyText(report.lab_result.safety_level)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDateSafe(report.created_at)}
                      </div>
                      <ChevronRight className={`w-5 h-5 ${
                        selectedReport?.id === report.id ? 'text-blue-500' : 'text-gray-400'
                      }`} />
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
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                      Detail Laporan
                    </h2>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>{getSafeValue(selectedReport.user?.nama, 'Tidak diketahui')}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 text-sm">{getSafeValue(selectedReport.user?.phone, '-')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span>{getSafeValue(selectedReport.lokasi, 'Lokasi tidak tersedia')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-4 py-2 rounded-full font-medium ${getStatusColor(selectedReport.status)}`}>
                      {getStatusText(selectedReport.status)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDateTimeSafe(selectedReport.created_at)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Kondisi Air Dilaporkan</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bau:</span>
                        <span className="font-medium capitalize">{getSafeValue(selectedReport.bau, 'Tidak ada')?.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rasa:</span>
                        <span className="font-medium capitalize">{getSafeValue(selectedReport.rasa, 'Tidak ada')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Warna:</span>
                        <span className="font-medium capitalize">{getSafeValue(selectedReport.warna, 'Tidak ada')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kecamatan:</span>
                        <span className="font-medium">{getSafeValue(selectedReport.kecamatan, 'Tidak diketahui')}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Deskripsi</h3>
                    <p className="text-gray-700 whitespace-pre-line p-3 bg-gray-50 rounded-lg">
                      {getSafeValue(selectedReport.keterangan, 'Tidak ada deskripsi')}
                    </p>
                  </div>
                </div>

                {selectedReport.foto_url && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Foto Pendukung</h3>
                    <img
                      src={selectedReport.foto_url || '/placeholder-image.jpg'}
                      alt="Foto laporan air"
                      className="w-full max-w-md rounded-lg shadow-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                      }}
                    />
                  </div>
                )}

                {selectedReport.lab_result && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-sm font-medium text-green-800 mb-2">Hasil Analisis Sebelumnya</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-gray-600 text-sm">Tingkat Keamanan:</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getSafetyColor(selectedReport.lab_result.safety_level)}`}>
                          {getSafetyText(selectedReport.lab_result.safety_level)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 text-sm">pH Level:</span>
                        <span className="font-medium ml-2">{getSafeValue(selectedReport.lab_result.ph_level, '-')}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 text-sm">Tanggal Test:</span>
                        <span className="font-medium ml-2">
                          {formatDateSafe(selectedReport.lab_result.test_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lab Analysis Form */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <FlaskConical className="w-6 h-6 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-800">
                    Form Analisis Laboratorium
                    {selectedReport.lab_result && (
                      <span className="text-sm text-green-600 ml-2">
                        ✓ Hasil lab tersedia
                      </span>
                    )}
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Bacteria Count */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jumlah Bakteri (CFU/mL)
                      </label>
                      <input
                       type="number"
                        value={Number.isNaN(formData.bacteria_count) ? '' : formData.bacteria_count}
                      onChange={(e) => {
                      const value = e.target.value;

                      setFormData({
                        ...formData,
                      bacteria_count:
                      value === '' ? NaN : parseInt(value)
                       });
                      }}
                        min="0"
                        step="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />

                      <p className="text-xs text-gray-500 mt-1">
                        Standar aman: &lt; 100 CFU/mL
                      </p>
                    </div>

                    {/* pH Level */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tingkat pH
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4">
                        <input
                        type="range"
                          min={0}
                          max={14}
                          step={0.1}
                        value={formData.ph_level ?? 7.0}
                        onChange={(e) => {
                    const value = Number(e.target.value)
                      setFormData({
                       ...formData,
                      ph_level: Number.isNaN(value) ? 7.0 : value,
                      })
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                        <span className="text-lg font-semibold min-w-[50px]">
                          {getSafeValue(formData.ph_level, 7.0).toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <span>Asam</span>
                        <span className="font-medium">Normal (6.5-8.5)</span>
                        <span>Basa</span>
                      </div>
                    </div>

                    {/* Turbidity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kekeruhan (NTU)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={getSafeValue(formData.turbidity, 0)}
                        onChange={(e) => setFormData({...formData, turbidity: parseFloat(e.target.value) || 0})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maksimal: 5 NTU
                      </p>
                    </div>

                    {/* Chlorine */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Klorin (mg/L)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={getSafeValue(formData.chlorine, 0.2)}
                        onChange={(e) => setFormData({...formData, chlorine: parseFloat(e.target.value) || 0.2})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Ideal: 0.2-0.5 mg/L
                      </p>
                    </div>

                    {/* Total Dissolved Solids */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        TDS (mg/L)
                      </label>
                      <input
                        type="number"
                        value={getSafeValue(formData.total_dissolved_solids, 150)}
                        onChange={(e) => setFormData({...formData, total_dissolved_solids: parseInt(e.target.value) || 150})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maksimal: 500 mg/L
                      </p>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={getSafeValue(formData.heavy_metals, false)}
                          onChange={(e) => setFormData({...formData, heavy_metals: e.target.checked})}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Terdeteksi Logam Berat
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={getSafeValue(formData.e_coli_present, false)}
                          onChange={(e) => setFormData({...formData, e_coli_present: e.target.checked})}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          E. coli Ditemukan
                        </span>
                      </label>
                    </div>

                    {/* Technician Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catatan Teknisi
                      </label>
                      <textarea
                        value={getSafeValue(formData.technician_notes, '')}
                        onChange={(e) => setFormData({...formData, technician_notes: e.target.value})}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Tambahkan catatan penting..."
                        maxLength={500}
                      />
                    </div>
                  </div>

                  {/* Preview Safety Level */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-1">
                          Prakiraan Tingkat Keamanan
                        </h3>
                        <p className="text-sm text-gray-600">
                          Berdasarkan data yang diinput
                        </p>
                      </div>
                      <div className={`px-4 py-2 rounded-full font-semibold flex items-center gap-2 ${getSafetyColor(currentAnalysis.safety_level)}`}>
                        {currentAnalysis.safety_level === 'safe' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                        <span>{getSafetyText(currentAnalysis.safety_level)}</span>
                      </div>
                    </div>
                    
                    {currentAnalysis.issues.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Masalah Terdeteksi:</h4>
                        <ul className="space-y-1">
                          {currentAnalysis.issues.map((issue, index) => (
                            <li key={index} className="text-sm text-red-600 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {saving ? (
    <>
      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      Menyimpan...
    </>
  ) : (
    <>
      <Save className="w-5 h-5" />
      {selectedReport.lab_result ? 'Update Hasil Analisis' : 'Simpan Hasil Analisis'}
    </>
  )}
</button>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedReport.lab_result) {
                          toast.success('Laporan PDF sedang dipersiapkan');
                        } else {
                          toast.error('Belum ada hasil analisis');
                        }
                      }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <Download className="w-5 h-5" />
                      Export PDF
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <FlaskConical className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {reports.length === 0 ? 'Tidak ada laporan tersedia' : 'Pilih Laporan untuk Analisis'}
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {reports.length === 0 
                  ? `Belum ada laporan yang masuk di kecamatan ${profile?.kecamatan || 'Anda'}` 
                  : 'Klik pada salah satu laporan di sebelah kiri untuk melihat detail dan melakukan analisis laboratorium'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}