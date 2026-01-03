'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { waterSafetyAnalyzer } from '@/lib/water-safety';
import { useAuth } from '@/providers/AuthProvider';
import { 
  Beaker, 
  FlaskConical, 
  CheckCircle, 
  AlertTriangle,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PendingReport {
  id: string;
  user_nama: string;
  kelurahan: string;
  bau: string;
  rasa: string;
  warna: string;
  created_at: string;
}

export default function AnalisisLabPage() {
  const { user } = useAuth();
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [labData, setLabData] = useState({
    kekeruhan: '',
    pH: '',
    besi: '',
    mangan: '',
    nitrat: '',
    coliform: '',
    ecoli: ''
  });
  const [safetyResult, setSafetyResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPendingReports();
  }, [user]);

  const fetchPendingReports = async () => {
    try {
      // Get puskesmas ID
      const { data: puskesmasData } = await supabase
        .from('users')
        .select('puskesmas_id')
        .eq('id', user?.id)
        .single();

      if (!puskesmasData) return;

      // Get pending reports for this puskesmas
      const { data: reports } = await supabase
        .from('reports')
        .select(`
          id,
          bau,
          rasa,
          warna,
          created_at,
          user:users(nama, kelurahan)
        `)
        .eq('puskesmas_id', puskesmasData.puskesmas_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (reports) {
        const formattedReports = reports.map((report: any) => ({
          id: report.id,
          user_nama: report.user?.nama || 'Tidak diketahui',
          kelurahan: report.user?.kelurahan || 'Tidak diketahui',
          bau: report.bau,
          rasa: report.rasa,
          warna: report.warna,
          created_at: report.created_at
        }));
        setPendingReports(formattedReports);
      }
    } catch (error) {
      console.error('Error fetching pending reports:', error);
    }
  };

  const handleLabInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLabData({
      ...labData,
      [e.target.name]: e.target.value
    });
  };

  const analyzeWater = async () => {
    if (!selectedReport) {
      toast.error('Pilih laporan terlebih dahulu');
      return;
    }

    setIsAnalyzing(true);
    try {
      const numericData = {
        kekeruhan: labData.kekeruhan ? Number(labData.kekeruhan) : undefined,
        pH: labData.pH ? Number(labData.pH) : undefined,
        besi: labData.besi ? Number(labData.besi) : undefined,
        mangan: labData.mangan ? Number(labData.mangan) : undefined,
        nitrat: labData.nitrat ? Number(labData.nitrat) : undefined,
        coliform: labData.coliform ? Number(labData.coliform) : undefined,
        ecoli: labData.ecoli ? Number(labData.ecoli) : undefined,
      };

      const result = await waterSafetyAnalyzer.analyzeLabResults(numericData);
      setSafetyResult(result);
      toast.success('Analisis selesai!');
    } catch (error) {
      toast.error('Gagal menganalisis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAnalysis = async () => {
    if (!selectedReport || !safetyResult) {
      toast.error('Lengkapi analisis terlebih dahulu');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Get puskesmas_id first
      const { data: puskesmasData } = await supabase
        .from('users')
        .select('puskesmas_id')
        .eq('id', user?.id)
        .single();

      if (!puskesmasData) {
        throw new Error('Data puskesmas tidak ditemukan');
      }

      // 2. Create water safety report
      const { data: safetyReport, error: safetyError } = await supabase
        .from('water_safety_reports')
        .insert({
          report_id: selectedReport,
          safety_level: safetyResult.safetyLevel,
          safety_score: safetyResult.score,
          contaminants_detected: safetyResult.contaminants,
          lab_parameters: labData,
          recommendations: safetyResult.recommendations,
          health_risks: safetyResult.healthRisks,
          immediate_actions: safetyResult.immediateActions,
          analyzed_by: user?.id,
          puskesmas_id: puskesmasData.puskesmas_id
        })
        .select()
        .single();

      if (safetyError) throw safetyError;

      // 3. Update report status
      const { error: reportError } = await supabase
        .from('reports')
        .update({
          status: 'selesai',
          safety_report_id: safetyReport.id,
          feedback: 'Hasil analisis lab telah tersedia'
        })
        .eq('id', selectedReport);

      if (reportError) throw reportError;

      // 4. Create notification for user
      const { data: report } = await supabase
        .from('reports')
        .select('user_id')
        .eq('id', selectedReport)
        .single();

      if (report) {
        await supabase
          .from('notifications')
          .insert({
            user_id: report.user_id,
            title: 'Hasil Analisis Air',
            message: `Hasil analisis air Anda sudah tersedia. Status: ${safetyResult.safetyLevel.toUpperCase()}`,
            type: safetyResult.safetyLevel === 'bahaya' ? 'urgent' : 'info'
          });
      }

      toast.success('Hasil analisis berhasil disimpan!');
      
      // Reset form
      setSelectedReport(null);
      setLabData({
        kekeruhan: '',
        pH: '',
        besi: '',
        mangan: '',
        nitrat: '',
        coliform: '',
        ecoli: ''
      });
      setSafetyResult(null);
      
      // Refresh pending reports
      fetchPendingReports();
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast.error('Gagal menyimpan hasil analisis');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Analisis Laboratorium
          </h1>
          <p className="text-gray-600 mt-2">
            Input hasil tes lab dan dapatkan analisis keamanan air otomatis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel: Pilih Laporan & Input Lab */}
          <div className="space-y-6">
            {/* Pilih Laporan */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <Beaker className="w-5 h-5 mr-2" />
                Pilih Laporan untuk Dianalisis
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {pendingReports.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    Tidak ada laporan pending
                  </p>
                ) : (
                  pendingReports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report.id)}
                      className={`w-full text-left p-4 border rounded-lg transition-colors ${
                        selectedReport === report.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{report.user_nama}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {report.kelurahan} • {new Date(report.created_at).toLocaleDateString('id-ID')}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                              Bau: {report.bau}
                            </span>
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                              Rasa: {report.rasa}
                            </span>
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                              Warna: {report.warna}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Input Data Lab */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <FlaskConical className="w-5 h-5 mr-2" />
                Input Hasil Laboratorium
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kekeruhan (NTU)
                  </label>
                  <input
                    type="number"
                    name="kekeruhan"
                    value={labData.kekeruhan}
                    onChange={handleLabInput}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0-100"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    pH
                  </label>
                  <input
                    type="number"
                    name="pH"
                    value={labData.pH}
                    onChange={handleLabInput}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="6.5-8.5"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Besi (Fe) mg/L
                  </label>
                  <input
                    type="number"
                    name="besi"
                    value={labData.besi}
                    onChange={handleLabInput}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0-0.3"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mangan (Mn) mg/L
                  </label>
                  <input
                    type="number"
                    name="mangan"
                    value={labData.mangan}
                    onChange={handleLabInput}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0-0.1"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nitrat (NO3) mg/L
                  </label>
                  <input
                    type="number"
                    name="nitrat"
                    value={labData.nitrat}
                    onChange={handleLabInput}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0-10"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Coliform
                  </label>
                  <input
                    type="number"
                    name="coliform"
                    value={labData.coliform}
                    onChange={handleLabInput}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="MPN/100ml"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E. coli
                  </label>
                  <input
                    type="number"
                    name="ecoli"
                    value={labData.ecoli}
                    onChange={handleLabInput}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="MPN/100ml"
                  />
                </div>
              </div>

              <button
                onClick={analyzeWater}
                disabled={!selectedReport || isAnalyzing}
                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isAnalyzing ? 'Menganalisis...' : 'Analisis Data Lab'}
              </button>
            </div>
          </div>

          {/* Right Panel: Hasil Analisis */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Hasil Analisis Keamanan Air
            </h3>
            
            {safetyResult ? (
              <div className="space-y-6">
                {/* Status */}
                <div className={`p-4 rounded-lg ${
                  safetyResult.safetyLevel === 'aman' ? 'bg-green-100 text-green-800' :
                  safetyResult.safetyLevel === 'waspada' ? 'bg-yellow-100 text-yellow-800' :
                  safetyResult.safetyLevel === 'rawan' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  <div className="flex items-center">
                    {safetyResult.safetyLevel === 'aman' ? 
                      <CheckCircle className="w-6 h-6 mr-3" /> : 
                      <AlertTriangle className="w-6 h-6 mr-3" />
                    }
                    <div>
                      <div className="font-bold text-lg">Status: {safetyResult.safetyLevel.toUpperCase()}</div>
                      <div>Skor Keamanan: {safetyResult.score}/100</div>
                    </div>
                  </div>
                </div>

                {/* Kontaminan */}
                {safetyResult.contaminants.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Kontaminan Terdeteksi:</h4>
                    <div className="flex flex-wrap gap-2">
                      {safetyResult.contaminants.map((c: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risiko Kesehatan */}
                {safetyResult.healthRisks.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">Risiko Kesehatan:</h4>
                    <ul className="space-y-1">
                      {safetyResult.healthRisks.map((risk: string, i: number) => (
                        <li key={i} className="flex items-start">
                          <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5" />
                          <span className="text-gray-700">{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tindakan Segera */}
                {safetyResult.immediateActions.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">Tindakan Segera:</h4>
                    <ul className="space-y-1">
                      {safetyResult.immediateActions.map((action: string, i: number) => (
                        <li key={i} className="text-red-700">• {action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Rekomendasi */}
                {safetyResult.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Rekomendasi:</h4>
                    <ul className="space-y-2">
                      {safetyResult.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                          <span className="text-gray-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={saveAnalysis}
                  disabled={isSaving}
                  className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Hasil Analisis'}
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FlaskConical className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Masukkan data lab dan klik "Analisis Data Lab"</p>
                <p className="text-sm mt-2">Sistem akan memberikan analisis otomatis berdasarkan standar WHO/SNI</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}