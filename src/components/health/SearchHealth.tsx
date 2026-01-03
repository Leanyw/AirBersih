'use client';

import { useState, useEffect } from 'react';
import { Search, AlertTriangle, BookOpen, Stethoscope } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type SearchResult = {
  id: string;
  type: 'disease' | 'tutorial';
  title: string;
  description: string;
  category: string;
  severity?: string;
};

export default function SearchHealth() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async () => {
    setIsSearching(true);
    
    try {
      // Search diseases
      const { data: diseases } = await supabase
        .from('diseases')
        .select('id, nama, gejala, kategori, tingkat_keparahan')
        .or(`nama.ilike.%${query}%,gejala.ilike.%${query}%,penyebab.ilike.%${query}%`)
        .limit(5);

      // Search tutorials
      const { data: tutorials } = await supabase
        .from('tutorials')
        .select('id, judul, konten, kategori')
        .or(`judul.ilike.%${query}%,konten.ilike.%${query}%`)
        .limit(5);

      const searchResults: SearchResult[] = [
        ...(diseases?.map(d => ({
          id: d.id,
          type: 'disease' as const,
          title: d.nama,
          description: d.gejala.substring(0, 100) + '...',
          category: d.kategori,
          severity: d.tingkat_keparahan
        })) || []),
        ...(tutorials?.map(t => ({
          id: t.id,
          type: 'tutorial' as const,
          title: t.judul,
          description: t.konten.substring(0, 100) + '...',
          category: t.kategori
        })) || [])
      ];

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'disease': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'tutorial': return <BookOpen className="w-4 h-4 text-blue-500" />;
      default: return <Stethoscope className="w-4 h-4 text-gray-500" />;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'disease': return 'bg-red-50 border-red-100';
      case 'tutorial': return 'bg-blue-50 border-blue-100';
      default: return 'bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari penyakit atau panduan kesehatan..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Search Results */}
      {query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
          {isSearching ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              Mencari...
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={`/kesehatan/${result.type}/${result.id}`}
                  className={`block p-3 rounded-lg mb-1 hover:opacity-90 transition-opacity ${getResultColor(result.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getResultIcon(result.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-800">{result.title}</h4>
                        {result.severity && (
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            result.severity === 'berat' ? 'bg-red-100 text-red-800' :
                            result.severity === 'sedang' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {result.severity}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{result.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500 capitalize">{result.category}</span>
                        <span className="text-xs text-blue-600">Lihat detail →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              Tidak ditemukan hasil untuk "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}