import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShotGridAuthResponse {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

// Helper function to fetch all pages of data
async function fetchAllPages(
  url: string,
  headers: Record<string, string>,
  basePayload: Record<string, any>,
  entityName: string,
  pageSize: number = 500
): Promise<any[]> {
  const allData: any[] = [];
  let pageNumber = 1;
  let hasMore = true;

  while (hasMore) {
    const payload = {
      ...basePayload,
      page: { size: pageSize, number: pageNumber },
    };

    console.log(`Fetching ${entityName} page ${pageNumber}...`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch ${entityName}: ${errorText}`);
    }

    const data = await response.json();
    const pageData = data.data || [];
    allData.push(...pageData);

    console.log(`Page ${pageNumber}: fetched ${pageData.length} ${entityName}`);

    // Check if there are more pages
    // ShotGrid returns fewer items than requested when we've reached the end
    if (pageData.length < pageSize) {
      hasMore = false;
    } else {
      pageNumber++;
      // Safety limit to prevent infinite loops
      if (pageNumber > 50) {
        console.warn(`Stopping pagination at page 50 for ${entityName}`);
        hasMore = false;
      }
    }
  }

  console.log(`Total ${entityName} fetched: ${allData.length}`);
  return allData;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const shotgridUrl = Deno.env.get('SHOTGRID_URL');
    const scriptName = Deno.env.get('SHOTGRID_SCRIPT_NAME');
    const apiKey = Deno.env.get('SHOTGRID_API_KEY');

    if (!shotgridUrl || !scriptName || !apiKey) {
      console.error('Missing ShotGrid credentials');
      return new Response(
        JSON.stringify({ error: 'ShotGrid credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, projectId, filters } = await req.json();
    console.log(`ShotGrid proxy called: action=${action}, projectId=${projectId}`);

    // Authenticate with ShotGrid
    console.log('Authenticating with ShotGrid...');
    const authResponse = await fetch(`${shotgridUrl}/api/v1/auth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: scriptName,
        client_secret: apiKey,
        grant_type: 'client_credentials',
      }),
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('ShotGrid auth failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'ShotGrid authentication failed', details: errorText }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authData: ShotGridAuthResponse = await authResponse.json();
    const accessToken = authData.access_token;
    console.log('ShotGrid authentication successful');

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd+shotgun.api3_array+json',
      'Accept': 'application/json',
    };

    let responseData: any = {};
    
    // Include base URL in response for building links
    const baseUrl = shotgridUrl;

    switch (action) {
      case 'getProjects': {
        console.log('Fetching active projects from ShotGrid...');
        const projectsPayload = {
          filters: [["sg_status", "is", "Active"]],
          fields: ["name", "sg_status", "code", "sg_folder_prefix"],
        };

        const allProjects = await fetchAllPages(
          `${shotgridUrl}/api/v1/entity/projects/_search`,
          headers,
          projectsPayload,
          'projects',
          100
        );
        
        // Log sample project to debug
        if (allProjects[0]) {
          console.log('Sample project attributes:', JSON.stringify(allProjects[0].attributes));
        }
        
        responseData = { data: allProjects, baseUrl };
        break;
      }

      case 'getShots': {
        if (!projectId) {
          throw new Error('projectId is required for getShots');
        }
        
        console.log(`Fetching all shots for project ${projectId}...`);
        const shotsPayload = {
          filters: [["project", "is", { "type": "Project", "id": projectId }]],
          fields: [
            "code", "sg_status_list", "sg_shot_type", "sg_cut_duration",
            "description", "sg_sequence", "updated_at", "created_at",
            "sg_priority", "sg_notes_count", "sg_final_date", "due_date",
            "sg_bidding_status"
          ],
        };

        const allShots = await fetchAllPages(
          `${shotgridUrl}/api/v1/entity/shots/_search`,
          headers,
          shotsPayload,
          'shots',
          500
        );
        
        // Log first shot to debug field names
        if (allShots[0]) {
          console.log('Sample shot attributes:', JSON.stringify(allShots[0].attributes));
        }
        
        responseData = { data: allShots };
        break;
      }

      case 'getTasks': {
        if (!projectId) {
          throw new Error('projectId is required for getTasks');
        }

        console.log(`Fetching all tasks for project ${projectId}...`);
        const tasksPayload = {
          filters: [["project", "is", { "type": "Project", "id": projectId }]],
          fields: [
            "content", "sg_status_list", "entity", "task_assignees",
            "step", "est_in_mins", "start_date", "due_date",
            "time_logs_sum", "updated_at"
          ],
        };

        const allTasks = await fetchAllPages(
          `${shotgridUrl}/api/v1/entity/tasks/_search`,
          headers,
          tasksPayload,
          'tasks',
          500
        );
        
        // Log sample task to debug field names
        if (allTasks[0]) {
          console.log('Sample task full data:', JSON.stringify(allTasks[0]));
        }
        
        // Log tasks with bid/logged time
        const tasksWithBid = allTasks.filter((t: any) => t.attributes.est_in_mins > 0);
        const tasksWithTime = allTasks.filter((t: any) => t.attributes.time_logs_sum > 0);
        const tasksWithEntity = allTasks.filter((t: any) => t.relationships?.entity?.data);
        console.log(`Tasks with est_in_mins: ${tasksWithBid.length}, Tasks with time_logs_sum: ${tasksWithTime.length}, Tasks with entity: ${tasksWithEntity.length}`);
        
        responseData = { data: allTasks };
        break;
      }

      case 'getArtists': {
        console.log('Fetching artists (HumanUsers) from ShotGrid - Artists and Managers only...');
        const artistsPayload = {
          filters: [
            ["permission_rule_set.PermissionRuleSet.code", "in", ["Artist", "Manager"]]
          ],
          fields: ["name", "department", "image", "email", "permission_rule_set", "sg_status_list"],
        };

        const allArtists = await fetchAllPages(
          `${shotgridUrl}/api/v1/entity/human_users/_search`,
          headers,
          artistsPayload,
          'artists',
          200
        );
        
        // Log sample artist to verify filtering
        if (allArtists[0]) {
          console.log('Sample artist:', JSON.stringify(allArtists[0]));
        }
        console.log(`Filtered to ${allArtists.length} artists/managers (includes inactive users)`);
        
        responseData = { data: allArtists };
        break;
      }

      case 'getProjectById': {
        if (!projectId) {
          throw new Error('projectId is required for getProjectById');
        }
        
        console.log(`Fetching single project ${projectId} from ShotGrid...`);
        const projectPayload = {
          filters: [["id", "is", projectId]],
          fields: ["name", "sg_status", "code", "sg_folder_prefix"],
        };

        const response = await fetch(`${shotgridUrl}/api/v1/entity/projects/_search`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...projectPayload, page: { size: 1, number: 1 } }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch project: ${errorText}`);
        }

        const data = await response.json();
        const project = data.data?.[0] || null;
        
        console.log('Fetched project:', project ? project.attributes.name : 'not found');
        responseData = { data: project, baseUrl };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in shotgrid-proxy:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
