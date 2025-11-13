import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, API_KEY } from '@/lib/config';
import { getToken } from '@/lib/token';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getToken();
    const url = `${API_BASE_URL}/oid4vci/credential-supported/records/${id}`;
    
    console.log('Fetching credential:', id);
    
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
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Credential not found' },
          { status: 404 }
        );
      }
      
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Found credential:', data.id);
    console.log('Full credential data:', JSON.stringify(data, null, 2));
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching credential:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch credential',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const token = await getToken();
    
    console.log('Updating credential:', id);
    
    // Determine endpoint based on format
    const endpoint = body.format === 'jwt_vc_json'
      ? `/oid4vci/credential-supported/records/jwt/${id}`
      : `/oid4vci/credential-supported/records/sd-jwt/${id}`;
    
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('PUT to:', url);
    
    const response = await fetch(url, {
      method: 'PUT',
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
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Updated credential:', data.supported_cred_id || id);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating credential:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update credential',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getToken();
    
    console.log('Deleting credential:', id);
    
    // Try JWT endpoint first
    let url = `${API_BASE_URL}/oid4vci/credential-supported/records/jwt/${id}`;
    console.log('DELETE from:', url);
    
    let response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'X-API-KEY': API_KEY || '',
      }
    });
    
    // If JWT fails, try SD-JWT endpoint
    if (!response.ok) {
      console.log('JWT endpoint failed, trying SD-JWT...');
      url = `${API_BASE_URL}/oid4vci/credential-supported/records/sd-jwt/${id}`;
      
      response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token.token}`,
          'X-API-KEY': API_KEY || '',
        }
      });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    console.log('Deleted credential:', id);
    
    return NextResponse.json({ 
      success: true,
      message: 'Credential deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting credential:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete credential',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
