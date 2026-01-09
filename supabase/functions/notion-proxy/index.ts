import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

interface NotionPage {
  id: string;
  properties: Record<string, any>;
}

interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

async function notionRequest(
  endpoint: string,
  method: string = 'GET',
  body?: Record<string, any>,
  notionToken?: string
): Promise<any> {
  const token = notionToken || Deno.env.get('NOTION_API_KEY');
  
  if (!token) {
    throw new Error('NOTION_API_KEY not configured');
  }

  const response = await fetch(`${NOTION_API_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Notion API error:', error);
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function queryDatabase(databaseId: string, filter?: Record<string, any>, notionToken?: string): Promise<NotionPage[]> {
  const allResults: NotionPage[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const body: Record<string, any> = {};
    if (filter) body.filter = filter;
    if (startCursor) body.start_cursor = startCursor;

    const response: NotionQueryResponse = await notionRequest(
      `/databases/${databaseId}/query`,
      'POST',
      body,
      notionToken
    );

    allResults.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor || undefined;
  }

  return allResults;
}

// Extract text from Notion rich text
function getRichText(prop: any): string {
  if (!prop?.rich_text?.length) return '';
  return prop.rich_text.map((t: any) => t.plain_text).join('');
}

// Extract title from Notion title property
function getTitle(prop: any): string {
  if (!prop?.title?.length) return '';
  return prop.title.map((t: any) => t.plain_text).join('');
}

// Extract date from Notion date property
function getDate(prop: any): string | null {
  if (!prop?.date?.start) return null;
  return prop.date.start;
}

// Extract number from Notion number property
function getNumber(prop: any): number {
  return prop?.number ?? 0;
}

// Extract select value
function getSelect(prop: any): string | null {
  return prop?.select?.name ?? null;
}

// Extract relation IDs
function getRelationIds(prop: any): string[] {
  if (!prop?.relation) return [];
  return prop.relation.map((r: any) => r.id);
}

// Extract rollup value
function getRollup(prop: any): any {
  if (!prop?.rollup) return null;
  
  switch (prop.rollup.type) {
    case 'number':
      return prop.rollup.number;
    case 'array':
      return prop.rollup.array;
    default:
      return prop.rollup[prop.rollup.type];
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, databaseId, filter, notionToken } = await req.json();

    console.log(`Notion proxy action: ${action}`);

    switch (action) {
      case 'getProjects': {
        // Query Projects Leadership database
        const projectsDbId = Deno.env.get('NOTION_PROJECTS_DB_ID');
        if (!projectsDbId) {
          throw new Error('NOTION_PROJECTS_DB_ID not configured');
        }

        const statusFilter = filter?.statuses?.length > 0 ? {
          or: filter.statuses.map((status: string) => ({
            property: 'Status',
            status: { equals: status }
          }))
        } : undefined;

        const pages = await queryDatabase(projectsDbId, statusFilter, notionToken);
        
        const projects = pages.map((page) => {
          const props = page.properties;
          return {
            id: page.id,
            name: getTitle(props['Project Name']),
            status: props['Status']?.status?.name || 'Unknown',
            startDate: props['Date']?.date?.start || null,
            endDate: props['Date']?.date?.end || null,
            studio: getSelect(props['Studio']),
            episodeCount: getNumber(props['Episode Count']),
          };
        });

        return new Response(JSON.stringify({ projects }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getBudgets': {
        // Query All Bids database for man-days
        const bidsDbId = Deno.env.get('NOTION_BIDS_DB_ID');
        if (!bidsDbId) {
          throw new Error('NOTION_BIDS_DB_ID not configured');
        }

        // Filter for Awarded, Estimate, or active budgets
        const budgetFilter = {
          or: [
            { property: 'Bid Status', select: { equals: 'Awarded' } },
            { property: 'Bid Status', select: { equals: 'Estimate' } },
            { property: 'Bid Status', select: { equals: 'Bid Sent' } },
          ]
        };

        const pages = await queryDatabase(bidsDbId, budgetFilter, notionToken);
        
        const budgets = pages.map((page) => {
          const props = page.properties;
          return {
            id: page.id,
            name: getTitle(props['Bid Name']),
            status: getSelect(props['Bid Status']),
            projectId: getRelationIds(props['Parent'])?.[0] || null,
            episodeCode: getRichText(props['Episodes']) || getTitle(props['Episodes']),
            animationDays: getNumber(props['ANM Days']),
            cgDays: getNumber(props['CG Days']),
            compositingDays: getNumber(props['COMP Days']),
            fxDays: getNumber(props['FX Days']),
            startDate: getDate(props['Ep Start Date']),
            endDate: getDate(props['Ep End Date']),
          };
        });

        return new Response(JSON.stringify({ budgets }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getBookings': {
        // Query Bookings database
        const bookingsDbId = Deno.env.get('NOTION_BOOKINGS_DB_ID');
        if (!bookingsDbId) {
          throw new Error('NOTION_BOOKINGS_DB_ID not configured');
        }

        // Filter out expired bookings
        const bookingFilter = {
          and: [
            {
              property: 'End Date',
              date: { on_or_after: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
            }
          ]
        };

        const pages = await queryDatabase(bookingsDbId, bookingFilter, notionToken);
        
        const bookings = pages.map((page) => {
          const props = page.properties;
          
          // Get department from rollup
          const deptRollup = getRollup(props['Department']);
          let department = 'Unknown';
          if (Array.isArray(deptRollup) && deptRollup.length > 0) {
            department = deptRollup[0]?.select?.name || 'Unknown';
          }
          
          // Get region from rollup
          const regionRollup = getRollup(props['Region']);
          let region = 'California';
          if (Array.isArray(regionRollup) && regionRollup.length > 0) {
            region = regionRollup[0]?.select?.name || 'California';
          }

          return {
            id: page.id,
            name: getTitle(props['Name']),
            crewMemberId: getRelationIds(props['Crew Member'])?.[0] || null,
            projectId: getRelationIds(props['Projects Leadership'])?.[0] || null,
            department: mapDepartment(department),
            region: mapRegion(region),
            startDate: getDate(props['Start Date']),
            endDate: getDate(props['End Date']),
            allocationPercent: getNumber(props['Allocation %']) || 1,
          };
        }).filter(b => b.startDate && b.endDate);

        return new Response(JSON.stringify({ bookings }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getCrewMembers': {
        // Query Crew List database
        const crewDbId = Deno.env.get('NOTION_CREW_DB_ID');
        if (!crewDbId) {
          throw new Error('NOTION_CREW_DB_ID not configured');
        }

        const pages = await queryDatabase(crewDbId, undefined, notionToken);
        
        const crew = pages.map((page) => {
          const props = page.properties;
          return {
            id: page.id,
            name: getTitle(props['Name']),
            department: mapDepartment(getSelect(props['Department']) || 'Unknown'),
            region: mapRegion(getSelect(props['Region']) || 'California'),
          };
        });

        return new Response(JSON.stringify({ crew }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Notion proxy error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Map Notion department values to our Department type
function mapDepartment(dept: string): 'Animation' | 'CG' | 'Compositing' | 'FX' {
  const normalized = dept.toLowerCase();
  if (normalized.includes('anim')) return 'Animation';
  if (normalized.includes('cg') || normalized.includes('3d')) return 'CG';
  if (normalized.includes('comp')) return 'Compositing';
  if (normalized.includes('fx') || normalized.includes('effect')) return 'FX';
  return 'Compositing'; // Default
}

// Map Notion region values to our Region type
function mapRegion(region: string): 'California' | 'Oregon' | 'Vancouver' {
  const normalized = region.toLowerCase();
  if (normalized.includes('oregon') || normalized.includes('or')) return 'Oregon';
  if (normalized.includes('vancouver') || normalized.includes('bc') || normalized.includes('canada')) return 'Vancouver';
  return 'California'; // Default
}
