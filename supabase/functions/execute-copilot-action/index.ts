import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.user.id;

    const { saleId, action } = await req.json();
    if (!saleId || !action?.type) {
      return new Response(JSON.stringify({ error: 'Missing saleId or action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let result: any = { success: true };

    switch (action.type) {
      case 'postpone_task': {
        if (!action.milestone_id || !action.new_date) {
          return new Response(JSON.stringify({ error: 'Missing milestone_id or new_date' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { error } = await supabase
          .from('sale_milestones')
          .update({ target_date: action.new_date, updated_at: new Date().toISOString() })
          .eq('id', action.milestone_id)
          .eq('sale_id', saleId);
        if (error) throw error;
        result.message = `Deadline aangepast naar ${action.new_date}`;
        break;
      }

      case 'set_reminder': {
        if (!action.reminder_date) {
          return new Response(JSON.stringify({ error: 'Missing reminder_date' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { error } = await supabase
          .from('aftersales_reminders')
          .insert({
            sale_id: saleId,
            milestone_id: action.milestone_id || null,
            reminder_date: action.reminder_date,
            note: action.note || '',
            created_by: userId,
          });
        if (error) throw error;
        result.message = `Herinnering ingesteld voor ${action.reminder_date}`;
        break;
      }

      case 'update_priority': {
        if (!action.milestone_id || !action.priority) {
          return new Response(JSON.stringify({ error: 'Missing milestone_id or priority' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { error } = await supabase
          .from('sale_milestones')
          .update({ priority: action.priority, updated_at: new Date().toISOString() })
          .eq('id', action.milestone_id)
          .eq('sale_id', saleId);
        if (error) throw error;
        result.message = `Prioriteit gewijzigd naar ${action.priority}`;
        break;
      }

      case 'mark_waiting': {
        if (!action.waiting_for) {
          return new Response(JSON.stringify({ error: 'Missing waiting_for' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const waitingUpdate = {
          waiting_since: new Date().toISOString(),
          waiting_for: action.waiting_for,
          updated_at: new Date().toISOString(),
        };

        if (action.choice_id) {
          const { error } = await supabase
            .from('sale_choices')
            .update(waitingUpdate)
            .eq('id', action.choice_id)
            .eq('sale_id', saleId);
          if (error) throw error;
        } else if (action.payment_id) {
          const { error } = await supabase
            .from('sale_payments')
            .update(waitingUpdate)
            .eq('id', action.payment_id)
            .eq('sale_id', saleId);
          if (error) throw error;
        } else if (action.milestone_id) {
          const { error } = await supabase
            .from('sale_milestones')
            .update(waitingUpdate)
            .eq('id', action.milestone_id)
            .eq('sale_id', saleId);
          if (error) throw error;
        } else {
          return new Response(JSON.stringify({ error: 'Missing milestone_id, choice_id, or payment_id for mark_waiting' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        result.message = `Wachtstatus ingesteld: ${action.waiting_for}`;
        break;
      }

      case 'complete_task': {
        if (!action.milestone_id) {
          return new Response(JSON.stringify({ error: 'Missing milestone_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { error } = await supabase
          .from('sale_milestones')
          .update({ completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', action.milestone_id)
          .eq('sale_id', saleId);
        if (error) throw error;
        result.message = `Taak als voltooid gemarkeerd`;
        break;
      }

      case 'add_followup_task': {
        if (!action.title || !action.phase) {
          return new Response(JSON.stringify({ error: 'Missing title or phase for follow-up task' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Duplicate check: look for existing milestone with similar title in same sale+phase
        const { data: existingMilestones } = await supabase
          .from('sale_milestones')
          .select('id, title, template_key')
          .eq('sale_id', saleId)
          .eq('phase', action.phase);

        const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9àáâãäåèéêëìíîïòóôõöùúûüñç]/g, ' ').replace(/\s+/g, ' ').trim();
        const newNorm = normalise(action.title);

        const duplicate = (existingMilestones || []).find((m: any) => {
          if (action.template_key && m.template_key === action.template_key) return true;
          const existNorm = normalise(m.title);
          return existNorm === newNorm || existNorm.includes(newNorm) || newNorm.includes(existNorm);
        });

        if (duplicate) {
          return new Response(JSON.stringify({
            error: `Er bestaat al een taak "${duplicate.title}" in deze fase. Gebruik postpone_task, update_priority of mark_waiting om de bestaande taak aan te passen.`,
            duplicate_milestone_id: duplicate.id,
          }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Get max order_index for this phase
        const { data: maxOrder } = await supabase
          .from('sale_milestones')
          .select('order_index')
          .eq('sale_id', saleId)
          .eq('phase', action.phase)
          .order('order_index', { ascending: false })
          .limit(1)
          .single();
        
        const nextOrder = (maxOrder?.order_index || 0) + 1;
        
        const { error } = await supabase
          .from('sale_milestones')
          .insert({
            sale_id: saleId,
            title: action.title,
            phase: action.phase,
            order_index: nextOrder,
            target_date: action.target_date || null,
            customer_visible: false,
            partner_visible: false,
            priority: action.priority || 'medium',
          });
        if (error) throw error;
        result.message = `Follow-up taak "${action.title}" aangemaakt in fase ${action.phase}`;
        break;
      }

      case 'schedule_notary': {
        if (!action.notary_date) {
          return new Response(JSON.stringify({ error: 'Missing notary_date' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Find the notary milestone (aank_notaris or over_notaris_akte)
        const { data: notaryMilestones } = await supabase
          .from('sale_milestones')
          .select('id, title, template_key, description')
          .eq('sale_id', saleId)
          .in('template_key', ['aank_notaris', 'over_notaris_akte', 'overd_notariele_akte']);

        const notaryMilestone = (notaryMilestones || [])[0];
        if (!notaryMilestone) {
          return new Response(JSON.stringify({ error: 'Geen notaris-milestone gevonden voor deze verkoop' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Build updated description
        const descParts: string[] = [];
        if (action.notary_office) descParts.push(`Notaris: ${action.notary_office}`);
        if (action.notary_notes) descParts.push(action.notary_notes);
        const newDescription = descParts.length > 0
          ? descParts.join('. ')
          : notaryMilestone.description;

        const { error } = await supabase
          .from('sale_milestones')
          .update({
            target_date: action.notary_date,
            description: newDescription,
            updated_at: new Date().toISOString(),
          })
          .eq('id', notaryMilestone.id);
        if (error) throw error;

        // Sync notary_date to sales table so Planning card shows it
        const { error: salesError } = await supabase
          .from('sales')
          .update({ notary_date: action.notary_date, updated_at: new Date().toISOString() })
          .eq('id', saleId);
        if (salesError) console.error('Failed to sync notary_date to sales:', salesError);

        result.message = `Notarisafspraak ingepland op ${action.notary_date}${action.notary_office ? ` bij ${action.notary_office}` : ''}`;
        break;
      }

      case 'update_payment': {
        if (!action.payment_id) {
          return new Response(JSON.stringify({ error: 'Missing payment_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const updates: any = { updated_at: new Date().toISOString() };
        if (action.amount !== undefined) updates.amount = action.amount;
        if (action.due_date !== undefined) updates.due_date = action.due_date;
        if (action.title !== undefined) updates.title = action.title;
        if (action.status !== undefined) updates.status = action.status;
        if (action.due_condition !== undefined) updates.due_condition = action.due_condition;

        const { error } = await supabase
          .from('sale_payments')
          .update(updates)
          .eq('id', action.payment_id)
          .eq('sale_id', saleId);
        if (error) throw error;
        result.message = `Betaling bijgewerkt`;
        break;
      }

      case 'add_payment': {
        if (!action.title || action.amount === undefined) {
          return new Response(JSON.stringify({ error: 'Missing title or amount for payment' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        // Get max order_index
        const { data: maxPaymentOrder } = await supabase
          .from('sale_payments')
          .select('order_index')
          .eq('sale_id', saleId)
          .order('order_index', { ascending: false })
          .limit(1)
          .single();

        const nextPaymentOrder = (maxPaymentOrder?.order_index || 0) + 1;

        const { error } = await supabase
          .from('sale_payments')
          .insert({
            sale_id: saleId,
            title: action.title,
            amount: action.amount,
            due_date: action.due_date || null,
            due_condition: action.due_condition || null,
            percentage: action.percentage || null,
            order_index: nextPaymentOrder,
          });
        if (error) throw error;
        result.message = `Betalingstermijn "${action.title}" (€${action.amount}) toegevoegd`;
        break;
      }

      case 'delete_payment': {
        if (!action.payment_id) {
          return new Response(JSON.stringify({ error: 'Missing payment_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { error } = await supabase
          .from('sale_payments')
          .delete()
          .eq('id', action.payment_id)
          .eq('sale_id', saleId);
        if (error) throw error;
        result.message = `Betalingstermijn verwijderd`;
        break;
      }

      case 'update_choice_status': {
        if (!action.choice_id || !action.new_status) {
          return new Response(JSON.stringify({ error: 'Missing choice_id or new_status' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const updates: any = { status: action.new_status, updated_at: new Date().toISOString() };
        if (action.new_status === 'completed' || action.new_status === 'not_wanted' || action.new_status === 'rejected') {
          updates.completed_at = new Date().toISOString();
        }
        const { error } = await supabase
          .from('sale_choices')
          .update(updates)
          .eq('id', action.choice_id)
          .eq('sale_id', saleId);
        if (error) throw error;
        result.message = `Keuze-status gewijzigd naar ${action.new_status}`;
        break;
      }

      case 'add_choice_note': {
        if (!action.choice_id || !action.note) {
          return new Response(JSON.stringify({ error: 'Missing choice_id or note' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        // Append note to existing notes
        const { data: existing } = await supabase
          .from('sale_choices')
          .select('notes')
          .eq('id', action.choice_id)
          .eq('sale_id', saleId)
          .single();
        const timestamp = new Date().toLocaleDateString('nl-NL');
        const newNote = existing?.notes 
          ? `${existing.notes}\n[${timestamp}] ${action.note}`
          : `[${timestamp}] ${action.note}`;
        const { error } = await supabase
          .from('sale_choices')
          .update({ notes: newNote, updated_at: new Date().toISOString() })
          .eq('id', action.choice_id)
          .eq('sale_id', saleId);
        if (error) throw error;
        result.message = `Notitie toegevoegd aan keuze`;
        break;
      }

      case 'request_developer_quote': {
        if (!action.choice_id) {
          return new Response(JSON.stringify({ error: 'Missing choice_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { error } = await supabase
          .from('sale_choices')
          .update({ 
            status: 'sent_to_developer', 
            quote_requested_at: new Date().toISOString(),
            updated_at: new Date().toISOString() 
          })
          .eq('id', action.choice_id)
          .eq('sale_id', saleId);
        if (error) throw error;
        result.message = `Offerte aangevraagd bij ontwikkelaar`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action type: ${action.type}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error("execute-copilot-action error:", e);
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
