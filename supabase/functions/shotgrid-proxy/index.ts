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
      // ShotGrid search endpoints require one of these vendor content-types.
      // We are using the "Array Style" filter format in our payloads.
      'Content-Type': 'application/vnd+shotgun.api3_array+json',
      'Accept': 'application/json',
    };

    let responseData;

    switch (action) {
      case 'getProjects': {
        console.log('Fetching active projects from ShotGrid...');
        const projectsPayload = {
          filters: [["sg_status", "is", "Active"]],
          fields: ["name", "sg_status", "code"],
          page: { size: 100 },
        };

        const projectsResponse = await fetch(`${shotgridUrl}/api/v1/entity/projects/_search`, {
          method: 'POST',
          headers,
          body: JSON.stringify(projectsPayload),
        });
        
        if (!projectsResponse.ok) {
          const errorText = await projectsResponse.text();
          console.error('Failed to fetch projects:', errorText);
          throw new Error(`Failed to fetch projects: ${errorText}`);
        }
        
        responseData = await projectsResponse.json();
        console.log(`Fetched ${responseData.data?.length || 0} active projects`);
        break;
      }

      case 'getShots': {
        if (!projectId) {
          throw new Error('projectId is required for getShots');
        }
        
        console.log(`Fetching shots for project ${projectId}...`);
        const shotsPayload = {
          filters: [["project", "is", { "type": "Project", "id": projectId }]],
          fields: [
            "code", "sg_status_list", "sg_shot_type", "sg_cut_duration",
            "description", "sg_sequence", "updated_at", "created_at",
            "sg_priority", "sg_notes_count", "sg_final_date", "due_date",
            "sg_bidding_status"
          ],
          page: { size: 500 },
        };

        const shotsResponse = await fetch(`${shotgridUrl}/api/v1/entity/shots/_search`, {
          method: 'POST',
          headers,
          body: JSON.stringify(shotsPayload),
        });

        if (!shotsResponse.ok) {
          const errorText = await shotsResponse.text();
          console.error('Failed to fetch shots:', errorText);
          throw new Error(`Failed to fetch shots: ${errorText}`);
        }

        responseData = await shotsResponse.json();
        console.log(`Fetched ${responseData.data?.length || 0} shots`);
        
        // Log first shot to debug field names
        if (responseData.data?.[0]) {
          console.log('Sample shot attributes:', JSON.stringify(responseData.data[0].attributes));
        }
        break;
      }

      case 'getTasks': {
        if (!projectId) {
          throw new Error('projectId is required for getTasks');
        }

        console.log(`Fetching tasks for project ${projectId}...`);
        const tasksPayload = {
          filters: [["project", "is", { "type": "Project", "id": projectId }]],
          fields: [
            "content", "sg_status_list", "entity", "task_assignees",
            "step", "est_in_mins", "start_date", "due_date",
            "time_logs_sum", "updated_at"
          ],
          page: { size: 1000 },
        };

        const tasksResponse = await fetch(`${shotgridUrl}/api/v1/entity/tasks/_search`, {
          method: 'POST',
          headers,
          body: JSON.stringify(tasksPayload),
        });

        if (!tasksResponse.ok) {
          const errorText = await tasksResponse.text();
          console.error('Failed to fetch tasks:', errorText);
          throw new Error(`Failed to fetch tasks: ${errorText}`);
        }

        responseData = await tasksResponse.json();
        console.log(`Fetched ${responseData.data?.length || 0} tasks`);
        
        // Log sample task to debug field names
        if (responseData.data?.[0]) {
          console.log('Sample task attributes:', JSON.stringify(responseData.data[0].attributes));
        }
        
        // Log tasks with bid/logged time
        const tasksWithBid = responseData.data?.filter((t: any) => t.attributes.est_in_mins > 0) || [];
        const tasksWithTime = responseData.data?.filter((t: any) => t.attributes.time_logs_sum > 0) || [];
        console.log(`Tasks with est_in_mins: ${tasksWithBid.length}, Tasks with time_logs_sum: ${tasksWithTime.length}`);
        break;
      }

      case 'getArtists': {
        console.log('Fetching artists (HumanUsers) from ShotGrid...');
        const artistsPayload = {
          filters: [["sg_status_list", "is", "act"]],
          fields: ["name", "department", "image", "email"],
          page: { size: 200 },
        };

        const artistsResponse = await fetch(`${shotgridUrl}/api/v1/entity/human_users/_search`, {
          method: 'POST',
          headers,
          body: JSON.stringify(artistsPayload),
        });

        if (!artistsResponse.ok) {
          const errorText = await artistsResponse.text();
          console.error('Failed to fetch artists:', errorText);
          throw new Error(`Failed to fetch artists: ${errorText}`);
        }

        responseData = await artistsResponse.json();
        console.log(`Fetched ${responseData.data?.length || 0} artists`);
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
