import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, API_KEY } from '@/lib/config';
import { getToken } from '@/lib/token';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchange_id = searchParams.get('exchange_id');
    const state = searchParams.get('state');
    const supported_cred_id = searchParams.get('supported_cred_id');
    
    const query = new URLSearchParams();
    if (exchange_id) query.set('exchange_id', exchange_id);
    if (state) query.set('state', state);
    if (supported_cred_id) query.set('supported_cred_id', supported_cred_id);
    
    const token = await getToken();
    const url = `${API_BASE_URL}/oid4vci/exchange/records${
      query.toString() ? `?${query}` : ''
    }`;
    
    console.log('Fetching exchange records from:', url);
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token.token}`,
        'X-API-KEY': API_KEY || '',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Fetched exchange records:', data.results?.length || 0, 'items');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching exchange records:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch exchange records',
        message: error instanceof Error ? error.message : 'Unknown error',
        results: []
      },
      { status: 500 }
    );
  }
}
