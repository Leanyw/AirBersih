// Validation schemas for reports
import { z } from 'zod';

export const createReportSchema = z.object({
  // user_id akan diambil dari session
  foto_url: z.string().url().optional().nullable(),
  bau: z.enum(['tidak_berbau', 'berbau_besi', 'berbau_busuk', 'berbau_kimia', 'lainnya']),
  rasa: z.enum(['normal', 'tawar', 'asin', 'pahit', 'asam', 'lainnya']),
  warna: z.enum(['jernih', 'keruh', 'kekuningan', 'kecoklatan', 'kehijauan', 'lainnya']),
  lokasi: z.string().min(5, 'Lokasi minimal 5 karakter').max(200),
  keterangan: z.string().max(500).optional().nullable(),
  // puskesmas_id akan diisi otomatis berdasarkan kecamatan user
});

export const updateReportSchema = z.object({
  status: z.enum(['pending', 'diproses', 'selesai', 'ditolak']).optional(),
  feedback: z.string().max(500).optional().nullable(),
  puskesmas_id: z.string().uuid().optional(),
});

export const reportFilterSchema = z.object({
  status: z.enum(['pending', 'diproses', 'selesai', 'ditolak']).optional(),
  kecamatan: z.string().optional(),
  puskesmas_id: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type ReportFilterInput = z.infer<typeof reportFilterSchema>;