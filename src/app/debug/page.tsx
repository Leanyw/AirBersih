'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DebugPage() {
  const [status, setStatus] = useState<any>({});

  useEffect(() => {
    testSupabaseConnection();
  }, []);

  const testSupabaseConnection = async () => {
    const tests = {
      connection: null as any,
      tables: null as any,
      diseases: null as any,
      tutorials: null as any,
    };

    try {
      // Test 1: Basic connection
      const { data: connData, error: connError } = await supabase
        .from('diseases')
        .select('count', { count: 'exact', head: true });
      
      tests.connection = {
        success: !connError,
        error: connError?.message,
        data: connData
      };

      // Test 2: Check tables
      const { data: tableData, error: tableError } = await supabase
        .from('diseases')
        .select('*')
        .limit(1);
      
      tests.tables = {
        diseases_exists: !tableError,
        row_count: tableData?.length || 0
      };

      // Test 3: Query diseases
      const { data: diseasesData, error: diseasesError } = await supabase
        .from('diseases')
        .select('*');
      
      tests.diseases = {
        success: !diseasesError,
        error: diseasesError?.message,
        count: diseasesData?.length || 0,
        sample: diseasesData?.[0]
      };

      // Test 4: Query tutorials
      const { data: tutorialsData, error: tutorialsError } = await supabase
        .from('tutorials')
        .select('*');
      
      tests.tutorials = {
        success: !tutorialsError,
        error: tutorialsError?.message,
        count: tutorialsData?.length || 0
      };

    } catch (error: any) {
      tests.connection = { error: error.message };
    }

    setStatus(tests);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-6">Supabase Debug Page</h1>
      
      <div className="grid gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Connection Status</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm">
            {JSON.stringify(status.connection, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Tables Status</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm">
            {JSON.stringify(status.tables, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Diseases Query</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm">
            {JSON.stringify(status.diseases, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Tutorials Query</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm">
            {JSON.stringify(status.tutorials, null, 2)}
          </pre>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={testSupabaseConnection}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Test Connection Again
        </button>
      </div>
    </div>
  );
}