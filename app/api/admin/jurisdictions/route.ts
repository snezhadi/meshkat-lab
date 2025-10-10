import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/admin/jurisdictions - Load jurisdictions from Supabase
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data: jurisdictions, error } = await supabase
      .from('jurisdictions')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading jurisdictions:', error);
      return NextResponse.json({ error: 'Failed to load jurisdictions' }, { status: 500 });
    }

    return NextResponse.json(jurisdictions || []);
  } catch (error) {
    console.error('Error loading jurisdictions:', error);
    return NextResponse.json({ error: 'Failed to load jurisdictions' }, { status: 500 });
  }
}
