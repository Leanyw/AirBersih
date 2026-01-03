import { supabase } from './supabase';

export type SafetyLevel = 'aman' | 'waspada' | 'rawan' | 'bahaya';

export interface WaterSafetyResult {
  safetyLevel: SafetyLevel;
  score: number;
  contaminants: string[];
  recommendations: string[];
  healthRisks: string[];
  immediateActions: string[];
}

export interface WaterTestData {
  bau?: string;
  rasa?: string;
  warna?: string;
  kekeruhan?: number;
  pH?: number;
  besi?: number;
  mangan?: number;
  nitrat?: number;
  coliform?: number;
  ecoli?: number; // Perbaikan: ganti 'e coli' dengan 'ecoli'
}

class WaterSafetyAnalyzer {
  // Analisis keamanan air berdasarkan input sederhana (bau, rasa, warna)
  async analyzeSimpleInput(
    bau: string,
    rasa: string,
    warna: string
  ): Promise<WaterSafetyResult> {
    let score = 100;
    const contaminants: string[] = [];
    const recommendations: string[] = [];
    const healthRisks: string[] = [];
    const immediateActions: string[] = [];

    // Analisis berdasarkan bau
    if (bau !== 'normal') {
      score -= 30;
      contaminants.push('Kontaminan organik');
      healthRisks.push('Gangguan pencernaan');
      
      switch (bau) {
        case 'anyir':
          contaminants.push('Besi/Mangan tinggi');
          recommendations.push('Aerasi dan filtrasi pasir');
          break;
        case 'busuk':
          contaminants.push('Bakteri anaerob');
          immediateActions.push('JANGAN diminum');
          recommendations.push('Klorinasi dan perebusan');
          break;
        case 'amis':
          contaminants.push('Amonia');
          recommendations.push('Aerasi dan klorinasi');
          break;
        case 'lainnya':
          contaminants.push('Kontaminan kimia');
          recommendations.push('Perlu pemeriksaan lab lebih lanjut');
          break;
      }
    }

    // Analisis berdasarkan rasa
    if (rasa !== 'normal') {
      score -= 25;
      
      switch (rasa) {
        case 'pahit':
          contaminants.push('Mineral tinggi');
          recommendations.push('Reverse osmosis');
          break;
        case 'asin':
          contaminants.push('Garam/klorida tinggi');
          healthRisks.push('Hipertensi dengan konsumsi jangka panjang');
          recommendations.push('Destilasi atau sumber air alternatif');
          break;
        case 'anyir':
          contaminants.push('Besi/Mangan tinggi');
          recommendations.push('Aerasi dan filtrasi');
          break;
        case 'logam':
          contaminants.push('Logam berat');
          healthRisks.push('Keracunan logam berat');
          immediateActions.push('Segera hentikan konsumsi');
          recommendations.push('Konsultasi lab untuk identifikasi logam');
          break;
        case 'lainnya':
          contaminants.push('Kontaminan kimia');
          recommendations.push('Perlu pemeriksaan lab');
          break;
      }
    }

    // Analisis berdasarkan warna
    if (warna !== 'jernih') {
      score -= 20;
      
      switch (warna) {
        case 'keruh':
          contaminants.push('Partikel tersuspensi');
          recommendations.push('Pengendapan dan filtrasi');
          break;
        case 'kuning':
          contaminants.push('Tanin/humus atau besi');
          recommendations.push('Karbon aktif dan filtrasi');
          break;
        case 'coklat':
          contaminants.push('Besi tinggi atau organik');
          immediateActions.push('Jangan digunakan untuk minum');
          recommendations.push('Pengendapan, aerasi, filtrasi');
          break;
        case 'hijau':
          contaminants.push('Algae atau tembaga');
          healthRisks.push('Gangguan pencernaan');
          recommendations.push('Klorinasi dan filtrasi');
          break;
        default:
          contaminants.push('Kontaminan tidak diketahui');
          recommendations.push('Perlu analisis laboratorium');
          break;
      }
    }

    // Tentukan level keamanan
    let safetyLevel: SafetyLevel = 'aman';
    if (score >= 80) safetyLevel = 'aman';
    else if (score >= 60) safetyLevel = 'waspada';
    else if (score >= 40) safetyLevel = 'rawan';
    else safetyLevel = 'bahaya';

    // Tambahkan rekomendasi umum
    if (safetyLevel !== 'aman') {
      recommendations.push('Rebus air sebelum diminum');
      recommendations.push('Gunakan sumber air alternatif sementara');
    }

    if (safetyLevel === 'bahaya') {
      immediateActions.push('Lapor ke puskesmas segera');
      immediateActions.push('Cari sumber air aman terdekat');
    }

    return {
      safetyLevel,
      score,
      contaminants: [...new Set(contaminants)], // Hapus duplikat
      recommendations,
      healthRisks,
      immediateActions,
    };
  }

  // Analisis detail dengan parameter lab
  async analyzeLabResults(labData: WaterTestData): Promise<WaterSafetyResult> {
    let score = 100;
    const contaminants: string[] = [];
    const recommendations: string[] = [];
    const healthRisks: string[] = [];
    const immediateActions: string[] = [];

    // Ambil standar dari database
    const { data: standards, error: standardsError } = await supabase
      .from('water_quality_standards')
      .select('*');

    if (standardsError) {
      console.error('Error fetching standards:', standardsError);
      throw new Error('Tidak dapat mengambil standar kualitas air');
    }

    if (!standards || standards.length === 0) {
      throw new Error('Standar kualitas air belum tersedia');
    }

    // Analisis setiap parameter
    for (const [param, value] of Object.entries(labData)) {
      if (value === undefined || value === null) continue;

      const standard = standards.find(s => 
        s.parameter.toLowerCase() === param.toLowerCase() ||
        s.parameter.toLowerCase().replace(/\s+/g, '_') === param.toLowerCase()
      );

      if (!standard) continue;

      const numValue = Number(value);

      // Cek level bahaya
      if (
        standard.danger_min !== null && 
        standard.danger_max !== null &&
        numValue >= standard.danger_min && 
        numValue <= standard.danger_max
      ) {
        score -= 40;
        contaminants.push(standard.parameter);
        healthRisks.push(standard.health_impact || 'Risiko kesehatan serius');
        immediateActions.push(`Parameter ${standard.parameter} dalam level bahaya`);
      } else if (
        standard.warning_min !== null && 
        standard.warning_max !== null &&
        numValue >= standard.warning_min && 
        numValue <= standard.warning_max
      ) {
        score -= 20;
        contaminants.push(standard.parameter);
        recommendations.push(`Perbaikan diperlukan untuk ${standard.parameter}`);
      }
    }

    // Tambahkan rekomendasi spesifik berdasarkan kontaminan
    if (contaminants.length > 0) {
      const { data: treatmentMethods, error: treatmentError } = await supabase
        .from('treatment_recommendations')
        .select('method, description');

      if (treatmentError) {
        console.error('Error fetching treatment methods:', treatmentError);
      } else if (treatmentMethods && treatmentMethods.length > 0) {
        // Ambil 3 metode pertama untuk rekomendasi
        treatmentMethods.slice(0, 3).forEach(method => {
          recommendations.push(`${method.method}: ${method.description}`);
        });
      }
    }

    // Tambahkan rekomendasi berdasarkan parameter tertentu
    if (labData.coliform && labData.coliform > 0) {
      recommendations.push('Klorinasi atau perebusan wajib dilakukan');
      immediateActions.push('Air tidak aman diminum tanpa perlakuan');
    }

    if (labData.nitrat && labData.nitrat > 50) {
      healthRisks.push('Risiko Blue Baby Syndrome pada bayi');
      recommendations.push('Gunakan sistem reverse osmosis');
    }

    // Tentukan level keamanan
    let safetyLevel: SafetyLevel = 'aman';
    if (score >= 85) safetyLevel = 'aman';
    else if (score >= 70) safetyLevel = 'waspada';
    else if (score >= 50) safetyLevel = 'rawan';
    else safetyLevel = 'bahaya';

    return {
      safetyLevel,
      score,
      contaminants: [...new Set(contaminants)],
      recommendations: [...new Set(recommendations)],
      healthRisks: [...new Set(healthRisks)],
      immediateActions: [...new Set(immediateActions)],
    };
  }

  // Prediksi penyakit berdasarkan gejala air
  async predictDiseases(symptoms: WaterTestData): Promise<string[]> {
    const diseases: string[] = [];

    // Ambil data penyakit dari database
    const { data: allDiseases, error: diseasesError } = await supabase
      .from('diseases')
      .select('*');

    if (diseasesError) {
      console.error('Error fetching diseases:', diseasesError);
      return diseases;
    }

    if (!allDiseases || allDiseases.length === 0) {
      return diseases;
    }

    // Logika prediksi sederhana
    if (symptoms.coliform && symptoms.coliform > 0) {
      const waterborneDiseases = allDiseases.filter(d => 
        d.nama.toLowerCase().includes('diare') ||
        d.nama.toLowerCase().includes('tifus') ||
        d.nama.toLowerCase().includes('kolera')
      );
      waterborneDiseases.forEach(d => diseases.push(d.nama));
    }

    // PERBAIKAN DI SINI: gunakan 'ecoli' bukan 'e coli'
    if (symptoms.ecoli && symptoms.ecoli > 0) {
      const ecoliDiseases = allDiseases.filter(d => 
        d.nama.toLowerCase().includes('e. coli') ||
        d.nama.toLowerCase().includes('escherichia')
      );
      ecoliDiseases.forEach(d => diseases.push(d.nama));
    }

    if (symptoms.nitrat && symptoms.nitrat > 50) {
      diseases.push('Blue Baby Syndrome (pada bayi)');
    }

    if (symptoms.pH && (symptoms.pH < 5 || symptoms.pH > 9)) {
      diseases.push('Gangguan pencernaan');
      diseases.push('Iritasi saluran pencernaan');
    }

    if (symptoms.besi && symptoms.besi > 0.3) {
      diseases.push('Gangguan metabolisme besi');
    }

    if (symptoms.mangan && symptoms.mangan > 0.1) {
      diseases.push('Gangguan neurologis (dalam jangka panjang)');
    }

    return [...new Set(diseases)]; // Hapus duplikat
  }

  // Generate laporan keamanan
  generateSafetyReport(result: WaterSafetyResult): string {
    const { safetyLevel, score, contaminants, recommendations, healthRisks, immediateActions } = result;

    let report = `# LAPORAN KEAMANAN AIR\n\n`;
    report += `## Status: ${safetyLevel.toUpperCase()}\n`;
    report += `## Skor Keamanan: ${score}/100\n\n`;
    report += `### Tanggal Analisis: ${new Date().toLocaleDateString('id-ID')}\n\n`;

    if (contaminants.length > 0) {
      report += `## Kontaminan Terdeteksi:\n`;
      contaminants.forEach(contaminant => {
        report += `- ${contaminant}\n`;
      });
      report += `\n`;
    }

    if (healthRisks.length > 0) {
      report += `## Risiko Kesehatan:\n`;
      healthRisks.forEach(risk => {
        report += `- ⚠️ ${risk}\n`;
      });
      report += `\n`;
    }

    if (immediateActions.length > 0) {
      report += `## TINDAKAN SEGERA:\n`;
      immediateActions.forEach(action => {
        report += `- 🔴 ${action}\n`;
      });
      report += `\n`;
    }

    if (recommendations.length > 0) {
      report += `## Rekomendasi Perawatan:\n`;
      recommendations.forEach(rec => {
        report += `- ✅ ${rec}\n`;
      });
      report += `\n`;
    }

    report += `---\n`;
    report += `*Laporan ini dihasilkan secara otomatis oleh sistem Air Bersih*\n`;
    report += `*Konsultasi dengan tenaga kesehatan tetap diperlukan untuk diagnosis pasti*`;

    return report;
  }

  // Helper: Convert safety level to color
  getSafetyLevelColor(level: SafetyLevel): string {
    switch (level) {
      case 'aman': return 'green';
      case 'waspada': return 'yellow';
      case 'rawan': return 'orange';
      case 'bahaya': return 'red';
      default: return 'gray';
    }
  }

  // Helper: Get safety level description
  getSafetyLevelDescription(level: SafetyLevel): string {
    switch (level) {
      case 'aman': return 'Air aman untuk dikonsumsi dengan perlakuan normal';
      case 'waspada': return 'Air memerlukan perlakuan khusus sebelum dikonsumsi';
      case 'rawan': return 'Air berisiko menimbulkan masalah kesehatan';
      case 'bahaya': return 'Air tidak aman untuk dikonsumsi, perlu tindakan segera';
      default: return 'Status tidak diketahui';
    }
  }
}

export const waterSafetyAnalyzer = new WaterSafetyAnalyzer();