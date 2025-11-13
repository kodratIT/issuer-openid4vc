import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, API_KEY } from '@/lib/config';
import { getToken } from '@/lib/token';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const supported_cred_id = searchParams.get('supported_cred_id');
    
    const query = new URLSearchParams();
    if (format) query.set('format', format);
    if (supported_cred_id) query.set('supported_cred_id', supported_cred_id);
    
    const token = await getToken();
    const url = `${API_BASE_URL}/oid4vci/credential-supported/records${
      query.toString() ? `?${query}` : ''
    }`;
    
    console.log('Fetching supported credentials from:', url);
    
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
    console.log('Fetched credentials:', data.results?.length || 0, 'items');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching supported credentials:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch supported credentials',
        message: error instanceof Error ? error.message : 'Unknown error',
        results: []
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = await getToken();
    
    console.log('Creating supported credential:', body.id || body.format);
    
    // Determine endpoint based on format
    const endpoint = body.format === 'jwt_vc_json'
      ? '/oid4vci/credential-supported/create/jwt'
      : body.format === 'vc+sd-jwt'
      ? '/oid4vci/credential-supported/create/sd-jwt'
      : '/oid4vci/credential-supported/create';
    
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('POST to:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.token}`,
        'X-API-KEY': API_KEY || '',
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Created credential:', data.supported_cred_id);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating supported credential:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create supported credential',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
