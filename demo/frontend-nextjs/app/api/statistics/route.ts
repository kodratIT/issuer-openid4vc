import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, API_KEY } from '@/lib/config';
import { getToken } from '@/lib/token';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken();
    const headers = {
      'accept': 'application/json',
      'Authorization': `Bearer ${token.token}`,
      'X-API-KEY': API_KEY || '',
    };
    
    console.log('Fetching statistics...');
    
    // Fetch all data in parallel
    const [exchangeRes, presentationRes] = await Promise.all([
      fetch(`${API_BASE_URL}/oid4vci/exchange/records`, { headers })
        .catch(() => ({ ok: false })),
      fetch(`${API_BASE_URL}/oid4vp/presentations`, { headers })
        .catch(() => ({ ok: false }))
    ]);
    
    // Parse responses
    const exchanges = exchangeRes.ok 
      ? await (exchangeRes as Response).json() 
      : { results: [] };
    const presentations = presentationRes.ok 
      ? await (presentationRes as Response).json() 
      : { results: [] };
    
    const exchangeRecords = exchanges.results || [];
    const presentationRecords = presentations.results || [];
    
    console.log('Exchange records:', exchangeRecords.length);
    console.log('Presentation records:', presentationRecords.length);
    
    // Calculate statistics
    const issuedStates = ['issued', 'completed', 'credential-issued'];
    const activeStates = ['offer-sent', 'created', 'offer_sent'];
    
    const issuedCredentials = exchangeRecords.filter((e: any) => 
      issuedStates.includes(e.state?.toLowerCase?.())
    ).length;
    
    const pendingCredentials = exchangeRecords.filter((e: any) => 
      !issuedStates.includes(e.state?.toLowerCase?.())
    ).length;
    
    const activeSessions = exchangeRecords.filter((e: any) => 
      activeStates.includes(e.state?.toLowerCase?.())
    ).length;
    
    const verifiedPresentations = presentationRecords.filter((p: any) => 
      p.verified === true || p.state === 'verified'
    ).length;
    
    const successRate = exchangeRecords.length > 0
      ? Math.round((issuedCredentials / exchangeRecords.length) * 100)
      : 100;
    
    const statistics = {
      totalCredentials: exchangeRecords.length,
      issuedCredentials,
      pendingCredentials,
      totalPresentations: presentationRecords.length,
      verifiedPresentations,
      activeSessions,
      successRate
    };
    
    console.log('Statistics calculated:', statistics);
    
    return NextResponse.json(statistics);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    
    // Return default statistics on error
    return NextResponse.json(
      { 
        totalCredentials: 0,
        issuedCredentials: 0,
        pendingCredentials: 0,
        totalPresentations: 0,
        verifiedPresentations: 0,
        activeSessions: 0,
        successRate: 100,
        error: 'Failed to fetch statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 200 }
    );
  }
}
